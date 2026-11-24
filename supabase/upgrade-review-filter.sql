-- Kjør én gang i en eksisterende DinVenn-database etter upgrade-reviews.sql.
begin;
-- Ordfilter for nye og endrede anmeldelser og bedriftssvar.
-- Eksisterende innhold blir ikke slettet eller endret.
set search_path = public, extensions;

create function normalize_review_text(p_text text)
returns text language sql immutable
set search_path = public, extensions as $$
 select trim(regexp_replace(
   lower(normalize(translate(coalesce(p_text, ''),
     U&'\200B\200C\200D\2060\FEFF', ''), NFKC)),
   '[^[:alnum:]æøåÆØÅ]+', ' ', 'g'));
$$;
revoke all on function normalize_review_text(text) from public, anon, authenticated;
-- Normalisering brukes også av CHECK ved administratorens redigering.
grant execute on function normalize_review_text(text) to authenticated;

create table review_blocked_terms (
 term text primary key,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 constraint review_blocked_terms_normalized check (
   term = normalize_review_text(term) and length(term) between 2 and 120
 )
);
alter table review_blocked_terms enable row level security;
revoke all on review_blocked_terms from public, anon, authenticated;
grant select, insert, update, delete on review_blocked_terms to authenticated;
create policy "kun admin administrerer anmeldelsesordliste" on review_blocked_terms
 for all to authenticated using (is_admin()) with check (is_admin());

-- Startliste: tydelige rasistiske, homofobiske og funksjonsnedsettende skjellsord.
-- Hele ord/uttrykk, ikke deler av ord. Listen kan justeres uten ny appversjon.
insert into review_blocked_terms (term) values
 ('neger'), ('negre'), ('nigger'), ('niggers'), ('nigga'),
 ('pakkis'), ('pakkiser'), ('jødesvin'), ('svarting'), ('svartinger'),
 ('faggot'), ('faggots'), ('retard'), ('retarded');

create function guard_review_language()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare v_comment text := ''; v_reply text := '';
begin
 if tg_op = 'INSERT' then
   v_comment := normalize_review_text(new.comment);
   v_reply := normalize_review_text(new.business_reply);
 else
   if new.comment is distinct from old.comment then
     v_comment := normalize_review_text(new.comment);
   end if;
   if new.business_reply is distinct from old.business_reply then
     v_reply := normalize_review_text(new.business_reply);
   end if;
 end if;
 if exists (
   select 1 from review_blocked_terms b where b.is_active and (
     strpos(' ' || v_comment || ' ', ' ' || b.term || ' ') > 0
     or strpos(' ' || v_reply || ' ', ' ' || b.term || ' ') > 0
   )
 ) then
   raise exception 'Teksten inneholder ord eller uttrykk som ikke er tillatt. Skriv om teksten og prøv igjen.'
     using errcode = '23514';
 end if;
 return new;
end;
$$;
revoke all on function guard_review_language() from public, anon, authenticated;
create trigger z_review_language before insert or update of comment, business_reply on reviews
 for each row execute function guard_review_language();

commit;
