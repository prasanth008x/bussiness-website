-- Run in Supabase SQL editor
create extension if not exists pgcrypto;
create type order_status as enum ('pending','confirmed','printing','shipped','delivered','cancelled');
create type pay_method as enum ('cod','razorpay');
create type pay_status as enum ('pending','paid','failed','refunded');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text, phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz default now());

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  name text not null, phone text not null, line1 text not null, line2 text,
  city text not null, state text not null, pincode text not null, is_default bool default false);

create table categories (
  id serial primary key, slug text unique not null, name text not null,
  parent_id int references categories);  -- e.g. tshirts > women | kids

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id int references categories, slug text unique not null,
  name text not null, description text,
  price numeric(10,2) not null check (price >= 0), compare_at numeric(10,2),
  images text[] default '{}', sizes text[] default '{}', colors text[] default '{}',
  stock int not null default 0, is_customizable bool default false,
  print_fee numeric(10,2) default 0, active bool default true,
  created_at timestamptz default now());

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity,
  user_id uuid references profiles, address jsonb not null,
  subtotal numeric(10,2) not null, shipping_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_method pay_method not null, payment_status pay_status not null default 'pending',
  status order_status not null default 'pending',
  courier text, tracking_code text, created_at timestamptz default now());

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  product_id uuid references products, name text not null,
  unit_price numeric(10,2) not null, qty int not null check (qty > 0),
  size text, color text);

create table custom_prints (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items on delete cascade,
  user_id uuid references profiles, file_path text not null,  -- in 'custom-prints' bucket
  placement text not null check (placement in ('front','back','left_chest','sleeve')),
  scale numeric default 1, offset_x numeric default 0, offset_y numeric default 0,
  created_at timestamptz default now());

create table transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders, provider text not null,
  provider_order_id text, provider_payment_id text,
  amount numeric(10,2) not null, status text not null, raw jsonb,
  created_at timestamptz default now());

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  user_id uuid not null references profiles, rating int check (rating between 1 and 5),
  body text, created_at timestamptz default now(), unique (product_id, user_id));

-- Auto-create profile on signup
create function handle_new_user() returns trigger language plpgsql security definer as $$
begin insert into profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end $$;
create trigger on_auth_user after insert on auth.users for each row execute function handle_new_user();

create function is_admin() returns bool language sql stable security definer as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- RLS (orders/items/transactions are written ONLY by server with service-role key)
alter table profiles enable row level security;  alter table addresses enable row level security;
alter table products enable row level security;  alter table categories enable row level security;
alter table orders enable row level security;    alter table order_items enable row level security;
alter table custom_prints enable row level security; alter table transactions enable row level security;
alter table reviews enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (role = 'customer' or is_admin());
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public catalog" on products for select using (active or is_admin());
create policy "admin products" on products for all using (is_admin());
create policy "public categories" on categories for select using (true);
create policy "own orders" on orders for select using (user_id = auth.uid() or is_admin());
create policy "admin update orders" on orders for update using (is_admin());
create policy "own items" on order_items for select using (exists(select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "own prints" on custom_prints for select using (user_id = auth.uid() or is_admin());
create policy "admin tx" on transactions for select using (is_admin());
create policy "read reviews" on reviews for select using (true);
create policy "write own review" on reviews for insert with check (user_id = auth.uid());

-- Storage: public product images, private customer designs
insert into storage.buckets(id, name, public) values ('products','products',true), ('custom-prints','custom-prints',false);
create policy "upload own design" on storage.objects for insert to authenticated
  with check (bucket_id = 'custom-prints' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own/admin design" on storage.objects for select to authenticated
  using (bucket_id = 'custom-prints' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "admin manage product imgs" on storage.objects for all to authenticated
  using (bucket_id = 'products' and is_admin());
