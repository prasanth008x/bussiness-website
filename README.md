# Bloom Store – setup
1. `npx create-next-app@latest bloom --ts --tailwind --app`, then copy `app/ components/ lib/ store/ supabase/` over it and merge package.json deps (`npm i @supabase/ssr @supabase/supabase-js zustand zod`).
2. Create a Supabase project → SQL Editor → run `supabase/schema.sql`.
3. Auth → Providers: enable Email (OTP), Phone (OTP, needs an SMS provider like Twilio/MSG91) and Google (add OAuth client ID/secret).
4. Insert categories and a "Custom T-Shirt" product (is_customizable = true, print_fee = 150); put its id in `.env.local`.
5. Make yourself admin: `update profiles set role='admin' where id='<your-auth-user-id>';`
6. Copy `.env.example` → `.env.local`, fill keys (Razorpay test keys first).
7. `npm run dev`. Deploy on Vercel; add env vars there.

## Security notes
- Orders/transactions are written only by server routes using the service-role key; prices are re-read from the DB.
- Customer designs live in a private bucket; admins download via signed URLs (`storage.from('custom-prints').createSignedUrl(path, 300)`).
- Add a Razorpay webhook (`payment.captured`) as a backup to the client verify call.

## Still to build (next steps)
Auth pages, /shop filters, /product/[slug], /orders (customer portal + invoice PDF), /admin (product CRUD, orders table, status/tracking update, print download, analytics).
