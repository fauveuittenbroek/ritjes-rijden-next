-- De zes voorbeeldopdrachten als echte verzoeken in de database zetten.
-- Eigenaar wordt het oudste beheerdersaccount; daarna zijn ze te accepteren.

with owner as (
  select a.user_id
  from public.admins a
  join auth.users u on u.id = a.user_id
  order by u.created_at asc
  limit 1
)
insert into public.requests (id, type, item_description, note, contact_name, vertrekplaats, bestemming, status, created_by, created_at)
select
  v.id::uuid,
  'goederen',
  v.item_description,
  v.note,
  'Ritjes Rijden',
  v.vertrekplaats,
  v.bestemming,
  'open',
  owner.user_id,
  now() - v.age::interval
from owner
cross join (
  values
    ('3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f01', 'Co sleeper met matras', 'Houten co-sleeper inclusief matras. Ophalen in Zoetermeer en afleveren op het opgegeven adres.', 'Zoetermeer', 'Nieuwer Ter Aa', '6 days'),
    ('3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f02', 'Techniek spullen (pakketje)', 'Doos met techniek- en elektronica-onderdelen (pakketje).', 'Nieuwer Ter Aa', 'Den Haag', '5 days'),
    ('3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f03', 'Tafelonderstel', 'Los tafelonderstel dat vervoerd moet worden. Ophalen in Amersfoort.', 'Amersfoort', 'Nieuwer Ter Aa', '4 days'),
    ('3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f04', 'Scooter (kapot)', 'Defecte scooter die niet meer rijdt en vervoerd moet worden.', 'Amsterdam', 'Amsterdam', '3 days'),
    ('3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f05', 'Commode', 'Geschilderde houten commode. Ophalen in Baambrugge.', 'Baambrugge', 'Nieuwer Ter Aa', '2 days'),
    ('3f1b9c4e-8a21-4c7d-9e11-6a1d2b3c4f06', 'Tuingereedschap', 'Tuingereedschap, waaronder een bosmaaier.', 'Nieuwer Ter Aa', 'Wijnaldum (Friesland)', '1 day')
) as v(id, item_description, note, vertrekplaats, bestemming, age)
on conflict (id) do nothing;
