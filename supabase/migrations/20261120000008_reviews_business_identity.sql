-- Anmeldelser med privat forfatteridentitet og privat organisasjonsnummer.
set search_path = public, extensions;

create table business_private_details (
  business_id uuid primary key references businesses(id) on delete cascade deferrable initially deferred,
  org_number text not null check (org_number ~ '^[0-9]{9}$')
);
alter table business_private_details enable row level security;
create policy "medlemmer og admin leser organisasjonsnummer" on business_private_details
 for select to authenticated using (is_business_member(business_id) or is_admin());
revoke all on business_private_details from public, anon, authenticated;
grant select on business_private_details to authenticated;
insert into business_private_details select id, org_number from businesses where org_number is not null;
update businesses set org_number = null;
-- Eksisterende godkjente bedrifter uten nummer må godkjennes på nytt.
update businesses b set status = 'pending', org_verified_at = null
 where status = 'approved' and not exists (select 1 from business_private_details p where p.business_id = b.id);

create function save_business_org(p_business_id uuid, p_org_number text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare b businesses; previous text; v_number text := trim(p_org_number);
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode = '28000'; end if;
 select * into b from businesses where id = p_business_id for update;
 if not found or not (is_business_member(b.id) or is_admin()) then raise exception 'Ikke tilgang' using errcode = '42501'; end if;
 if v_number is null or v_number !~ '^[0-9]{9}$' then raise exception 'Organisasjonsnummer må ha ni sifre.'; end if;
 select org_number into previous from business_private_details where business_id = b.id;
 insert into business_private_details values (b.id, v_number)
 on conflict (business_id) do update set org_number = excluded.org_number;
 if previous is distinct from v_number then
  update businesses set org_verified_at = null,
   status = case when status = 'approved' then 'pending'::business_status else status end where id = b.id;
 end if;
end;
$$;
-- Det gamle offentlige feltet beholdes tomt for bakoverkompatible SELECT *-kall.
-- Interne adminfunksjoner som overtar profiler kan fortsatt overføre nummeret.
create function protect_business_org() returns trigger language plpgsql
set search_path = public, extensions as $$
begin
 if new.org_number is not null then
  if is_client_write() then raise exception 'Bruk save_business_org for organisasjonsnummer.' using errcode = '42501'; end if;
  insert into business_private_details values (new.id, new.org_number)
   on conflict (business_id) do update set org_number = excluded.org_number;
  new.org_number := null;
 end if;
 return new;
end;
$$;
create trigger protect_business_org before insert or update on businesses for each row execute function protect_business_org();
alter table businesses add constraint business_org_is_private check (org_number is null);
create function require_business_org_for_approval() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
 if new.status = 'approved' and not exists (select 1 from business_private_details where business_id = new.id) then
  raise exception 'Organisasjonsnummer må fylles inn før godkjenning.';
 end if;
 return new;
end;
$$;
create trigger z_require_business_org before insert or update on businesses for each row execute function require_business_org_for_approval();

alter table reviews add column is_anonymous boolean not null default false;
alter table reviews alter column rating set default 5;
drop policy "slett egen anmeldelse" on reviews;
-- Ingen rå API-lesing: user_id må aldri røpes for en anonym anmeldelse.
revoke all on reviews from public, anon, authenticated;
create or replace view public_profiles as
 select p.id, p.display_name, p.avatar_url from profiles p
 where p.id = auth.uid()
 or exists (select 1 from friendships f where (f.requester_id = auth.uid() and f.addressee_id = p.id) or (f.addressee_id = auth.uid() and f.requester_id = p.id))
 or exists (select 1 from reviews r where r.user_id = p.id and r.status = 'published' and not r.is_anonymous);

create function list_business_reviews(p_business_id uuid default null)
returns table (id uuid, business_id uuid, business_name text, author_name text,
 is_anonymous boolean, rating smallint, comment text, business_reply text,
 replied_at timestamptz, created_at timestamptz, is_own boolean)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
 if p_business_id is null and not is_admin() then raise exception 'Ikke tilgang' using errcode = '42501'; end if;
 return query select r.id, r.business_id, b.name,
  case when r.is_anonymous then null else coalesce(p.display_name, 'Bruker') end,
  r.is_anonymous, r.rating, r.comment, r.business_reply, r.replied_at, r.created_at,
  coalesce(r.user_id = auth.uid(), false)
 from reviews r join businesses b on b.id = r.business_id join profiles p on p.id = r.user_id
 where (p_business_id is null or r.business_id = p_business_id)
 and (b.status = 'approved' or is_business_member(b.id) or is_admin())
 and (r.status = 'published' or r.user_id = auth.uid() or is_business_member(b.id) or is_admin())
 order by r.created_at desc;
end;
$$;
create function submit_business_review(p_business_id uuid, p_rating int default 5, p_comment text default '', p_anonymous boolean default false)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode = '28000'; end if;
 if p_rating is null or p_rating not between 1 and 5 then raise exception 'Velg mellom én og fem stjerner.'; end if;
 if length(coalesce(p_comment, '')) > 1000 then raise exception 'Anmeldelsen kan ha maks 1000 tegn.'; end if;
 if not exists (select 1 from businesses where id = p_business_id and status = 'approved') then raise exception 'Bedriften er ikke godkjent'; end if;
 insert into reviews(business_id, user_id, rating, comment, is_anonymous)
 values(p_business_id, auth.uid(), p_rating, nullif(trim(p_comment), ''), coalesce(p_anonymous, false))
 on conflict (business_id, user_id) do update set rating = excluded.rating, comment = excluded.comment, is_anonymous = excluded.is_anonymous;
end;
$$;
-- Svaret inneholder aldri rå anmeldelsesdata med user_id.
drop function reply_to_review(uuid, text);
create function reply_to_review(p_review_id uuid, p_reply text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r reviews;
begin
 select * into r from reviews where id = p_review_id for update;
 if auth.uid() is null or not found or not is_business_member(r.business_id) then raise exception 'Ikke tilgang' using errcode = '42501'; end if;
 if p_reply is null or length(trim(p_reply)) not between 1 and 1000 then raise exception 'Svaret må ha mellom 1 og 1000 tegn.'; end if;
 update reviews set business_reply = trim(p_reply), replied_at = now() where id = r.id;
end;
$$;
create function delete_business_review(p_review_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
 if auth.uid() is null or not is_admin() then raise exception 'Kun administrator kan slette anmeldelser.' using errcode = '42501'; end if;
 delete from reviews where id = p_review_id;
 if not found then raise exception 'Anmeldelsen finnes ikke lenger.'; end if;
end;
$$;
revoke all on function save_business_org(uuid,text), submit_business_review(uuid,int,text,boolean), reply_to_review(uuid,text), delete_business_review(uuid), list_business_reviews(uuid) from public, anon, authenticated;
grant execute on function list_business_reviews(uuid) to anon, authenticated;
grant execute on function save_business_org(uuid,text), submit_business_review(uuid,int,text,boolean), reply_to_review(uuid,text), delete_business_review(uuid) to authenticated;
revoke all on function protect_business_org(), require_business_org_for_approval() from public, anon, authenticated;

create function get_business_org(p_business_id uuid) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
begin
 if auth.uid() is null or not (is_business_member(p_business_id) or is_admin()) then raise exception 'Ikke tilgang' using errcode = '42501'; end if;
 return (select org_number from business_private_details where business_id = p_business_id);
end;
$$;
revoke all on function get_business_org(uuid) from public, anon, authenticated;
grant execute on function get_business_org(uuid) to authenticated;
-- Ellers kunne en bruker omgå sletteforbudet ved å slette egen profil og
-- la ON DELETE CASCADE fjerne anmeldelsene. Kontosletting håndteres av server/admin.
revoke delete on profiles from public, anon, authenticated;
