-- Marktplaats-model: open en geaccepteerde verzoeken publiek zichtbaar,
-- claim vrijgeven door rijder of maker, historie voor beheerders.

drop policy if exists requests_select_open_public on public.requests;
create policy requests_select_public on public.requests for select to anon, authenticated
using (status in ('open', 'claimed'));

grant select (id, type, item_description, num_people, note, contact_name, vertrekplaats, bestemming, ophaaladres, reward, scheduled_at, deadline_date, status, created_at, photo_path) on public.requests to anon;

-- Beheerders
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins for select to authenticated
using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- Historie
create table if not exists public.request_events (
  id bigserial primary key,
  request_id uuid not null references public.requests(id) on delete cascade,
  event_type text not null check (event_type in ('claimed', 'released')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  request_title text,
  created_at timestamptz not null default now()
);
create index if not exists request_events_request_id_idx on public.request_events (request_id, created_at desc);
alter table public.request_events enable row level security;
revoke all on public.request_events from public, anon, authenticated;
grant select on public.request_events to authenticated;
drop policy if exists request_events_select_admin on public.request_events;
create policy request_events_select_admin on public.request_events for select to authenticated
using (public.is_admin());

-- Verzoek aanmaken zonder verplichte cirkels (marktplaats)
create or replace function public.create_request(p_request json, p_circle_ids uuid[])
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
  if p_circle_ids is null then
    p_circle_ids := '{}';
  end if;
  if array_position(p_circle_ids, null) is not null then
    raise exception 'Circle IDs must not contain null' using errcode = '22023';
  end if;
  if cardinality(p_circle_ids) > 0 then
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

-- Accepteren: iedereen, behalve je eigen verzoek; leg historie vast
create or replace function public.claim_request(_id uuid)
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
  update public.requests r set status = 'claimed', claimed_by = auth.uid()
  where r.id = _id and r.status = 'open' and r.created_by <> auth.uid()
  returning r.* into result;
  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;
  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _id, 'claimed', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(result.item_description, result.bestemming)
  );
  return result;
end;
$$;

-- Vrijgeven: rijder of maker
create or replace function public.release_request(_id uuid)
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
  where r.id = _id and r.status = 'claimed'
    and (r.claimed_by = auth.uid() or r.created_by = auth.uid())
  returning r.* into result;
  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;
  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _id, 'released', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(result.item_description, result.bestemming)
  );
  return result;
end;
$$;

revoke all on function public.release_request(uuid) from public, anon, authenticated;
grant execute on function public.release_request(uuid) to authenticated;
