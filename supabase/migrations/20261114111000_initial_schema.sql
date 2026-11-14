create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  invite_code text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index circle_members_user_id_idx on public.circle_members (user_id, circle_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('goederen', 'personen')),
  item_description text,
  num_people integer check (num_people > 0),
  note text,
  contact_name text,
  vertrekplaats text not null check (length(trim(vertrekplaats)) > 0),
  bestemming text not null check (length(trim(bestemming)) > 0),
  ophaaladres text,
  reward numeric(12, 2) check (reward >= 0),
  scheduled_at timestamptz,
  deadline_date date,
  status text not null default 'open' check (status in ('open', 'claimed')),
  created_by uuid not null references auth.users(id) on delete cascade,
  claimed_by uuid references auth.users(id) on delete restrict,
  photo_path text,
  created_at timestamptz not null default now(),
  check ((status = 'open' and claimed_by is null) or (status = 'claimed' and claimed_by is not null)),
  check (claimed_by is null or claimed_by <> created_by),
  check (photo_path is null or photo_path like created_by::text || '/%')
);

create table public.request_circles (
  request_id uuid not null references public.requests(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,
  primary key (request_id, circle_id)
);

create index request_circles_circle_id_idx on public.request_circles (circle_id, request_id);
create index requests_created_by_idx on public.requests (created_by);
create index requests_photo_path_idx on public.requests (photo_path) where photo_path is not null;

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.requests enable row level security;
alter table public.request_circles enable row level security;

create function public.is_circle_member(_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = _circle_id and user_id = auth.uid()
  );
$$;

create function public.can_view_request(_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    where r.id = _request_id
      and (
        r.created_by = auth.uid()
        or exists (
          select 1 from public.request_circles rc
          join public.circle_members cm on cm.circle_id = rc.circle_id
          where rc.request_id = r.id and cm.user_id = auth.uid()
        )
      )
  );
$$;

create function public.can_view_profile(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select _user_id = auth.uid() or exists (
    select 1 from public.circle_members mine
    join public.circle_members theirs on theirs.circle_id = mine.circle_id
    where mine.user_id = auth.uid() and theirs.user_id = _user_id
  );
$$;

create function public.can_view_request_photo(_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.requests r
    where r.photo_path = _path and public.can_view_request(r.id)
  );
$$;

create policy profiles_select on public.profiles for select to authenticated
using (public.can_view_profile(id));
create policy profiles_insert on public.profiles for insert to authenticated
with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy circles_select on public.circles for select to authenticated
using (public.is_circle_member(id));
create policy circle_members_select on public.circle_members for select to authenticated
using (public.is_circle_member(circle_id));
create policy requests_select on public.requests for select to authenticated
using (public.can_view_request(id));
create policy request_circles_select on public.request_circles for select to authenticated
using (public.can_view_request(request_id));

create function public.create_circle(_name text)
returns public.circles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.circles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into public.circles (name, created_by)
  values (trim(_name), auth.uid())
  returning * into result;
  insert into public.circle_members (circle_id, user_id)
  values (result.id, auth.uid());
  return result;
end;
$$;

create function public.join_circle_by_code(_code text)
returns public.circles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.circles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into result from public.circles where invite_code = trim(_code);
  if not found then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;
  insert into public.circle_members (circle_id, user_id)
  values (result.id, auth.uid()) on conflict do nothing;
  return result;
end;
$$;

create function public.create_request(p_request json, p_circle_ids uuid[])
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.requests;
  circle_id uuid;
  circle_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_request is null or json_typeof(p_request) <> 'object' then
    raise exception 'Request must be a JSON object' using errcode = '22023';
  end if;
  if p_circle_ids is null or cardinality(p_circle_ids) = 0 or array_position(p_circle_ids, null) is not null then
    raise exception 'At least one valid circle is required' using errcode = '22023';
  end if;
  select count(distinct id) into circle_count from unnest(p_circle_ids) as ids(id);
  if circle_count <> cardinality(p_circle_ids) then
    raise exception 'Duplicate circle IDs are not allowed' using errcode = '22023';
  end if;
  perform cm.circle_id from public.circle_members cm
  where cm.user_id = auth.uid() and cm.circle_id = any(p_circle_ids)
  order by cm.circle_id for key share;
  if (select count(*) from public.circle_members cm where cm.user_id = auth.uid() and cm.circle_id = any(p_circle_ids)) <> circle_count then
    raise exception 'Membership required for every circle' using errcode = '42501';
  end if;
  insert into public.requests (type, item_description, num_people, note, contact_name, vertrekplaats, bestemming, ophaaladres, reward, scheduled_at, deadline_date, created_by, photo_path)
  values (
    p_request->>'type', p_request->>'item_description', (p_request->>'num_people')::integer,
    p_request->>'note', p_request->>'contact_name', p_request->>'vertrekplaats', p_request->>'bestemming',
    p_request->>'ophaaladres', (p_request->>'reward')::numeric,
    (p_request->>'scheduled_at')::timestamptz, (p_request->>'deadline_date')::date,
    auth.uid(), p_request->>'photo_path'
  ) returning * into result;
  foreach circle_id in array p_circle_ids loop
    insert into public.request_circles (request_id, circle_id) values (result.id, circle_id);
  end loop;
  return result;
end;
$$;

create function public.claim_request(_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform cm.circle_id from public.circle_members cm
  join public.request_circles rc on rc.circle_id = cm.circle_id
  where cm.user_id = auth.uid() and rc.request_id = _id
  order by cm.circle_id for key share of cm;
  update public.requests r set status = 'claimed', claimed_by = auth.uid()
  where r.id = _id and r.status = 'open' and r.created_by <> auth.uid()
    and exists (
      select 1 from public.request_circles rc
      join public.circle_members cm on cm.circle_id = rc.circle_id
      where rc.request_id = r.id and cm.user_id = auth.uid()
    )
  returning r.* into result;
  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;
  return result;
end;
$$;

create function public.reopen_request(_id uuid)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update public.requests r set status = 'open', claimed_by = null
  where r.id = _id and r.status = 'claimed' and r.created_by = auth.uid()
  returning r.* into result;
  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;
  return result;
end;
$$;

revoke all on public.profiles, public.circles, public.circle_members, public.requests, public.request_circles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.circles, public.circle_members, public.requests, public.request_circles to authenticated;
revoke all on function public.is_circle_member(uuid), public.can_view_request(uuid), public.can_view_profile(uuid), public.can_view_request_photo(text), public.create_circle(text), public.join_circle_by_code(text), public.create_request(json, uuid[]), public.claim_request(uuid), public.reopen_request(uuid) from public, anon, authenticated;
grant execute on function public.is_circle_member(uuid), public.can_view_request(uuid), public.can_view_profile(uuid), public.can_view_request_photo(text), public.create_circle(text), public.join_circle_by_code(text), public.create_request(json, uuid[]), public.claim_request(uuid), public.reopen_request(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('request-photos', 'request-photos', false)
on conflict (id) do update set public = false;

create policy request_photos_select on storage.objects for select to authenticated
using (bucket_id = 'request-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_view_request_photo(name)));
create policy request_photos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'request-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy request_photos_update on storage.objects for update to authenticated
using (bucket_id = 'request-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'request-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy request_photos_delete on storage.objects for delete to authenticated
using (bucket_id = 'request-photos' and (storage.foldername(name))[1] = auth.uid()::text);
