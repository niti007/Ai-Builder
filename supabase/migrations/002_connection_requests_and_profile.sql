-- Add avatar and bio to users
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;

-- Add notification flags to matches (missing from 001)
alter table public.matches add column if not exists user1_notified boolean default false;
alter table public.matches add column if not exists user2_notified boolean default false;

-- Connection requests table
create table if not exists public.connection_requests (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid references public.users(id) on delete cascade not null,
  to_user_id      uuid references public.users(id) on delete cascade not null,
  message         text not null,
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now(),
  unique(from_user_id, to_user_id)
);

alter table public.connection_requests enable row level security;

create policy "view_own_requests" on public.connection_requests for select
  using (
    from_user_id = (select id from public.users where email = auth.jwt() ->> 'email') or
    to_user_id   = (select id from public.users where email = auth.jwt() ->> 'email')
  );

create policy "send_request" on public.connection_requests for insert
  with check (
    from_user_id = (select id from public.users where email = auth.jwt() ->> 'email')
  );

create policy "respond_request" on public.connection_requests for update
  using (
    to_user_id = (select id from public.users where email = auth.jwt() ->> 'email')
  );
