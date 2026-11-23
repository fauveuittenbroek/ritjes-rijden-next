-- Tegenvoorstel: een rijder stelt een ander bedrag voor; de maker kan accepteren of weigeren.

alter table public.request_events drop constraint if exists request_events_event_type_check;
alter table public.request_events
  add constraint request_events_event_type_check
  check (event_type in ('claimed', 'released', 'edited', 'offer_proposed', 'offer_accepted', 'offer_declined'));

create table if not exists public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  offered_by uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0 and amount <= 10000),
  message text check (message is null or char_length(message) <= 280),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined', 'withdrawn')),
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists request_offers_request_status_idx
  on public.request_offers (request_id, status, created_at desc);

create unique index if not exists request_offers_active_unique
  on public.request_offers (request_id, offered_by)
  where status = 'proposed';

alter table public.request_offers enable row level security;
revoke all on public.request_offers from public, anon, authenticated;
grant select on public.request_offers to authenticated;

create policy request_offers_select on public.request_offers for select to authenticated
using (
  offered_by = auth.uid()
  or exists (
    select 1 from public.requests r
    where r.id = request_offers.request_id and r.created_by = auth.uid()
  )
);

create or replace function public.propose_offer(_request_id uuid, _amount numeric, _message text)
returns public.request_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.request_offers;
  request_owner uuid;
  request_deadline date;
  cleaned_message text := nullif(btrim(coalesce(_message, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _amount is null or _amount <= 0 or _amount > 10000 then
    raise exception 'A valid counteroffer amount is required' using errcode = '22023';
  end if;
  if cleaned_message is not null and char_length(cleaned_message) > 280 then
    raise exception 'A counteroffer message may contain at most 280 characters' using errcode = '22023';
  end if;

  select r.created_by, r.deadline_date into request_owner, request_deadline
  from public.requests r
  where r.id = _request_id and r.status = 'open'
  for update;

  if not found then
    raise exception 'Request is not available for a counteroffer' using errcode = '42501';
  end if;
  if request_owner = auth.uid() then
    raise exception 'You cannot make a counteroffer on your own request' using errcode = '42501';
  end if;
  if request_deadline is not null and request_deadline < current_date then
    raise exception 'Request deadline has passed' using errcode = '42501';
  end if;

  insert into public.request_offers (request_id, offered_by, amount, message)
  values (_request_id, auth.uid(), _amount, cleaned_message)
  on conflict (request_id, offered_by) where status = 'proposed'
  do update set
    amount = excluded.amount,
    message = excluded.message,
    updated_at = now()
  returning * into result;

  if not found then
    raise exception 'Your previous counteroffer is no longer open' using errcode = '42501';
  end if;

  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _request_id, 'offer_proposed', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(
      (select coalesce(r.item_description, r.bestemming) from public.requests r where r.id = _request_id),
      'Tegenvoorstel'
    )
  );

  return result;
end;
$$;

create or replace function public.respond_to_offer(_offer_id uuid, _accept boolean)
returns public.requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer public.request_offers;
  result public.requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into offer from public.request_offers where id = _offer_id for update;
  if not found then
    raise exception 'Counteroffer not found' using errcode = '42501';
  end if;
  if offer.status <> 'proposed' then
    raise exception 'Counteroffer has already been handled' using errcode = '42501';
  end if;

  update public.requests r
  set
    status = case when _accept then 'claimed' else r.status end,
    claimed_by = case when _accept then offer.offered_by else r.claimed_by end,
    reward = case when _accept then offer.amount else r.reward end
  where r.id = offer.request_id and r.status = 'open' and r.created_by = auth.uid()
  returning r.* into result;

  if not found then
    raise exception 'Request unavailable or not permitted' using errcode = '42501';
  end if;

  update public.request_offers o
  set
    status = case
      when o.id = _offer_id then case when _accept then 'accepted' else 'declined' end
      else 'declined'
    end,
    responded_by = auth.uid(),
    responded_at = now(),
    updated_at = now()
  where o.status = 'proposed'
    and (o.id = _offer_id or (_accept and o.request_id = offer.request_id));

  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    offer.request_id,
    case when _accept then 'offer_accepted' else 'offer_declined' end,
    auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(result.item_description, result.bestemming)
  );

  return result;
end;
$$;

create or replace function public.withdraw_offer(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.request_offers o
  set status = 'withdrawn', updated_at = now()
  where o.id = _offer_id and o.offered_by = auth.uid() and o.status = 'proposed';

  if not found then
    raise exception 'Only an open counteroffer can be withdrawn' using errcode = '42501';
  end if;
end;
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

  update public.request_offers o
  set status = 'declined', responded_by = auth.uid(), responded_at = now(), updated_at = now()
  where o.request_id = _id and o.status = 'proposed';

  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _id, 'claimed', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce(result.item_description, result.bestemming)
  );

  return result;
end;
$$;

revoke all on function public.propose_offer(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.respond_to_offer(uuid, boolean) from public, anon, authenticated;
revoke all on function public.withdraw_offer(uuid) from public, anon, authenticated;
revoke all on function public.claim_request(uuid) from public, anon, authenticated;

grant execute on function public.propose_offer(uuid, numeric, text) to authenticated;
grant execute on function public.respond_to_offer(uuid, boolean) to authenticated;
grant execute on function public.withdraw_offer(uuid) to authenticated;
grant execute on function public.claim_request(uuid) to authenticated;
