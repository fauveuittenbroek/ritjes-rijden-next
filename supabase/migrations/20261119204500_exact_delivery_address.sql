alter table public.requests
  add column if not exists afleveradres text;

revoke select on public.requests from public, anon, authenticated;
revoke select (ophaaladres, afleveradres) on public.requests from public, anon, authenticated;
grant select (id, type, item_description, num_people, note, contact_name, vertrekplaats, bestemming, reward, scheduled_at, deadline_date, status, created_at, photo_path) on public.requests to anon;
grant select (id, type, item_description, num_people, note, contact_name, vertrekplaats, bestemming, reward, scheduled_at, deadline_date, status, created_at, photo_path, created_by, claimed_by) on public.requests to authenticated;

create or replace function public.get_request_addresses(_id uuid)
returns table (ophaaladres text, afleveradres text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.ophaaladres, r.afleveradres
  from public.requests r
  where r.id = _id
    and auth.uid() is not null
    and (r.created_by = auth.uid() or (r.status = 'claimed' and r.claimed_by = auth.uid()));
$$;

revoke all on function public.get_request_addresses(uuid) from public, anon, authenticated;
grant execute on function public.get_request_addresses(uuid) to authenticated;

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
  insert into public.requests (type, item_description, num_people, note, contact_name, vertrekplaats, bestemming, ophaaladres, afleveradres, reward, scheduled_at, deadline_date, created_by, photo_path)
  values (
    p_request->>'type', p_request->>'item_description', (p_request->>'num_people')::integer,
    p_request->>'note', p_request->>'contact_name', p_request->>'vertrekplaats', p_request->>'bestemming',
    p_request->>'ophaaladres', p_request->>'afleveradres', (p_request->>'reward')::numeric,
    (p_request->>'scheduled_at')::timestamptz, (p_request->>'deadline_date')::date,
    auth.uid(), p_request->>'photo_path'
  ) returning * into result;
  foreach circle_id in array p_circle_ids loop
    insert into public.request_circles (request_id, circle_id) values (result.id, circle_id);
  end loop;
  return result;
end;
$$;

create or replace function public.update_request(_id uuid, p_request json)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.requests;
  request_type text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_request is null or json_typeof(p_request) <> 'object' then
    raise exception 'Request must be a JSON object' using errcode = '22023';
  end if;
  if (p_request->>'type') is null then
    raise exception 'Request type is required' using errcode = '22023';
  end if;

  select r.type into request_type
  from public.requests r
  where r.id = _id and r.status = 'open' and r.created_by = auth.uid()
  for update;

  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;
  if request_type <> (p_request->>'type') then
    raise exception 'Request type cannot be changed' using errcode = '22023';
  end if;

  update public.requests r
  set
    item_description = p_request->>'item_description',
    num_people = (p_request->>'num_people')::integer,
    note = p_request->>'note',
    contact_name = p_request->>'contact_name',
    vertrekplaats = p_request->>'vertrekplaats',
    bestemming = p_request->>'bestemming',
    ophaaladres = p_request->>'ophaaladres',
    afleveradres = p_request->>'afleveradres',
    reward = (p_request->>'reward')::numeric,
    scheduled_at = (p_request->>'scheduled_at')::timestamptz,
    deadline_date = (p_request->>'deadline_date')::date,
    photo_path = p_request->>'photo_path'
  where r.id = _id and r.status = 'open' and r.created_by = auth.uid()
  returning r.* into result;

  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;

  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _id, 'edited', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(result.item_description, result.bestemming)
  );

  return result;
end;
$$;

revoke all on function public.create_request(json, uuid[]) from public, anon, authenticated;
grant execute on function public.create_request(json, uuid[]) to authenticated;
revoke all on function public.update_request(uuid, json) from public, anon, authenticated;
grant execute on function public.update_request(uuid, json) to authenticated;
