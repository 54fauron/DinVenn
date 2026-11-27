-- Kjør én gang i eksisterende pilotdatabase. Ingen anmeldelser slettes av oppgraderingen.
begin;
-- Forfatteren kan slette egen anmeldelse; bedriften kan bare fjerne eget svar.
set search_path = public, extensions;
create or replace function delete_business_review(p_review_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 delete from reviews where id=p_review_id and (user_id=auth.uid() or is_admin());
 if not found then raise exception 'Du kan bare slette egne anmeldelser. Administrator kan moderere alle.' using errcode='42501'; end if;
end;
$$;
create function delete_business_reply(p_review_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 update reviews set business_reply=null, replied_at=null
 where id=p_review_id and is_business_member(business_id);
 if not found then raise exception 'Du kan bare slette svar fra din egen bedrift.' using errcode='42501'; end if;
end;
$$;
revoke all on function delete_business_review(uuid), delete_business_reply(uuid) from public, anon, authenticated;
grant execute on function delete_business_review(uuid), delete_business_reply(uuid) to authenticated;

commit;
