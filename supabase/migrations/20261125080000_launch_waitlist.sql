create table if not exists public.launch_waitlist (
  email text primary key,
  consented boolean not null default false check (consented),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint launch_waitlist_email_normalized check (email = lower(btrim(email))),
  constraint launch_waitlist_email_length check (char_length(email) between 5 and 254),
  constraint launch_waitlist_email_format check (
    position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 1
    and position('@' in email) < char_length(email) - 3
  )
);

alter table public.launch_waitlist enable row level security;
revoke all on public.launch_waitlist from public, anon, authenticated;
grant insert (email, consented) on public.launch_waitlist to anon, authenticated;

drop policy if exists launch_waitlist_public_insert on public.launch_waitlist;
create policy launch_waitlist_public_insert on public.launch_waitlist
  for insert to anon, authenticated
  with check (
    consented is true
    and email = lower(btrim(email))
    and char_length(email) between 5 and 254
    and position('@' in email) > 1
    and position('.' in split_part(email, '@', 2)) > 1
    and position('@' in email) < char_length(email) - 3
  );
