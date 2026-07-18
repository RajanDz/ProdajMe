-- Increment view_count without exposing an open UPDATE policy.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS.
-- Only increments active/sold listings; silently ignores missing IDs.
create or replace function public.increment_view_count(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
  set view_count = view_count + 1
  where id = listing_id
    and status in ('active', 'sold');
end;
$$;

-- Allow any authenticated or anonymous caller to invoke this function.
grant execute on function public.increment_view_count(uuid) to anon, authenticated;
