-- Foto's van verzoeken publiek tonen (ook voor bezoekers zonder account).
update storage.buckets set public = true where id = 'request-photos';

grant select (photo_path) on public.requests to anon;
