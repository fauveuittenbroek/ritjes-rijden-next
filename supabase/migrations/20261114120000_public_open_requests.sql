-- Openstaande verzoeken publiek leesbaar maken (bekijken zonder account).
-- Plaatsen en accepteren blijven voorbehouden aan ingelogde gebruikers.

create policy requests_select_open_public on public.requests for select to anon, authenticated
using (status = 'open');

-- Anonieme bezoekers mogen alleen niet-gevoelige kolommen lezen.
grant select (id, type, item_description, num_people, note, contact_name, vertrekplaats, bestemming, ophaaladres, reward, scheduled_at, deadline_date, status, created_at) on public.requests to anon;
