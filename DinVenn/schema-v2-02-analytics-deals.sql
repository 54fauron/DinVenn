-- DinVenn – schema v2, fil 2 av 5: analytics, smartere tilbud og studentverifisering
-- Kjør etter schema-v2-01-hardening.sql

-- ========== ENUMS ==========
create type analytics_target     as enum ('deal', 'event', 'business', 'news_post');
create type analytics_event_type as enum ('view', 'click', 'share', 'directions', 'call', 'website');
create type verification_status  as enum ('pending', 'verified', 'expired');

-- ========== ANALYTICS ==========
-- Appen logger hendelser; bedriften ser tallene i dashboardet.
create table analytics_events (
  id           bigint generated always as identity primary key,
  business_id  uuid not null references businesses(id) on delete cascade,
  target_type  analytics_target not null,
  target_id    uuid not null,
  event_type   analytics_event_type not null,
  user_id      uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on analytics_events (business_id, created_at desc);
create index on analytics_events (target_type, target_id, event_type);

alter table analytics_events enable row level security;

create policy "logg egen hendelse" on analytics_events
  for insert to authenticated
  with check (
    user_id is not distinct from auth.uid()
    and exists (select 1 from businesses b where b.id = business_id)
  );
create policy "bedrift leser egen statistikk" on analytics_events
  for select using (is_business_member(business_id) or is_admin());

-- ========== INNLØSNING: NYE FELT ==========
-- is_first_time: første innløsning hos DENNE bedriften = ny kunde
-- party_size:    antall personer som kom (gruppetilbud)
-- expires_at:    koden slutter å gjelde
alter table deal_redemptions
  add column is_first_time boolean,
  add column party_size    int not null default 1 check (party_size >= 1),
  add column expires_at    timestamptz not null default (now() + interval '30 days');

-- ========== TILBUDSMALER ==========
-- Ferdige maler for bedrifter som ikke vet hva de skal tilby. Styres av admin.
create table deal_templates (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  description         text,
  tip                 text,                         -- råd til bedriftseieren
  category_id         int references categories(id), -- null = passer alle
  discount_type       discount_type not null default 'percent',
  discount_value      numeric,
  suggested_weekdays  int[] not null default '{}',   -- 0 = mandag
  suggested_start     time,
  suggested_end       time,
  min_group_size      int not null default 1 check (min_group_size >= 1),
  student_only         boolean not null default false,
  terms               text,
  is_active           boolean not null default true,
  sort_order          int not null default 0
);
alter table deal_templates enable row level security;
create policy "les aktive maler" on deal_templates
  for select using (is_active or is_admin());
create policy "admin styrer maler" on deal_templates
  for all using (is_admin());

insert into deal_templates
  (title, description, tip, category_id, discount_type, discount_value,
   suggested_weekdays, suggested_start, suggested_end, min_group_size, student_only, terms, sort_order)
values
  ('Rolig tirsdag', '20 % rabatt på alt tirsdag ettermiddag',
   'Fyll de stille timene: velg ukedager og tidspunkt dere sjelden har mange kunder.',
   null, 'percent', 20, '{1}', '13:00', '17:00', 1, false, null, 1),
  ('Ta med en venn', 'Kom to eller flere og få en gratis ekstra',
   'Gruppetilbud gir nye kunder, siden hver gjest tar med en venn som ikke har vært her.',
   (select id from categories where slug = 'mat-drikke'), 'freebie', null,
   '{}', null, null, 2, false, 'Gjelder ved kjøp for minst to personer.', 2),
  ('Studentpris', '15 % rabatt mot studentbevis i appen',
   'Verifiserte studenter vises som studenter når koden skannes.',
   null, 'percent', 15, '{}', null, null, 1, true, null, 3),
  ('Første gang-tilbud', 'Prøv oss første gang med 25 % rabatt',
   'Hver bruker kan bruke tilbudet én gang. Du ser hvor mange som er nye kunder i statistikken.',
   null, 'percent', 25, '{}', null, null, 1, false, 'Gjelder første besøk.', 4),
  ('Happy hour', '2 for 1 på utvalgte drikker',
   'Legg til ukedager og tid, så vises tilbudet bare når det gjelder.',
   (select id from categories where slug = 'mat-drikke'), 'other', null,
   '{3,4}', '16:00', '18:00', 1, false, null, 5),
  ('Lunsjtilbud for studenter', '30 kr av lunsjen på hverdager',
   'Passer for bedrifter nær skoler og campus.',
   (select id from categories where slug = 'mat-drikke'), 'amount', 30,
   '{0,1,2,3,4}', '11:00', '14:00', 1, true, null, 6);

-- ========== NYE FELT PÅ DEALS ==========
alter table deals
  add column is_flash       boolean not null default false,  -- lynsalg med push i nærheten
  add column flash_radius_m int check (flash_radius_m is null or flash_radius_m between 100 and 50000),
  add column min_group_size int not null default 1 check (min_group_size >= 1),
  add column student_only   boolean not null default false,
  add column template_id    uuid references deal_templates(id) on delete set null,
  add constraint deals_flash_needs_end check (not is_flash or ends_at is not null);

-- ========== UKEPLAN FOR TILBUD ==========
-- Ingen rader = gjelder alltid. Med rader gjelder tilbudet bare i disse vinduene.
-- Vindu over midnatt: lag to rader (f.eks. 22:00-23:59 og 00:00-02:00).
create table deal_schedules (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6),  -- 0 = mandag
  starts_time time not null,
  ends_time   time not null,
  check (starts_time < ends_time),
  unique (deal_id, weekday, starts_time)
);
create index on deal_schedules (deal_id);

