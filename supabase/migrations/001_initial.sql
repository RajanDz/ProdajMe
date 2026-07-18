-- Enable UUID extension
create extension if not exists "pgcrypto";

-- profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  city text,
  phone text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- categories (seeded)
create table public.categories (
  id serial primary key,
  slug text unique not null,
  name_me text not null,
  name_en text not null,
  sort_order int not null default 0
);

insert into public.categories (slug, name_me, name_en, sort_order) values
  ('t-shirts','Majice','T-Shirts',1),
  ('shirts','Košulje','Shirts',2),
  ('hoodies','Duksevi','Hoodies',3),
  ('jackets','Jakne','Jackets',4),
  ('jeans','Farmerke','Jeans',5),
  ('pants','Pantalone','Pants',6),
  ('shorts','Šorc','Shorts',7),
  ('dresses','Haljine','Dresses',8),
  ('skirts','Suknje','Skirts',9),
  ('shoes','Cipele','Shoes',10),
  ('sneakers','Patike','Sneakers',11),
  ('bags','Torbe','Bags',12),
  ('accessories','Dodaci','Accessories',13),
  ('sportswear','Sportska odjeća','Sportswear',14),
  ('kids','Dječija odjeća','Kids Clothing',15),
  ('other','Ostalo','Other',16);

-- listings
create table public.listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id int references public.categories(id) not null,
  title text not null check (char_length(title) between 3 and 100),
  description text check (char_length(description) <= 2000),
  price numeric(10,2) not null check (price > 0 and price <= 100000),
  negotiable boolean not null default false,
  gender text not null check (gender in ('women','men','unisex','kids')),
  size text not null check (char_length(size) <= 20),
  brand text check (char_length(brand) <= 60),
  color text check (char_length(color) <= 50),
  condition text not null check (condition in ('new_with_tags','like_new','very_good','good','fair')),
  city text not null check (char_length(city) between 2 and 100),
  status text not null default 'active' check (status in ('active','sold','hidden')),
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- listing_images
create table public.listing_images (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- reports
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  reason text not null check (char_length(reason) between 10 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- favorites (future-ready, not used in MVP)
create table public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  listing_id uuid references public.listings(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

-- Indexes
create index idx_listings_status on public.listings(status);
create index idx_listings_created_at on public.listings(created_at desc);
create index idx_listings_user_id on public.listings(user_id);
create index idx_listings_category_id on public.listings(category_id);
create index idx_listings_city on public.listings(city);
create index idx_listings_gender on public.listings(gender);
create index idx_listings_condition on public.listings(condition);
create index idx_listings_price on public.listings(price);
create index idx_listing_images_listing_id on public.listing_images(listing_id);
create index idx_profiles_username on public.profiles(username);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.categories enable row level security;
alter table public.reports enable row level security;
alter table public.favorites enable row level security;

-- profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- categories policies (read-only for all)
create policy "Categories are viewable by everyone" on public.categories
  for select using (true);

-- listings policies
create policy "Active listings are viewable by everyone" on public.listings
  for select using (status = 'active' or auth.uid() = user_id);
create policy "Authenticated users can create listings" on public.listings
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own listings" on public.listings
  for update using (auth.uid() = user_id);
create policy "Users can delete their own listings" on public.listings
  for delete using (auth.uid() = user_id);

-- listing_images policies
create policy "Listing images are viewable by everyone" on public.listing_images
  for select using (true);
create policy "Users can insert images for their own listings" on public.listing_images
  for insert with check (
    auth.uid() = (select user_id from public.listings where id = listing_id)
  );
create policy "Users can delete images for their own listings" on public.listing_images
  for delete using (
    auth.uid() = (select user_id from public.listings where id = listing_id)
  );

-- reports policies
create policy "Authenticated users can create reports" on public.reports
  for insert with check (auth.uid() = reporter_id);
create policy "Users can view their own reports" on public.reports
  for select using (auth.uid() = reporter_id);

-- favorites policies (future-ready)
create policy "Users can manage their own favorites" on public.favorites
  for all using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, phone, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'city', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
