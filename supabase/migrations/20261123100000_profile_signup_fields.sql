-- Profielvelden voor telefoon en accounttype, en sociale aanmeldingen toestaan.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists phone text,
  add column if not exists account_type text not null default 'particulier'
    check (account_type in ('particulier', 'zakelijk'));

create or replace function public.create_profile_after_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_name text := trim(coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1),
    ''
  ));
  legal_version text := nullif(trim(coalesce(new.raw_user_meta_data->>'legal_version', '')), '');
  is_email_signup boolean := coalesce(new.raw_app_meta_data->>'provider', 'email') = 'email';
  signup_phone text := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), '');
  signup_account_type text := case
    when new.raw_user_meta_data->>'account_type' = 'zakelijk' then 'zakelijk'
    else 'particulier'
  end;
begin
  if length(signup_name) < 1 or length(signup_name) > 80 then
    raise exception 'A display name between 1 and 80 characters is required' using errcode = '22023';
  end if;

  if is_email_signup then
    if new.raw_user_meta_data->>'terms_accepted' is distinct from 'true'
      or new.raw_user_meta_data->>'privacy_acknowledged' is distinct from 'true'
      or legal_version is distinct from '1.0' then
      raise exception 'Current terms and privacy notice must be accepted' using errcode = '22023';
    end if;
  end if;

  insert into public.profiles (
    id, display_name, phone, account_type,
    terms_accepted_at, privacy_acknowledged_at, terms_version, privacy_version
  ) values (
    new.id, signup_name, signup_phone, signup_account_type,
    case when is_email_signup then now() end,
    case when is_email_signup then now() end,
    case when is_email_signup then legal_version end,
    case when is_email_signup then legal_version end
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    phone = coalesce(excluded.phone, profiles.phone),
    account_type = excluded.account_type,
    terms_accepted_at = coalesce(excluded.terms_accepted_at, profiles.terms_accepted_at),
    privacy_acknowledged_at = coalesce(excluded.privacy_acknowledged_at, profiles.privacy_acknowledged_at),
    terms_version = coalesce(excluded.terms_version, profiles.terms_version),
    privacy_version = coalesce(excluded.privacy_version, profiles.privacy_version);

  return new;
end;
$$;

revoke all on function public.create_profile_after_signup() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_ritjes_profile on auth.users;
create trigger on_auth_user_created_ritjes_profile
after insert on auth.users
for each row execute function public.create_profile_after_signup();
