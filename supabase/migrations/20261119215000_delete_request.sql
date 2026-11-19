create or replace function public.delete_request(_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.requests r
  where r.id = _id
    and r.created_by = auth.uid()
    and r.status = 'open';

  if not found then
    raise exception 'Only the creator can delete an open request' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.delete_request(uuid) from public, anon, authenticated;
grant execute on function public.delete_request(uuid) to authenticated;
