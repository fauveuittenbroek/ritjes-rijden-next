alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text;

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), '')
from auth.users u
on conflict (id) do nothing;

update public.profiles p
set display_name = trim(u.raw_user_meta_data->>'display_name')
from auth.users u
where p.id = u.id
  and trim(p.display_name) = ''
  and nullif(trim(u.raw_user_meta_data->>'display_name'), '') is not null;

create or replace function public.create_profile_after_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_name text := trim(coalesce(new.raw_user_meta_data->>'display_name', ''));
  legal_version text := coalesce(new.raw_user_meta_data->>'legal_version', '');
begin
  if length(signup_name) < 1 or length(signup_name) > 80 then
    raise exception 'A display name between 1 and 80 characters is required' using errcode = '22023';
  end if;
  if new.raw_user_meta_data->>'terms_accepted' is distinct from 'true'
    or new.raw_user_meta_data->>'privacy_acknowledged' is distinct from 'true'
    or legal_version <> '1.0' then
    raise exception 'Current terms and privacy notice must be accepted' using errcode = '22023';
  end if;

  insert into public.profiles (
    id, display_name, terms_accepted_at, privacy_acknowledged_at, terms_version, privacy_version
  ) values (
    new.id, signup_name, now(), now(), legal_version, legal_version
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    terms_accepted_at = excluded.terms_accepted_at,
    privacy_acknowledged_at = excluded.privacy_acknowledged_at,
    terms_version = excluded.terms_version,
    privacy_version = excluded.privacy_version;

  return new;
end;
$$;

revoke all on function public.create_profile_after_signup() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_ritjes_profile on auth.users;
create trigger on_auth_user_created_ritjes_profile
after insert on auth.users
for each row execute function public.create_profile_after_signup();
