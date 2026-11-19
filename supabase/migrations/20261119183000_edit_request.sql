-- De maker mag een openstaand verzoek zelf wijzigen en dat wordt in de historie vastgelegd.

alter table public.request_events drop constraint if exists request_events_event_type_check;
alter table public.request_events
  add constraint request_events_event_type_check
  check (event_type in ('claimed', 'released', 'edited'));

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

revoke all on function public.update_request(uuid, json) from public, anon, authenticated;
grant execute on function public.update_request(uuid, json) to authenticated;
