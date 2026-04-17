-- Users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text,
  goals text,
  preferred_time text,
  allow_feature boolean default false,
  onboarded boolean default false,
  created_at timestamptz default now()
);

-- Matches table
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid references public.users(id),
  user2_id uuid references public.users(id),
  topic text,
  intro_text text,
  scheduled_time timestamptz,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Outcomes table
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id),
  title text,
  description text,
  featured boolean default false,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.users enable row level security;
alter table public.matches enable row level security;
alter table public.outcomes enable row level security;

-- Public read for outcomes, matches, and users (needed for collabs wall and admin)
create policy "Anyone can read outcomes" on public.outcomes for select using (true);
create policy "Anyone can read matches" on public.matches for select using (true);
create policy "Users can read all users" on public.users for select using (true);

-- Users can upsert their own profile
create policy "Users can upsert own profile" on public.users
  for insert with check (auth.jwt() ->> 'email' = email);
create policy "Users can update own profile" on public.users
  for update using (auth.jwt() ->> 'email' = email);

-- Authenticated users can insert outcomes and update match status
create policy "Users can insert outcomes" on public.outcomes for insert with check (true);
create policy "Users can update match status" on public.matches for update using (true);
