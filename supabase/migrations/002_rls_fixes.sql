-- Fix 1: profiles UPDATE
-- Prevent users from escalating their own role or clearing their own suspension.
-- The with check reads the current persisted values and asserts they haven't changed.
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- role must remain unchanged
    and role = (select role from public.profiles where id = auth.uid())
    -- is_suspended must remain unchanged
    and is_suspended = (select is_suspended from public.profiles where id = auth.uid())
  );

-- Fix 2: listings UPDATE
-- Prevent ownership transfer (user_id change) and prevent users from
-- setting status = 'hidden' (admin-only action).
drop policy if exists "Users can update their own listings" on public.listings;

create policy "Users can update their own listings" on public.listings
  for update
  using (auth.uid() = user_id)
  with check (
    -- ownership cannot be transferred
    auth.uid() = user_id
    -- only 'active' and 'sold' are user-settable; 'hidden' is admin-only
    and status in ('active', 'sold')
  );