alter table deal_schedules enable row level security;
create policy "les ukeplan" on deal_schedules
  for select using (exists (select 1 from deals d where d.id = deal_id));
create policy "administrer ukeplan" on deal_schedules
  for all using (
    exists (select 1 from deals d where d.id = deal_id and is_business_member(d.business_id))
  );

-- Gjelder tilbudet akkurat nå? (norsk tid)
create or replace function deal_is_valid_now(p_deal_id uuid, p_at timestamptz default now())
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  with local as (select p_at at time zone 'Europe/Oslo' as ts)
  select
    not exists (select 1 from deal_schedules s where s.deal_id = p_deal_id)
    or exists (
      select 1 from deal_schedules s, local l
      where s.deal_id = p_deal_id
        and s.weekday = extract(isodow from l.ts)::int - 1
        and l.ts::time >= s.starts_time
        and l.ts::time <  s.ends_time
    );
$$;

-- Hjem-feed: aktive tilbud fra godkjente bedrifter, med "gjelder nå"-flagg
create view active_deals with (security_invoker = true) as
select d.*, deal_is_valid_now(d.id) as valid_now
from deals d
join businesses b on b.id = d.business_id and b.status = 'approved'
where d.status = 'active'
  and d.starts_at <= now()
  and (d.ends_at is null or d.ends_at > now());

-- ========== STUDENTVERIFISERING ==========
create table institutions (
  id            serial primary key,
  name          text not null,
  short_name    text,
  city          text,
  email_domains text[] not null,
  is_active     boolean not null default true
);
alter table institutions enable row level security;
create policy "les skoler" on institutions for select using (true);
create policy "admin styrer skoler" on institutions for all using (is_admin());

-- Domenene må kontrolleres mot skolenes faktiske e-postdomener før lansering.
insert into institutions (name, short_name, city, email_domains) values
  ('Akademiet',                      'Akademiet', null,       '{stud.akademiet.no}'),
  ('Universitetet i Oslo',           'UiO',       'Oslo',     '{student.uio.no}'),
  ('OsloMet',                        'OsloMet',   'Oslo',     '{stud.oslomet.no}'),
  ('Handelshøyskolen BI',            'BI',        'Oslo',     '{student.bi.no}'),
  ('NTNU',                           'NTNU',      'Trondheim','{stud.ntnu.no}'),
  ('Universitetet i Bergen',         'UiB',       'Bergen',   '{student.uib.no}'),
  ('UiT Norges arktiske universitet','UiT',       'Tromsø',   '{student.uit.no}');

-- Brukeren kan aldri lese verification_token (sendes på e-post av en Edge Function
-- som bruker service_role, f.eks. via database-webhook på insert/update).
create table student_verifications (
  user_id            uuid primary key references profiles(id) on delete cascade,
  institution_id     int not null references institutions(id),
  edu_email          text not null,
  status             verification_status not null default 'pending',
  verification_token text,
  token_expires_at   timestamptz,
  verified_at        timestamptz,
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);
-- Én skole-e-post kan bare være verifisert på én konto
create unique index on student_verifications (lower(edu_email)) where status = 'verified';

alter table student_verifications enable row level security;
create policy "se egen verifisering" on student_verifications
  for select using (user_id = auth.uid());

revoke all on student_verifications from anon, authenticated;
grant select (user_id, institution_id, edu_email, status, verified_at, expires_at, created_at)
  on student_verifications to authenticated;

create or replace function is_verified_student(p_user uuid default auth.uid())
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from student_verifications
    where user_id = p_user and status = 'verified' and expires_at > now()
  );
$$;

-- Steg 1: bruker oppgir skole-e-post. Token sendes av Edge Function.
create or replace function request_student_verification(p_edu_email text)
returns void language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid    uuid := auth.uid();
  v_email  text := lower(trim(p_edu_email));
  v_inst   int;
  v_cur    student_verifications;
