-- Toegangsbeheer: homepage-schakelaar, testgebruikers en RLS voor ritjes.

create table if not exists public.site_settings (
  key text primary key,
  value boolean not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values ('construction_mode', true)
on conflict (key) do nothing;

alter table public.site_settings enable row level security;
revoke all on public.site_settings from public, anon, authenticated;
grant select on public.site_settings to anon, authenticated;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated using (true);

create table if not exists public.launch_testers (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);

alter table public.launch_testers enable row level security;
revoke all on public.launch_testers from public, anon, authenticated;

insert into public.launch_testers (email) values
  ('fauve.stolwijk@gmail.com'),
  ('fauvestolwijk@hotmail.com'),
  ('mattijs.uittenbroek@gmail.com')
on conflict (email) do nothing;

create or replace function public.construction_mode()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.value from public.site_settings s where s.key = 'construction_mode'),
    true
  );
$$;

create or replace function public.is_launch_tester()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_testers t
    join auth.users u on lower(u.email) = t.email
    where u.id = auth.uid()
  );
$$;

revoke all on function public.construction_mode() from public;
revoke all on function public.is_launch_tester() from public;
grant execute on function public.construction_mode() to anon, authenticated;
grant execute on function public.is_launch_tester() to anon, authenticated;

drop policy if exists requests_select_public on public.requests;
create policy requests_select_public on public.requests
  for select to anon, authenticated
  using (
    status in ('open', 'claimed')
    and (not public.construction_mode() or public.is_launch_tester())
  );
