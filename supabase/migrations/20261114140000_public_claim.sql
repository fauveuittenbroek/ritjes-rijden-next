-- Iedere ingelogde gebruiker mag open verzoeken accepteren (niet je eigen verzoek).
-- Ook krijgt de accepterende gebruiker daarna toegang tot het geclaimde verzoek en de foto.

create or replace function public.can_view_request(_request_id uuid)
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
        or r.claimed_by = auth.uid()
        or exists (
          select 1 from public.request_circles rc
          join public.circle_members cm on cm.circle_id = rc.circle_id
          where rc.request_id = r.id and cm.user_id = auth.uid()
        )
      )
  );
$$;

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
  return result;
end;
$$;
