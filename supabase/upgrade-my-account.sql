-- Kjør én gang i eksisterende pilotdatabase. Ingen data slettes.
begin;
-- Min side: sikker profilredigering og egen anmeldelseshistorikk.
set search_path = public, extensions;
create function save_my_profile(p_display_name text, p_home_city text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_name text := trim(coalesce(p_display_name,'')); v_city text := nullif(trim(p_home_city),'');
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 if length(v_name) not between 1 and 80 then raise exception 'Navnet må ha mellom 1 og 80 tegn.'; end if;
 if length(v_city) > 120 then raise exception 'Hjembyen kan ha maks 120 tegn.'; end if;
 update profiles set display_name=v_name, home_city=v_city where id=auth.uid();
 if not found then raise exception 'Profilen finnes ikke. Prøv å logge inn på nytt.'; end if;
end;
$$;
create function list_my_reviews()
returns table (id uuid, business_id uuid, business_name text, author_name text,
 is_anonymous boolean, rating smallint, comment text, business_reply text,
 replied_at timestamptz, created_at timestamptz, is_own boolean,
 status review_status, business_status business_status)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 return query select r.id, r.business_id, b.name,
 case when r.is_anonymous then null else p.display_name end,
 r.is_anonymous, r.rating, r.comment, r.business_reply, r.replied_at, r.created_at,
 true, r.status, b.status
 from reviews r join businesses b on b.id=r.business_id join profiles p on p.id=r.user_id
 where r.user_id=auth.uid() order by r.created_at desc, r.id;
end;
$$;
revoke all on function save_my_profile(text,text), list_my_reviews() from public, anon, authenticated;
grant execute on function save_my_profile(text,text), list_my_reviews() to authenticated;

commit;
