-- Afronden van een rit en beoordelingen met sterren.

alter table public.request_events drop constraint if exists request_events_event_type_check;
alter table public.request_events
  add constraint request_events_event_type_check
  check (event_type in (
    'claimed', 'released', 'edited', 'completed', 'reviewed',
    'offer_proposed', 'offer_accepted', 'offer_declined'
  ));

create table if not exists public.request_completions (
  request_id uuid primary key references public.requests(id) on delete cascade,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now()
);

alter table public.request_completions enable row level security;
revoke all on public.request_completions from public, anon, authenticated;
grant select on public.request_completions to anon, authenticated;
drop policy if exists request_completions_select on public.request_completions;
create policy request_completions_select on public.request_completions
  for select to anon, authenticated using (true);

create table if not exists public.request_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (request_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

create index if not exists request_reviews_reviewee_idx
  on public.request_reviews (reviewee_id, created_at desc);

alter table public.request_reviews enable row level security;
revoke all on public.request_reviews from public, anon, authenticated;
grant select on public.request_reviews to anon, authenticated;
drop policy if exists request_reviews_select on public.request_reviews;
create policy request_reviews_select on public.request_reviews
  for select to anon, authenticated using (true);

create or replace function public.complete_request(_id uuid)
returns public.request_completions
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.request_completions;
  request_creator uuid;
  request_claimer uuid;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select r.created_by, r.claimed_by, r.status
    into request_creator, request_claimer, request_status
  from public.requests r
  where r.id = _id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = '42501';
  end if;
  if request_status <> 'claimed' then
    raise exception 'Only a claimed request can be completed' using errcode = '42501';
  end if;
  if auth.uid() <> request_creator and auth.uid() <> request_claimer then
    raise exception 'Only the creator or rider can complete this request' using errcode = '42501';
  end if;

  insert into public.request_completions (request_id, completed_by)
  values (_id, auth.uid())
  on conflict (request_id) do nothing
  returning * into result;

  if not found then
    select * into result from public.request_completions where request_id = _id;
    return result;
  end if;

  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _id, 'completed', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce((select coalesce(r.item_description, r.bestemming) from public.requests r where r.id = _id), 'Rit afgerond')
  );

  return result;
end;
$$;

create or replace function public.submit_review(_request_id uuid, _rating integer, _comment text)
returns public.request_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.request_reviews;
  request_creator uuid;
  request_claimer uuid;
  request_status text;
  target_reviewee uuid;
  cleaned_comment text := nullif(btrim(coalesce(_comment, '')), '');
  reviewer_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'A rating between 1 and 5 is required' using errcode = '22023';
  end if;
  if cleaned_comment is not null and char_length(cleaned_comment) > 1000 then
    raise exception 'A review may contain at most 1000 characters' using errcode = '22023';
  end if;

  select r.created_by, r.claimed_by, r.status
    into request_creator, request_claimer, request_status
  from public.requests r
  where r.id = _request_id;

  if not found then
    raise exception 'Request not found' using errcode = '42501';
  end if;
  if request_status <> 'claimed' then
    raise exception 'Reviews are possible after the ride is completed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.request_completions c where c.request_id = _request_id) then
    raise exception 'The ride must be completed before reviewing' using errcode = '42501';
  end if;

  if auth.uid() = request_creator then
    target_reviewee := request_claimer;
  elsif auth.uid() = request_claimer then
    target_reviewee := request_creator;
  else
    raise exception 'Only participants can review this ride' using errcode = '42501';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), split_part(u.email, '@', 1), 'Gebruiker')
    into reviewer_display_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = auth.uid();

  insert into public.request_reviews (request_id, reviewer_id, reviewee_id, reviewer_name, rating, comment)
  values (_request_id, auth.uid(), target_reviewee, reviewer_display_name, _rating, cleaned_comment)
  on conflict (request_id, reviewer_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    reviewer_name = excluded.reviewer_name,
    created_at = now()
  returning * into result;

  insert into public.request_events (request_id, event_type, actor_id, actor_email, request_title)
  values (
    _request_id, 'reviewed', auth.uid(),
    (select email from auth.users where id = auth.uid()),
    coalesce((select coalesce(r.item_description, r.bestemming) from public.requests r where r.id = _request_id), 'Beoordeling')
  );

  return result;
end;
$$;

revoke all on function public.complete_request(uuid) from public, anon, authenticated;
revoke all on function public.submit_review(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.complete_request(uuid) to authenticated;
grant execute on function public.submit_review(uuid, integer, text) to authenticated;