begin
  if v_uid is null then
    raise exception 'Du må være logget inn' using errcode = '28000';
  end if;

  select id into v_inst from institutions
  where is_active and split_part(v_email, '@', 2) = any (email_domains);
  if v_inst is null then
    raise exception 'Vi kjenner ikke igjen skolen til denne e-postadressen';
  end if;

  if exists (
    select 1 from student_verifications
    where lower(edu_email) = v_email and status = 'verified' and user_id <> v_uid
  ) then
    raise exception 'Denne e-postadressen er allerede brukt av en annen konto';
  end if;

  select * into v_cur from student_verifications where user_id = v_uid;
  if found and v_cur.status = 'verified' and v_cur.expires_at > now() + interval '30 days' then
    raise exception 'Du er allerede verifisert';
  end if;

  insert into student_verifications
    (user_id, institution_id, edu_email, status, verification_token, token_expires_at)
  values
    (v_uid, v_inst, v_email, 'pending', encode(gen_random_bytes(16), 'hex'), now() + interval '1 day')
  on conflict (user_id) do update set
    institution_id     = excluded.institution_id,
    edu_email          = excluded.edu_email,
    -- ikke fjern eksisterende verifisering mens fornyelsen venter
    status             = case when student_verifications.status = 'verified'
                              and student_verifications.expires_at > now()
                              then 'verified'::verification_status
                              else 'pending'::verification_status end,
    verification_token = excluded.verification_token,
    token_expires_at   = excluded.token_expires_at;
end;
$$;

-- Steg 2: bruker bekrefter med token fra e-posten. Gyldig i ett år.
create or replace function verify_student(p_token text)
returns student_verifications language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_row student_verifications;
begin
  update student_verifications
     set status = 'verified',
         verified_at = now(),
         expires_at = now() + interval '1 year',
         verification_token = null,
         token_expires_at = null
   where user_id = auth.uid()
     and verification_token = p_token
     and token_expires_at > now()
  returning * into v_row;

  if not found then
    raise exception 'Ugyldig eller utløpt kode';
  end if;
  return v_row;
end;
$$;

-- ========== STATISTIKK FOR BEDRIFTSDASHBOARDET ==========

-- Per tilbud: visninger, klikk, favoritter, uthentet, innløst, konvertering
create or replace function business_deal_stats(
  p_business_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to   timestamptz default now()
)
returns table (
  deal_id uuid, title text, views bigint, clicks bigint, favorites bigint,
  issued bigint, redeemed bigint, conversion_rate numeric
)
language plpgsql stable security definer
set search_path = public, extensions as $$
#variable_conflict use_column
begin
  if not (is_business_member(p_business_id) or is_admin()) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  return query
  with s as (
    select
      d.id as deal_id,
      d.title as title,
      (select count(*) from analytics_events a
        where a.target_type = 'deal' and a.target_id = d.id
          and a.event_type = 'view' and a.created_at between p_from and p_to) as views,
      (select count(*) from analytics_events a
        where a.target_type = 'deal' and a.target_id = d.id
          and a.event_type = 'click' and a.created_at between p_from and p_to) as clicks,
      (select count(*) from favorites f
        where f.target_type = 'deal' and f.target_id = d.id
          and f.created_at between p_from and p_to) as favorites,
      (select count(*) from deal_redemptions r
        where r.deal_id = d.id and r.issued_at between p_from and p_to) as issued,
      (select count(*) from deal_redemptions r
        where r.deal_id = d.id and r.status = 'redeemed'
          and r.redeemed_at between p_from and p_to) as redeemed,
      d.created_at as created_at
    from deals d
    where d.business_id = p_business_id
  )
  select s.deal_id, s.title, s.views, s.clicks, s.favorites, s.issued, s.redeemed,
         case when s.views > 0 then round(s.redeemed::numeric / s.views, 4) end
  from s
  order by s.created_at desc;
end;
$$;

-- Per dag: visninger og innløsninger (norsk tid), til graf
create or replace function business_daily_stats(p_business_id uuid, p_days int default 30)
returns table (day date, views bigint, redeemed bigint)
language plpgsql stable security definer
set search_path = public, extensions as $$
#variable_conflict use_column
begin
  if not (is_business_member(p_business_id) or is_admin()) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  return query
  select g::date,
         coalesce(v.c, 0),
         coalesce(r.c, 0)
  from generate_series(
         (now() at time zone 'Europe/Oslo')::date - (greatest(p_days, 1) - 1),
         (now() at time zone 'Europe/Oslo')::date,
         interval '1 day') g
  left join (
    select (a.created_at at time zone 'Europe/Oslo')::date as d, count(*) as c
    from analytics_events a
    where a.business_id = p_business_id and a.event_type = 'view'
    group by 1
  ) v on v.d = g::date
  left join (
    select (x.redeemed_at at time zone 'Europe/Oslo')::date as d, count(*) as c
    from deal_redemptions x join deals dd on dd.id = x.deal_id
    where dd.business_id = p_business_id and x.status = 'redeemed'
    group by 1
  ) r on r.d = g::date
  order by 1;
end;
$$;
