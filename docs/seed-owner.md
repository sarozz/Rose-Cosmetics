# Seeding the first OWNER account

The app only allows sign-in for staff rows that already exist in the `users`
table. Bootstrap the owner in two steps. Repeat the process for each staff
member instead of letting them self-register.

## 1. Create the auth user in Supabase

1. Supabase dashboard → **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Enter the owner's email and a temporary password. Check **Auto Confirm
   User** so they can sign in without an email round-trip.
3. Click **Create user**.

## 2. Insert the matching staff row

Supabase dashboard → **SQL Editor** → **New query** → paste the snippet below,
replace the placeholder values, and run it once.

```sql
insert into users (id, email, "displayName", role, "isActive", "createdAt", "updatedAt")
values (
  gen_random_uuid()::text,
  lower('owner@example.com'),  -- same email you used in step 1
  'Store Owner',               -- display name shown in the header
  'OWNER',
  true,
  now(),
  now()
);
```

- The row is matched to the Supabase auth user by email on first sign-in; the
  `authId` column is filled in automatically at that point.
- Use `'MANAGER'`, `'CASHIER'`, or `'INVENTORY'` in place of `'OWNER'` for other
  staff roles.
- Never insert rows for people who have not been given an auth account — they
  will not be able to sign in.

## 3. Sign in

Visit `/login` on the deployed site, use the email and temporary password from
step 1, and change the password afterwards in Supabase Authentication.
