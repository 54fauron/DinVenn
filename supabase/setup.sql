-- GENERERT av npm run db:bundle. Kun for en TOM database.
-- Alt kjøres i én transaksjon; feil ruller tilbake hele oppsettet.
begin;

-- FILE: 20261106000001_initial.sql
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;
-- DinVenn – databaseskjema for Supabase (PostgreSQL)
-- Kjør i Supabase -> SQL Editor

-- ========== ENUMS ==========
create type user_role        as enum ('user', 'business', 'admin');
create type business_status  as enum ('pending', 'approved', 'suspended');
create type member_role      as enum ('owner', 'editor');
create type discount_type    as enum ('percent', 'amount', 'freebie', 'other');
create type redeem_method    as enum ('show_screen', 'code', 'qr');
create type content_status   as enum ('draft', 'active', 'paused', 'expired');
create type redemption_state as enum ('issued', 'redeemed', 'expired');
create type favorite_target  as enum ('deal', 'event', 'business');
create type plan_type        as enum ('basic', 'plus');

-- ========== PROFILES ==========
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'user',
  display_name  text,
  avatar_url    text,
  birth_year    int,
  home_city     text,
  interests     text[] default '{}',
  created_at    timestamptz not null default now()
);

-- ========== CATEGORIES ==========
create table categories (
  id    serial primary key,
  name  text not null,
  slug  text not null unique,
  icon  text,
  color text
);

insert into categories (name, slug, icon, color) values
  ('Mat & Drikke', 'mat-drikke', 'coffee',   '#FFB38A'),
  ('Shopping',     'shopping',   'bag',      '#FF8A7A'),
  ('Aktiviteter',  'aktiviteter','sparkles', '#FFD98A'),
  ('Kultur',       'kultur',     'music',    '#B79CC9'),
  ('Skjønnhet',    'skjonnhet',  'heart',    '#F7B7C4'),
  ('Trening',      'trening',    'dumbbell', '#A9D6C0');

-- ========== BUSINESSES ==========
create table businesses (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references profiles(id),
  name         text not null,
  slug         text not null unique,
  description  text,
  category_id  int references categories(id),
  logo_url     text,
  cover_url    text,
  address      text,
  postal_code  text,
  city         text,
  lat          double precision,
  lng          double precision,
  phone        text,
  email        text,
  website      text,
  instagram    text,
  status       business_status not null default 'pending',
  is_featured  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on businesses (city, status);
create index on businesses (lat, lng);

create table business_members (
  business_id  uuid references businesses(id) on delete cascade,
  user_id      uuid references profiles(id) on delete cascade,
  member_role  member_role not null default 'editor',
  primary key (business_id, user_id)
);

create table business_images (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  image_url   text not null,
  sort_order  int default 0
);

create table opening_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  weekday     int not null check (weekday between 0 and 6), -- 0 = mandag
  opens_at    time,
  closes_at   time,
  is_closed   boolean not null default false,
  unique (business_id, weekday)
);

-- ========== DEALS (VENNEPRISER) ==========
create table deals (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  title            text not null,
  description      text,
  image_url        text,
  discount_type    discount_type not null default 'percent',
  discount_value   numeric,
  redeem_method    redeem_method not null default 'qr',
  promo_code       text,
  starts_at        timestamptz not null default now(),
  ends_at          timestamptz,
  max_redemptions  int,
  max_per_user     int not null default 1,
  terms            text,
  status           content_status not null default 'draft',
  created_at       timestamptz not null default now()
);
create index on deals (status, ends_at);

create table deal_redemptions (
  id           uuid primary key default gen_random_uuid(),
  deal_id      uuid not null references deals(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  token        text not null unique default encode(gen_random_bytes(12), 'hex'),
  status       redemption_state not null default 'issued',
  issued_at    timestamptz not null default now(),
  redeemed_at  timestamptz
);

-- ========== EVENTS ==========
create table events (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  title         text not null,
  description   text,
  image_url     text,
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location_text text,
  lat           double precision,
  lng           double precision,
  price_text    text default 'Gratis',
  ticket_url    text,
  status        content_status not null default 'draft',
  created_at    timestamptz not null default now()
);
create index on events (status, starts_at);

-- ========== NEWS ==========
create table news_posts (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  title        text not null,
  body         text,
  image_url    text,
  status       content_status not null default 'draft',
  published_at timestamptz not null default now()
);

-- ========== FAVORITES ==========
create table favorites (
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type favorite_target not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

-- ========== SUBSCRIPTIONS ==========
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null unique references businesses(id) on delete cascade,
  plan                    plan_type not null default 'basic',
  status                  text not null default 'trialing',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  current_period_end      timestamptz
);

-- ========== HJELPEFUNKSJON ==========
create or replace function is_business_member(b_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from business_members
    where business_id = b_id and user_id = auth.uid()
  );
$$;

-- ========== ROW LEVEL SECURITY (eksempler) ==========
alter table profiles          enable row level security;
alter table businesses        enable row level security;
alter table deals             enable row level security;
alter table events            enable row level security;
alter table news_posts        enable row level security;
alter table favorites         enable row level security;
alter table deal_redemptions  enable row level security;

-- Profiler: kun egen
create policy "egen profil" on profiles
  for all using (id = auth.uid());

-- Bedrifter: alle ser godkjente, medlemmer ser/endrer egne
create policy "les godkjente bedrifter" on businesses
  for select using (status = 'approved' or is_business_member(id));
create policy "endre egen bedrift" on businesses
  for update using (is_business_member(id));
create policy "opprette bedrift" on businesses
  for insert with check (owner_id = auth.uid());

-- Deals
create policy "les aktive deals" on deals
  for select using (status = 'active' or is_business_member(business_id));
create policy "administrer egne deals" on deals
  for all using (is_business_member(business_id));

-- Events
create policy "les aktive events" on events
  for select using (status = 'active' or is_business_member(business_id));
create policy "administrer egne events" on events
  for all using (is_business_member(business_id));

-- News
create policy "les aktive nyheter" on news_posts
  for select using (status = 'active' or is_business_member(business_id));
create policy "administrer egne nyheter" on news_posts
  for all using (is_business_member(business_id));

-- Favoritter og innløsninger: kun egne
create policy "egne favoritter" on favorites
  for all using (user_id = auth.uid());
create policy "egne innløsninger" on deal_redemptions
  for select using (user_id = auth.uid());
create policy "hent innløsning" on deal_redemptions
  for insert with check (user_id = auth.uid());

-- TODO: funksjon redeem_deal(token) som bedriften kaller etter QR-skanning:
--   sjekker at token tilhører en deal bedriften eier, status = 'issued',
--   deal ikke utløpt, og setter status = 'redeemed', redeemed_at = now().


-- FILE: 20261106000002_initial_v2_01_hardening.sql
set search_path = public, extensions;
-- DinVenn – schema v2, fil 1 av 5: sikkerhetsfikser og hjelpefunksjoner
-- Kjør ETTER schema.sql. Kjør filene i rekkefølge 01 -> 05.
--
-- Denne filen retter hull i schema.sql:
--  * brukere kunne sette sin egen rolle til 'admin'
--  * bedriftsmedlemmer kunne godkjenne sin egen bedrift (status/is_featured)
--  * business_members, business_images, opening_hours, categories og
--    subscriptions (med Stripe-IDer) manglet RLS
--  * brukere kunne opprette innløsninger som allerede var 'redeemed'
--  * eier ble aldri lagt til i business_members
--  * deals/events/nyheter fra ikke-godkjente bedrifter var synlige

-- ========== HJELPEFUNKSJONER ==========

-- Sant når skrivingen kommer direkte fra appen (PostgREST kjører som
-- 'authenticated'/'anon'). Inne i SECURITY DEFINER-funksjoner og for
-- service_role er dette false. Brukes av vaktene (triggerne) under.
create or replace function is_client_write()
returns boolean language sql stable as $$
  select current_user in ('authenticated', 'anon');
$$;

create or replace function is_admin()
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Erstatter versjonen i schema.sql (samme signatur, men med fast search_path)
create or replace function is_business_member(b_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from business_members
    where business_id = b_id and user_id = auth.uid()
  );
$$;

create or replace function is_business_owner(b_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from business_members
    where business_id = b_id and user_id = auth.uid() and member_role = 'owner'
  );
$$;

-- ========== PROFILES ==========

-- Vennekode: deles med venner i stedet for et søkbart brukerregister
alter table profiles
  add column if not exists friend_code text unique
    default upper(encode(gen_random_bytes(4), 'hex'));

-- Opprett profil automatisk når en bruker registrerer seg
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Ingen kan gjøre seg selv til admin fra appen
create or replace function guard_profile_role()
returns trigger language plpgsql as $$
begin
  if is_client_write() and not is_admin() then
    if tg_op = 'INSERT' and new.role = 'admin' then
      raise exception 'Du kan ikke opprette en admin-profil' using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.role = 'admin' and old.role is distinct from 'admin' then
      raise exception 'Du kan ikke gjøre deg selv til admin' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on profiles;
create trigger guard_profile_role
  before insert or update on profiles
  for each row execute function guard_profile_role();

-- ========== BUSINESSES ==========

-- Forhåndsutfylte profiler uten eier (admin oppretter, bedriften "claimer")
alter table businesses alter column owner_id drop not null;
alter table businesses add column if not exists is_claimed boolean not null default true;
alter table businesses add constraint businesses_unclaimed_has_no_owner
  check (is_claimed or owner_id is null);

-- Bedriften får ikke endre status, fremheving, eier eller claim-felt selv
create or replace function guard_business_columns()
returns trigger language plpgsql as $$
begin
  if is_client_write() and not is_admin() then
    if tg_op = 'INSERT' then
      new.status      := 'pending';
      new.is_featured := false;
      new.is_claimed  := true;
    elsif new.status      is distinct from old.status
       or new.is_featured is distinct from old.is_featured
       or new.owner_id    is distinct from old.owner_id
       or new.is_claimed  is distinct from old.is_claimed then
      raise exception 'Kun admin kan endre status, fremheving eller eier'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_business_columns on businesses;
create trigger guard_business_columns
  before insert or update on businesses
  for each row execute function guard_business_columns();

-- Ny bedrift: eieren blir medlem, og abonnement (prøveperiode) opprettes
create or replace function on_business_created()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if new.owner_id is not null then
    insert into business_members (business_id, user_id, member_role)
    values (new.id, new.owner_id, 'owner')
    on conflict do nothing;
  end if;
  insert into subscriptions (business_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_business_created on businesses;
create trigger on_business_created
  after insert on businesses
  for each row execute function on_business_created();

-- Eieren må kunne lese bedriften rett etter insert (INSERT ... RETURNING sjekker
-- lesepolicyen før on_business_created har lagt eieren til i business_members)
create policy "eier leser egen bedrift" on businesses
  for select using (owner_id = auth.uid());

-- Admin kan se, opprette og endre alle bedrifter
create policy "admin leser bedrifter" on businesses
  for select using (is_admin());
create policy "admin oppretter bedrifter" on businesses
  for insert with check (is_admin());
create policy "admin endrer bedrifter" on businesses
  for update using (is_admin());

-- ========== SYNLIGHET: KUN GODKJENTE BEDRIFTER ==========
-- (underspørringen mot businesses følger RLS, så godkjent/medlem gjelder)
drop policy "les aktive deals" on deals;
create policy "les aktive deals" on deals
  for select using (
    is_business_member(business_id)
    or (status = 'active'
        and exists (select 1 from businesses b where b.id = business_id))
  );

drop policy "les aktive events" on events;
create policy "les aktive events" on events
  for select using (
    is_business_member(business_id)
    or (status = 'active'
        and exists (select 1 from businesses b where b.id = business_id))
  );

drop policy "les aktive nyheter" on news_posts;
create policy "les aktive nyheter" on news_posts
  for select using (
    is_business_member(business_id)
    or (status = 'active'
        and exists (select 1 from businesses b where b.id = business_id))
  );

-- ========== RLS PÅ TABELLER SOM MANGLET DET ==========
alter table business_members enable row level security;
alter table business_images  enable row level security;
alter table opening_hours    enable row level security;
alter table categories       enable row level security;
alter table subscriptions    enable row level security;

-- business_members: medlemmer ser kolleger, eier styrer medlemmer
create policy "se kolleger" on business_members
  for select using (is_business_member(business_id) or is_admin());
create policy "eier legger til medlemmer" on business_members
  for insert with check (is_business_owner(business_id));
create policy "eier fjerner redaktører" on business_members
  for delete using (is_business_owner(business_id) and member_role = 'editor');

-- business_images / opening_hours: alle ser det som hører til synlige bedrifter
create policy "les bilder" on business_images
  for select using (exists (select 1 from businesses b where b.id = business_id));
create policy "administrer bilder" on business_images
  for all using (is_business_member(business_id));

create policy "les åpningstider" on opening_hours
  for select using (exists (select 1 from businesses b where b.id = business_id));
create policy "administrer åpningstider" on opening_hours
  for all using (is_business_member(business_id));

-- categories: alle leser, admin skriver
create policy "les kategorier" on categories for select using (true);
create policy "admin kategorier" on categories for all using (is_admin());

-- subscriptions: bare medlemmer leser. Skriving gjøres av Stripe-webhook
-- (service_role), aldri fra appen.
create policy "les eget abonnement" on subscriptions
  for select using (is_business_member(business_id) or is_admin());

-- ========== INNLØSNINGER ==========
-- Brukere kan ikke lenger sette inn rader selv. Bruk claim_deal() (fil 2).
drop policy "hent innløsning" on deal_redemptions;

create policy "bedrift ser innløsninger" on deal_redemptions
  for select using (
    exists (
      select 1 from deals d
      where d.id = deal_id and is_business_member(d.business_id)
    )
  );

create index if not exists deal_redemptions_user_idx
  on deal_redemptions (user_id, status);
create index if not exists deal_redemptions_deal_idx
  on deal_redemptions (deal_id, status);


-- FILE: 20261106000003_initial_v2_02_analytics_deals.sql
set search_path = public, extensions;
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


-- FILE: 20261106000004_initial_v2_03_notifications_loyalty.sql
set search_path = public, extensions;
-- DinVenn – schema v2, fil 3 av 5: varsler, poeng/merker og lojalitet
-- Kjør etter schema-v2-02-analytics-deals.sql

-- ========== ENUMS ==========
create type notification_type as enum (
  'new_deal', 'flash_deal', 'new_event', 'new_news',
  'friend_request', 'friend_accepted', 'deal_shared',
  'badge', 'reward_ready', 'review_reply', 'system'
);

-- ========== VARSLER ==========
create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  type         notification_type not null,
  title        text not null,
  body         text,
  target_type  text,        -- 'deal', 'event', 'business', 'friendship' ...
  target_id    uuid,
  data         jsonb not null default '{}',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);
create index on notifications (user_id) where read_at is null;

alter table notifications enable row level security;
create policy "egne varsler" on notifications
  for select using (user_id = auth.uid());
create policy "marker egne varsler" on notifications
  for update using (user_id = auth.uid());
create policy "slett egne varsler" on notifications
  for delete using (user_id = auth.uid());
-- Appen kan bare sette read_at. Nye varsler lages av databasefunksjoner.
revoke update on notifications from anon, authenticated;
grant update (read_at) on notifications to authenticated;

-- Brukerens ønsker. Ingen rad = alt på. notify_lat/lng er et område brukeren
-- selv velger (f.eks. "der jeg bor"), ikke sporing av posisjon.
-- Stille timer (quiet_start/end) håndteres av Edge Function som sender push.
create table notification_preferences (
  user_id          uuid primary key references profiles(id) on delete cascade,
  push_enabled     boolean not null default true,
  pref_deals       boolean not null default true,
  pref_flash_deals boolean not null default true,
  pref_events      boolean not null default true,
  pref_news        boolean not null default true,
  pref_friends     boolean not null default true,
  flash_radius_m   int not null default 2000 check (flash_radius_m between 100 and 50000),
  notify_lat       double precision,
  notify_lng       double precision,
  category_ids     int[] not null default '{}',  -- tom = alle kategorier
  quiet_start      time not null default '22:00',
  quiet_end        time not null default '08:00',
  updated_at       timestamptz not null default now()
);
alter table notification_preferences enable row level security;
create policy "egne varselvalg" on notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- En rad per enhet som skal få push (Firebase Cloud Messaging)
create table push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  token        text not null unique,
  platform     text not null check (platform in ('ios', 'android', 'web')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index on push_tokens (user_id);
alter table push_tokens enable row level security;
create policy "egne push-tokens" on push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Avstand i meter mellom to punkter (haversine, uten PostGIS)
create or replace function distance_m(lat1 double precision, lng1 double precision,
                                      lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Vil brukeren ha denne typen varsel?
create or replace function notification_allowed(p_user uuid, p_type notification_type)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select coalesce((
    select case p_type
      when 'new_deal'        then pref_deals
      when 'flash_deal'      then pref_flash_deals
      when 'new_event'       then pref_events
      when 'new_news'        then pref_news
      when 'friend_request'  then pref_friends
      when 'friend_accepted' then pref_friends
      when 'deal_shared'     then pref_friends
      else true
    end
    from notification_preferences where user_id = p_user
  ), true);
$$;

-- Intern: lag et varsel hvis brukeren vil ha det
create or replace function push_notification(
  p_user uuid, p_type notification_type, p_title text, p_body text default null,
  p_target_type text default null, p_target_id uuid default null,
  p_data jsonb default '{}'
) returns void language plpgsql security definer
set search_path = public, extensions as $$
begin
  if notification_allowed(p_user, p_type) then
    insert into notifications (user_id, type, title, body, target_type, target_id, data)
    values (p_user, p_type, p_title, p_body, p_target_type, p_target_id, coalesce(p_data, '{}'));
  end if;
end;
$$;

-- ========== POENG OG MERKER ==========
create table point_ledger (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  points      int not null,
  reason      text not null,
  ref_type    text,
  ref_id      uuid,
  created_at  timestamptz not null default now()
);
create index on point_ledger (user_id, created_at desc);

alter table point_ledger enable row level security;
create policy "egne poeng" on point_ledger for select using (user_id = auth.uid());

create view my_points with (security_invoker = true) as
  select user_id, sum(points)::int as total
  from point_ledger group by user_id;

create table badges (
  id           serial primary key,
  slug         text not null unique,
  name         text not null,
  description  text,
  icon         text
);
alter table badges enable row level security;
create policy "les merker" on badges for select using (true);
create policy "admin styrer merker" on badges for all using (is_admin());

insert into badges (slug, name, description, icon) values
  ('first_redeem', 'Første vennepris', 'Løste inn din første vennepris',            'star'),
  ('explorer',     'Utforsker',        'Løste inn tilbud hos 5 ulike steder',        'compass'),
  ('regular',      'Stamgjest',        'Fullførte et lojalitetskort',                'heart'),
  ('connector',    'Vennebud',         'Tre venner har brukt tilbud du delte',       'users');

create table user_badges (
  user_id    uuid not null references profiles(id) on delete cascade,
  badge_id   int  not null references badges(id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table user_badges enable row level security;
create policy "egne merker" on user_badges for select using (user_id = auth.uid());

create or replace function award_points(
  p_user uuid, p_points int, p_reason text,
  p_ref_type text default null, p_ref_id uuid default null
) returns void language sql security definer
set search_path = public, extensions as $$
  insert into point_ledger (user_id, points, reason, ref_type, ref_id)
  values (p_user, p_points, p_reason, p_ref_type, p_ref_id);
$$;

-- Deler ut merker brukeren har fortjent, og varsler om nye
create or replace function award_badges(p_user uuid)
returns void language plpgsql security definer
set search_path = public, extensions as $$
begin
  with new_badges as (
    insert into user_badges (user_id, badge_id)
    select p_user, b.id
    from badges b
    where
      (b.slug = 'first_redeem' and exists (
        select 1 from deal_redemptions r
        where r.user_id = p_user and r.status = 'redeemed'))
      or (b.slug = 'explorer' and (
        select count(distinct d.business_id)
        from deal_redemptions r join deals d on d.id = r.deal_id
        where r.user_id = p_user and r.status = 'redeemed') >= 5)
      or (b.slug = 'regular' and exists (
        select 1 from loyalty_cards c
        where c.user_id = p_user and c.completed_at is not null))
      or (b.slug = 'connector' and (
        select count(*) from shared_deals s
        where s.from_user_id = p_user and s.rewarded_at is not null) >= 3)
    on conflict do nothing
    returning badge_id
  )
  insert into notifications (user_id, type, title, body, target_type, data)
  select p_user, 'badge', 'Nytt merke: ' || b.name, b.description, 'badge',
         jsonb_build_object('badge_slug', b.slug)
  from new_badges n join badges b on b.id = n.badge_id;
end;
$$;

-- ========== LOJALITET (STEMPELKORT) ==========
create table loyalty_programs (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references businesses(id) on delete cascade,
  title                   text not null,           -- "Kaffekortet"
  description             text,
  stamps_required         int not null default 6 check (stamps_required between 2 and 30),
  reward_text             text not null,           -- "Gratis kaffe"
  stamp_cooldown_minutes  int not null default 60 check (stamp_cooldown_minutes >= 0),
  status                  content_status not null default 'draft',
  created_at              timestamptz not null default now()
);
create index on loyalty_programs (business_id, status);

create table loyalty_cards (
  id                uuid primary key default gen_random_uuid(),
  program_id        uuid not null references loyalty_programs(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  token             text not null unique default encode(gen_random_bytes(12), 'hex'),
  stamps            int not null default 0,
  completed_at      timestamptz,
  reward_claimed_at timestamptz,
  created_at        timestamptz not null default now()
);
-- Ett åpent kort per bruker og program
create unique index on loyalty_cards (program_id, user_id) where reward_claimed_at is null;
create index on loyalty_cards (user_id);

create table loyalty_stamps (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references loyalty_cards(id) on delete cascade,
  stamped_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on loyalty_stamps (card_id, created_at desc);

create or replace function is_program_member(p_program_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from loyalty_programs p
    where p.id = p_program_id and is_business_member(p.business_id)
  );
$$;

alter table loyalty_programs enable row level security;
alter table loyalty_cards    enable row level security;
alter table loyalty_stamps   enable row level security;

create policy "les lojalitetsprogram" on loyalty_programs
  for select using (
    is_business_member(business_id)
    or (status = 'active' and exists (select 1 from businesses b where b.id = business_id))
  );
create policy "administrer lojalitetsprogram" on loyalty_programs
  for all using (is_business_member(business_id));

create policy "les kort" on loyalty_cards
  for select using (user_id = auth.uid() or is_program_member(program_id));
create policy "les stempler" on loyalty_stamps
  for select using (exists (select 1 from loyalty_cards c where c.id = card_id));

-- Bruker starter et kort (eller får det åpne kortet de allerede har)
create or replace function join_loyalty_program(p_program_id uuid)
returns loyalty_cards language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid  uuid := auth.uid();
  v_card loyalty_cards;
begin
  if v_uid is null then
    raise exception 'Du må være logget inn' using errcode = '28000';
  end if;

  if not exists (
    select 1 from loyalty_programs p join businesses b on b.id = p.business_id
    where p.id = p_program_id and p.status = 'active' and b.status = 'approved'
  ) then
    raise exception 'Lojalitetsprogrammet er ikke tilgjengelig';
  end if;

  select * into v_card from loyalty_cards
  where program_id = p_program_id and user_id = v_uid and reward_claimed_at is null;
  if found then return v_card; end if;

  insert into loyalty_cards (program_id, user_id) values (p_program_id, v_uid)
  returning * into v_card;
  return v_card;
end;
$$;

-- Bedriften skanner kundens kort-QR og gir ett stempel
create or replace function add_stamp(p_card_token text)
returns loyalty_cards language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_card loyalty_cards;
  v_prog loyalty_programs;
  v_last timestamptz;
begin
  select * into v_card from loyalty_cards where token = p_card_token for update;
  if not found then
    raise exception 'Ugyldig kort';
  end if;

  select * into v_prog from loyalty_programs where id = v_card.program_id;
  if not is_business_member(v_prog.business_id) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  if v_prog.status <> 'active' then
    raise exception 'Programmet er ikke aktivt';
  end if;
  if v_card.completed_at is not null then
    raise exception 'Kortet er fullt. Løs inn belønningen først';
  end if;

  select max(created_at) into v_last from loyalty_stamps where card_id = v_card.id;
  if v_last is not null
     and v_last > now() - make_interval(mins => v_prog.stamp_cooldown_minutes) then
    raise exception 'Kortet er stemplet for nylig. Prøv igjen senere';
  end if;

  insert into loyalty_stamps (card_id, stamped_by) values (v_card.id, auth.uid());

  update loyalty_cards
     set stamps = stamps + 1,
         completed_at = case when stamps + 1 >= v_prog.stamps_required then now() end
   where id = v_card.id
  returning * into v_card;

  perform award_points(v_card.user_id, 5, 'Stempel hos ' || v_prog.title,
                       'loyalty_program', v_prog.id);

  if v_card.completed_at is not null then
    perform award_points(v_card.user_id, 25, 'Fullførte ' || v_prog.title,
                         'loyalty_program', v_prog.id);
    perform push_notification(v_card.user_id, 'reward_ready',
                              'Kortet er fullt!', 'Vis kortet og hent: ' || v_prog.reward_text,
                              'loyalty_card', v_card.id);
    perform award_badges(v_card.user_id);
  end if;

  return v_card;
end;
$$;

-- Bedriften skanner fullt kort og gir belønningen
create or replace function claim_loyalty_reward(p_card_token text)
returns loyalty_cards language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_card loyalty_cards;
  v_prog loyalty_programs;
begin
  select * into v_card from loyalty_cards where token = p_card_token for update;
  if not found then
    raise exception 'Ugyldig kort';
  end if;

  select * into v_prog from loyalty_programs where id = v_card.program_id;
  if not is_business_member(v_prog.business_id) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  if v_card.completed_at is null then
    raise exception 'Kortet er ikke fullt ennå';
  end if;
  if v_card.reward_claimed_at is not null then
    raise exception 'Belønningen er allerede hentet';
  end if;

  update loyalty_cards set reward_claimed_at = now()
  where id = v_card.id returning * into v_card;
  return v_card;
end;
$$;


-- FILE: 20261106000005_initial_v2_04_social_redeem.sql
set search_path = public, extensions;
-- DinVenn – schema v2, fil 4 av 5: sosialt, anmeldelser, innløsning og kundestatistikk
-- Kjør etter schema-v2-03-notifications-loyalty.sql

-- ========== ENUMS ==========
create type friendship_status as enum ('pending', 'accepted');
create type review_status     as enum ('published', 'hidden');

-- ========== VENNER ==========
-- Man legger til venner med vennekode (profiles.friend_code), ikke via et
-- søkbart brukerregister. Det er tryggere for ungdom.
create table friendships (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        friendship_status not null default 'pending',
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  check (requester_id <> addressee_id)
);
-- Ett vennskap per par, uansett hvem som spurte først
create unique index on friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
create index on friendships (addressee_id, status);

alter table friendships enable row level security;
create policy "se egne vennskap" on friendships
  for select using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "avslutt vennskap" on friendships
  for delete using (requester_id = auth.uid() or addressee_id = auth.uid());
-- Insert/update kun via send_friend_request / respond_friend_request

create or replace function are_friends(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

create or replace function send_friend_request(p_friend_code text)
returns friendships language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_name   text;
  f        friendships;
begin
  if v_uid is null then
    raise exception 'Du må være logget inn' using errcode = '28000';
  end if;

  select id into v_target from profiles where friend_code = upper(trim(p_friend_code));
  if v_target is null then
    raise exception 'Fant ingen med den vennekoden';
  end if;
  if v_target = v_uid then
    raise exception 'Du kan ikke legge til deg selv';
  end if;

  select display_name into v_name from profiles where id = v_uid;

  select * into f from friendships
  where least(requester_id, addressee_id) = least(v_uid, v_target)
    and greatest(requester_id, addressee_id) = greatest(v_uid, v_target);

  if found then
    if f.status = 'accepted' then
      raise exception 'Dere er allerede venner';
    elsif f.requester_id = v_uid then
      raise exception 'Forespørselen er allerede sendt';
    end if;
    -- Den andre har allerede spurt deg: godta automatisk
    update friendships set status = 'accepted', responded_at = now()
    where id = f.id returning * into f;
    perform push_notification(v_target, 'friend_accepted',
      coalesce(v_name, 'Noen') || ' er nå vennen din', null, 'friendship', f.id);
    return f;
  end if;

  insert into friendships (requester_id, addressee_id) values (v_uid, v_target)
  returning * into f;
  perform push_notification(v_target, 'friend_request',
    coalesce(v_name, 'Noen') || ' vil bli venn med deg', null, 'friendship', f.id);
  return f;
end;
$$;

create or replace function respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns friendships language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  f      friendships;
begin
  select * into f from friendships
  where id = p_friendship_id and addressee_id = v_uid and status = 'pending';
  if not found then
    raise exception 'Fant ingen forespørsel å svare på';
  end if;

  if not p_accept then
    delete from friendships where id = f.id;
    return null;
  end if;

  update friendships set status = 'accepted', responded_at = now()
  where id = f.id returning * into f;
  select display_name into v_name from profiles where id = v_uid;
  perform push_notification(f.requester_id, 'friend_accepted',
    coalesce(v_name, 'Noen') || ' godtok vennforespørselen din', null, 'friendship', f.id);
  return f;
end;
$$;

-- Navn og bilde vises bare for deg selv, venner (og ventende forespørsler)
-- og de som har skrevet en offentlig anmeldelse. Resten av profilen er privat.
-- (Opprettes etter reviews-tabellen under.)

-- ========== DELING AV TILBUD ==========
create table shared_deals (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references deals(id) on delete cascade,
  from_user_id  uuid not null references profiles(id) on delete cascade,
  to_user_id    uuid not null references profiles(id) on delete cascade,
  message       text check (char_length(message) <= 200),
  created_at    timestamptz not null default now(),
  seen_at       timestamptz,
  rewarded_at   timestamptz,   -- satt når mottakeren løser inn (bonus til begge)
  check (from_user_id <> to_user_id),
  unique (deal_id, from_user_id, to_user_id)
);
create index on shared_deals (to_user_id, created_at desc);

alter table shared_deals enable row level security;
create policy "se delinger" on shared_deals
  for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
create policy "marker sett" on shared_deals
  for update using (to_user_id = auth.uid());
revoke update on shared_deals from anon, authenticated;
grant update (seen_at) on shared_deals to authenticated;

alter table deal_redemptions
  add column shared_deal_id uuid references shared_deals(id) on delete set null;

create or replace function share_deal(p_deal_id uuid, p_to_user uuid, p_message text default null)
returns shared_deals language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_deal deals;
  s      shared_deals;
begin
  if v_uid is null then
    raise exception 'Du må være logget inn' using errcode = '28000';
  end if;
  if not are_friends(v_uid, p_to_user) then
    raise exception 'Du kan bare dele med venner';
  end if;

  select d.* into v_deal from deals d
  join businesses b on b.id = d.business_id and b.status = 'approved'
  where d.id = p_deal_id and d.status = 'active';
  if not found then
    raise exception 'Tilbudet er ikke tilgjengelig';
  end if;

  insert into shared_deals (deal_id, from_user_id, to_user_id, message)
  values (p_deal_id, v_uid, p_to_user, p_message)
  on conflict (deal_id, from_user_id, to_user_id) do update set message = excluded.message
  returning * into s;

  select display_name into v_name from profiles where id = v_uid;
  perform push_notification(p_to_user, 'deal_shared',
    coalesce(v_name, 'En venn') || ' delte et tilbud med deg', v_deal.title,
    'deal', v_deal.id, jsonb_build_object('shared_deal_id', s.id));

  insert into analytics_events (business_id, target_type, target_id, event_type, user_id)
  values (v_deal.business_id, 'deal', v_deal.id, 'share', v_uid);
  return s;
end;
$$;

-- ========== REFERRALS (INVITER BRUKERE OG BEDRIFTER) ==========
create table referrals (
  id                    uuid primary key default gen_random_uuid(),
  referrer_id           uuid not null references profiles(id) on delete cascade,
  referred_user_id      uuid unique references profiles(id) on delete cascade,
  referred_business_id  uuid unique references businesses(id) on delete cascade,
  created_at            timestamptz not null default now(),
  rewarded_at           timestamptz,
  check (num_nonnulls(referred_user_id, referred_business_id) = 1)
);
create index on referrals (referrer_id);

alter table referrals enable row level security;
create policy "se egne referrals" on referrals
  for select using (referrer_id = auth.uid() or referred_user_id = auth.uid());

-- Ny bruker legger inn vennekoden til den som inviterte (maks 7 dager etter registrering)
create or replace function apply_referral(p_code text)
returns referrals language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid      uuid := auth.uid();
  v_referrer uuid;
  r          referrals;
begin
  if v_uid is null then
    raise exception 'Du må være logget inn' using errcode = '28000';
  end if;
  if not exists (select 1 from profiles where id = v_uid and created_at > now() - interval '7 days') then
    raise exception 'Invitasjonskoder kan bare brukes den første uken';
  end if;
  if exists (select 1 from referrals where referred_user_id = v_uid) then
    raise exception 'Du har allerede brukt en invitasjonskode';
  end if;

  select id into v_referrer from profiles where friend_code = upper(trim(p_code));
  if v_referrer is null or v_referrer = v_uid then
    raise exception 'Ugyldig invitasjonskode';
  end if;

  insert into referrals (referrer_id, referred_user_id) values (v_referrer, v_uid)
  returning * into r;
  return r;
end;
$$;

-- Bedrift oppgir hvem som tipset dem. Belønning gis når admin godkjenner bedriften.
create or replace function apply_business_referral(p_business_id uuid, p_code text)
returns referrals language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_referrer uuid;
  r          referrals;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;
  select id into v_referrer from profiles where friend_code = upper(trim(p_code));
  if v_referrer is null or is_business_member_of(p_business_id, v_referrer) then
    raise exception 'Ugyldig invitasjonskode';
  end if;
  if exists (select 1 from referrals where referred_business_id = p_business_id) then
    raise exception 'Bedriften har allerede registrert en invitasjon';
  end if;

  insert into referrals (referrer_id, referred_business_id) values (v_referrer, p_business_id)
  returning * into r;
  return r;
end;
$$;

create or replace function is_business_member_of(b_id uuid, p_user uuid)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (select 1 from business_members where business_id = b_id and user_id = p_user);
$$;

create or replace function reward_business_referral()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_referrer uuid;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update referrals set rewarded_at = now()
    where referred_business_id = new.id and rewarded_at is null
    returning referrer_id into v_referrer;
    if found then
      perform award_points(v_referrer, 100, 'Tipset en bedrift som ble med: ' || new.name,
                           'business', new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger reward_business_referral
  after update of status on businesses
  for each row execute function reward_business_referral();

-- ========== FØLGER (FÅR VARSLER) ==========
-- favorites = bokmerke. follows = vil ha varsler om nye tilbud/arrangementer/nyheter.
create table follows (
  user_id      uuid not null references profiles(id) on delete cascade,
  business_id  uuid not null references businesses(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, business_id)
);
create index on follows (business_id);

alter table follows enable row level security;
create policy "egne følger" on follows
  for select using (user_id = auth.uid());
create policy "følg bedrift" on follows
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from businesses b where b.id = business_id)
  );
create policy "slutt å følge" on follows
  for delete using (user_id = auth.uid());

-- ========== ANMELDELSER ==========
-- Kun de som har vært der (innløst et tilbud eller fått stempel) kan anmelde.
create table reviews (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  comment        text check (char_length(comment) <= 1000),
  status         review_status not null default 'published',
  business_reply text check (char_length(business_reply) <= 1000),
  replied_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, user_id)
);
create index on reviews (business_id, status, created_at desc);

create or replace function has_visited_business(p_business_id uuid)
returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select exists (
    select 1 from deal_redemptions r join deals d on d.id = r.deal_id
    where r.user_id = auth.uid() and r.status = 'redeemed' and d.business_id = p_business_id
  ) or exists (
    select 1 from loyalty_cards c join loyalty_programs p on p.id = c.program_id
    where c.user_id = auth.uid() and c.stamps > 0 and p.business_id = p_business_id
  );
$$;

alter table reviews enable row level security;
create policy "les anmeldelser" on reviews
  for select using (
    status = 'published' or user_id = auth.uid()
    or is_business_member(business_id) or is_admin()
  );
create policy "skriv anmeldelse" on reviews
  for insert with check (
    user_id = auth.uid() and status = 'published' and business_reply is null
    and has_visited_business(business_id)
  );
create policy "endre egen anmeldelse" on reviews
  for update using (user_id = auth.uid());
create policy "slett egen anmeldelse" on reviews
  for delete using (user_id = auth.uid());
create policy "admin modererer anmeldelser" on reviews
  for update using (is_admin());

-- Brukeren kan bare endre rating og kommentar. Svar og status styres ellers.
create or replace function guard_review_columns()
returns trigger language plpgsql as $$
begin
  if is_client_write() and not is_admin() then
    new.business_id    := old.business_id;
    new.user_id        := old.user_id;
    new.status         := old.status;
    new.business_reply := old.business_reply;
    new.replied_at     := old.replied_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_review_columns
  before update on reviews
  for each row execute function guard_review_columns();

create or replace function reply_to_review(p_review_id uuid, p_reply text)
returns reviews language plpgsql security definer
set search_path = public, extensions as $$
declare
  rv reviews;
  v_name text;
begin
  select * into rv from reviews where id = p_review_id;
  if not found or not is_business_member(rv.business_id) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  update reviews set business_reply = nullif(trim(p_reply), ''), replied_at = now()
  where id = p_review_id returning * into rv;

  select name into v_name from businesses where id = rv.business_id;
  perform push_notification(rv.user_id, 'review_reply',
    coalesce(v_name, 'Bedriften') || ' svarte på anmeldelsen din', null,
    'business', rv.business_id);
  return rv;
end;
$$;

create view business_ratings as
  select business_id,
         round(avg(rating)::numeric, 2) as avg_rating,
         count(*)                       as review_count
  from reviews where status = 'published'
  group by business_id;

-- Trygg visning av navn/bilde for andre brukere
create view public_profiles as
  select p.id, p.display_name, p.avatar_url
  from profiles p
  where p.id = auth.uid()
     or exists (select 1 from friendships f
                where (f.requester_id = auth.uid() and f.addressee_id = p.id)
                   or (f.addressee_id = auth.uid() and f.requester_id = p.id))
     or exists (select 1 from reviews r where r.user_id = p.id and r.status = 'published');
revoke all on public_profiles from anon;
grant select on public_profiles to authenticated;

-- ========== TA I BRUK OG LØS INN TILBUD ==========

-- Bruker henter en vennepris og får en QR-kode (token). Sjekker alle regler.
create or replace function claim_deal(p_deal_id uuid, p_shared_deal_id uuid default null)
returns deal_redemptions language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  d       deals;
  r       deal_redemptions;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Du må være logget inn' using errcode = '28000';
  end if;

  -- Lås tilbudet så to samtidige henting ikke går over grensen
  select * into d from deals where id = p_deal_id for update;
  if not found
     or d.status <> 'active'
     or d.starts_at > now()
     or (d.ends_at is not null and d.ends_at <= now())
     or not exists (select 1 from businesses b where b.id = d.business_id and b.status = 'approved')
  then
    raise exception 'Tilbudet er ikke tilgjengelig';
  end if;

  if d.student_only and not is_verified_student(v_uid) then
    raise exception 'Dette tilbudet er kun for verifiserte studenter';
  end if;

  -- Har du allerede en gyldig kode, får du den samme igjen
  select * into r from deal_redemptions
  where deal_id = d.id and user_id = v_uid and status = 'issued' and expires_at > now()
  order by issued_at desc limit 1;
  if found then return r; end if;

  select count(*) into v_count from deal_redemptions
  where deal_id = d.id and user_id = v_uid and status = 'redeemed';
  if v_count >= d.max_per_user then
    raise exception 'Du har allerede brukt dette tilbudet';
  end if;

  if d.max_redemptions is not null then
    select count(*) into v_count from deal_redemptions
    where deal_id = d.id
      and (status = 'redeemed' or (status = 'issued' and expires_at > now()));
    if v_count >= d.max_redemptions then
      raise exception 'Tilbudet er utsolgt';
    end if;
  end if;

  if p_shared_deal_id is not null and not exists (
    select 1 from shared_deals
    where id = p_shared_deal_id and to_user_id = v_uid and deal_id = d.id
  ) then
    raise exception 'Ugyldig deling';
  end if;

  insert into deal_redemptions (deal_id, user_id, shared_deal_id, expires_at)
  values (d.id, v_uid, p_shared_deal_id, coalesce(d.ends_at, now() + interval '30 days'))
  returning * into r;
  return r;
end;
$$;

-- Bedriften skanner QR-koden. Setter 'redeemed', markerer ny/gjenganger og gir poeng.
create or replace function redeem_deal(p_token text, p_party_size int default 1)
returns deal_redemptions language plpgsql security definer
set search_path = public, extensions as $$
declare
  r          deal_redemptions;
  d          deals;
  v_first    boolean;
  v_sharer   uuid;
  v_referrer uuid;
begin
  select * into r from deal_redemptions where token = p_token for update;
  if not found then
    raise exception 'Ugyldig kode';
  end if;

  select * into d from deals where id = r.deal_id;
  if not is_business_member(d.business_id) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  if r.status = 'redeemed' then
    raise exception 'Koden er allerede brukt';
  end if;
  if r.status = 'expired' or r.expires_at <= now() then
    raise exception 'Koden er utløpt';
  end if;
  if d.status <> 'active'
     or d.starts_at > now()
     or (d.ends_at is not null and d.ends_at <= now()) then
    raise exception 'Tilbudet er ikke aktivt';
  end if;
  if not deal_is_valid_now(d.id) then
    raise exception 'Tilbudet gjelder ikke akkurat nå';
  end if;
  if coalesce(p_party_size, 1) < d.min_group_size then
    raise exception 'Tilbudet krever minst % personer', d.min_group_size;
  end if;

  v_first := not exists (
    select 1 from deal_redemptions x join deals dd on dd.id = x.deal_id
    where x.user_id = r.user_id and x.status = 'redeemed' and dd.business_id = d.business_id
  );

  update deal_redemptions
     set status = 'redeemed', redeemed_at = now(),
         is_first_time = v_first, party_size = coalesce(p_party_size, 1)
   where id = r.id
  returning * into r;

  perform award_points(r.user_id, 10, 'Løste inn en vennepris', 'deal', d.id);
  if v_first then
    perform award_points(r.user_id, 20, 'Første besøk hos et nytt sted', 'business', d.business_id);
  end if;

  -- Delt tilbud: bonus til både den som delte og den som løste inn
  if r.shared_deal_id is not null then
    update shared_deals set rewarded_at = now()
    where id = r.shared_deal_id and rewarded_at is null
    returning from_user_id into v_sharer;
    if found then
      perform award_points(v_sharer,   15, 'En venn brukte tilbudet du delte', 'deal', d.id);
      perform award_points(r.user_id,  15, 'Brukte et tilbud en venn delte',   'deal', d.id);
      perform award_badges(v_sharer);
    end if;
  end if;

  -- Invitert bruker: bonus når første innløsning skjer
  if (select count(*) from deal_redemptions
      where user_id = r.user_id and status = 'redeemed') = 1 then
    update referrals set rewarded_at = now()
    where referred_user_id = r.user_id and rewarded_at is null
    returning referrer_id into v_referrer;
    if found then
      perform award_points(v_referrer, 50, 'En du inviterte løste inn sin første vennepris', 'user', r.user_id);
      perform award_points(r.user_id,  25, 'Velkomstbonus fra invitasjon', 'user', v_referrer);
    end if;
  end if;

  perform award_badges(r.user_id);
  return r;
end;
$$;

-- ========== VARSLER TIL FØLGERE VED PUBLISERING ==========
-- Bruker i nærheten som ikke følger bedriften, men vil ha lynsalg
create or replace function nearby_flash_audience(p_deal_id uuid)
returns table (user_id uuid)
language sql stable security definer
set search_path = public, extensions as $$
  select p.user_id
  from notification_preferences p
  join deals d on d.id = p_deal_id
  join businesses b on b.id = d.business_id
  where d.is_flash and b.lat is not null and b.lng is not null
    and p.pref_flash_deals
    and p.notify_lat is not null and p.notify_lng is not null
    and distance_m(b.lat, b.lng, p.notify_lat, p.notify_lng)
        <= least(p.flash_radius_m, coalesce(d.flash_radius_m, p.flash_radius_m))
    and (cardinality(p.category_ids) = 0 or b.category_id = any (p.category_ids))
    and (not d.student_only or is_verified_student(p.user_id))
    and not exists (select 1 from follows f where f.user_id = p.user_id and f.business_id = b.id);
$$;

create or replace function notify_on_publish()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_row    jsonb := to_jsonb(new);
  v_type   notification_type;
  v_target text;
  v_name   text;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' then return new; end if;
  -- Planlagt tilbud (starter senere): ikke varsle ennå. Leser via jsonb siden
  -- news_posts ikke har starts_at.
  if tg_table_name = 'deals' and (v_row ->> 'starts_at')::timestamptz > now() then
    return new;
  end if;

  select name into v_name from businesses where id = new.business_id and status = 'approved';
  if not found then return new; end if;

  if tg_table_name = 'deals' then
    v_target := 'deal';
    v_type := (case when coalesce((v_row ->> 'is_flash')::boolean, false)
                    then 'flash_deal' else 'new_deal' end)::notification_type;
  elsif tg_table_name = 'events' then
    v_target := 'event';
    v_type := 'new_event';
  else
    v_target := 'news_post';
    v_type := 'new_news';
  end if;

  insert into notifications (user_id, type, title, body, target_type, target_id, data)
  select f.user_id, v_type, v_name, v_row ->> 'title', v_target, new.id,
         jsonb_build_object('business_id', new.business_id)
  from follows f
  where f.business_id = new.business_id and notification_allowed(f.user_id, v_type);

  if v_type = 'flash_deal' then
    insert into notifications (user_id, type, title, body, target_type, target_id, data)
    select a.user_id, v_type, 'Lynsalg hos ' || v_name, v_row ->> 'title', v_target, new.id,
           jsonb_build_object('business_id', new.business_id)
    from nearby_flash_audience(new.id) a;
  end if;
  return new;
end;
$$;

create trigger notify_on_publish after insert or update of status on deals
  for each row execute function notify_on_publish();
create trigger notify_on_publish after insert or update of status on events
  for each row execute function notify_on_publish();
create trigger notify_on_publish after insert or update of status on news_posts
  for each row execute function notify_on_publish();

-- ========== KUNDESTATISTIKK ==========
-- Ny vs gjenganger: "new_customers" er brukere som løste inn for første gang
-- hos akkurat denne bedriften i perioden. Bevis på at appen henter nye kunder.
create or replace function business_customer_stats(
  p_business_id uuid,
  p_from timestamptz default now() - interval '30 days',
  p_to   timestamptz default now()
)
returns table (
  redemptions bigint, unique_customers bigint, new_customers bigint,
  returning_customers bigint, followers bigint, review_count bigint,
  avg_rating numeric, stamps_given bigint, loyalty_cards_completed bigint,
  profile_views bigint
)
language plpgsql stable security definer
set search_path = public, extensions as $$
#variable_conflict use_column
begin
  if not (is_business_member(p_business_id) or is_admin()) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  return query
  with red as (
    select x.user_id as uid, x.is_first_time as first_time
    from deal_redemptions x join deals d on d.id = x.deal_id
    where d.business_id = p_business_id and x.status = 'redeemed'
      and x.redeemed_at between p_from and p_to
  ), agg as (
    select count(*)                                       as total,
           count(distinct uid)                            as uniq,
           count(distinct uid) filter (where first_time)  as newc
    from red
  )
  select
    agg.total,
    agg.uniq,
    agg.newc,
    agg.uniq - agg.newc,
    (select count(*) from follows f where f.business_id = p_business_id),
    (select count(*) from reviews rv
       where rv.business_id = p_business_id and rv.status = 'published'),
    (select round(avg(rv.rating), 2) from reviews rv
       where rv.business_id = p_business_id and rv.status = 'published'),
    (select count(*) from loyalty_stamps s
       join loyalty_cards c on c.id = s.card_id
       join loyalty_programs p on p.id = c.program_id
       where p.business_id = p_business_id and s.created_at between p_from and p_to),
    (select count(*) from loyalty_cards c
       join loyalty_programs p on p.id = c.program_id
       where p.business_id = p_business_id and c.completed_at between p_from and p_to),
    (select count(*) from analytics_events a
       where a.business_id = p_business_id and a.target_type = 'business'
         and a.event_type = 'view' and a.created_at between p_from and p_to)
  from agg;
end;
$$;


-- FILE: 20261106000006_initial_v2_05_business_ops.sql
set search_path = public, extensions;
-- DinVenn – schema v2, fil 5 av 5: bedriftsdrift, moderering, studentvedlikehold og låsing
-- Kjør etter schema-v2-04-social-redeem.sql

-- ========== ENUMS ==========
create type claim_status  as enum ('pending', 'approved', 'rejected');
create type report_target as enum ('business', 'deal', 'event', 'news_post', 'review', 'user');
create type report_status as enum ('open', 'dismissed', 'actioned');

-- ========== NABOLAG ==========
create table neighborhoods (
  id    serial primary key,
  city  text not null,
  name  text not null,
  slug  text not null,
  lat   double precision,
  lng   double precision,
  unique (city, slug)
);
alter table neighborhoods enable row level security;
create policy "les nabolag" on neighborhoods for select using (true);
create policy "admin styrer nabolag" on neighborhoods for all using (is_admin());

-- ========== ORG.NR OG NABOLAG PÅ BEDRIFT ==========
-- org_verified_at settes av en Edge Function som slår opp i Enhetsregisteret (Brønnøysund).
alter table businesses
  add column org_number       text check (org_number ~ '^[0-9]{9}$'),
  add column org_verified_at  timestamptz,
  add column neighborhood_id  int references neighborhoods(id) on delete set null;
create index on businesses (org_number) where org_number is not null;
create index on businesses (neighborhood_id);

-- Utvider vakten fra fil 1: org-verifisering kan ikke settes fra appen,
-- og endres org.nr, nullstilles verifiseringen.
create or replace function guard_business_columns()
returns trigger language plpgsql as $$
begin
  if is_client_write() and not is_admin() then
    if tg_op = 'INSERT' then
      new.status          := 'pending';
      new.is_featured     := false;
      new.is_claimed      := true;
      new.org_verified_at := null;
    else
      if new.status      is distinct from old.status
         or new.is_featured is distinct from old.is_featured
         or new.owner_id    is distinct from old.owner_id
         or new.is_claimed  is distinct from old.is_claimed then
        raise exception 'Kun admin kan endre status, fremheving eller eier'
          using errcode = '42501';
      end if;
      if new.org_number is distinct from old.org_number then
        new.org_verified_at := null;
      else
        new.org_verified_at := old.org_verified_at;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ========== TAGS ==========
create table tags (
  id    serial primary key,
  slug  text not null unique,
  name  text not null,
  icon  text
);
create table business_tags (
  business_id uuid not null references businesses(id) on delete cascade,
  tag_id      int  not null references tags(id) on delete cascade,
  primary key (business_id, tag_id)
);
create index on business_tags (tag_id);

alter table tags          enable row level security;
alter table business_tags enable row level security;
create policy "les tags" on tags for select using (true);
create policy "admin styrer tags" on tags for all using (is_admin());
create policy "les bedriftstags" on business_tags
  for select using (exists (select 1 from businesses b where b.id = business_id));
create policy "administrer bedriftstags" on business_tags
  for all using (is_business_member(business_id));

insert into tags (slug, name, icon) values
  ('vegansk',          'Veganske alternativer', 'leaf'),
  ('hundevennlig',     'Hundevennlig',          'paw'),
  ('studentvennlig',   'Studentvennlig',        'graduation-cap'),
  ('gratis-wifi',      'Gratis wifi',           'wifi'),
  ('rullestolvennlig', 'Rullestolvennlig',      'accessibility'),
  ('familievennlig',   'Familievennlig',        'users'),
  ('uteservering',     'Uteservering',          'sun');

-- ========== OVERTA BEDRIFTSPROFIL ==========
-- Admin kan forhåndsutfylle profiler (is_claimed = false). Eieren sender en
-- forespørsel, admin godkjenner.
create table business_claims (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  claimant_id   uuid not null references profiles(id) on delete cascade,
  org_number    text check (org_number ~ '^[0-9]{9}$'),
  message       text check (char_length(message) <= 1000),
  evidence_url  text,
  status        claim_status not null default 'pending',
  reviewed_by   uuid references profiles(id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now()
);
create unique index on business_claims (business_id, claimant_id) where status = 'pending';

alter table business_claims enable row level security;
create policy "se egne claims" on business_claims
  for select using (claimant_id = auth.uid() or is_admin());
create policy "send claim" on business_claims
  for insert with check (
    claimant_id = auth.uid() and status = 'pending'
    and exists (select 1 from businesses b where b.id = business_id and not b.is_claimed)
  );

create or replace function approve_business_claim(p_claim_id uuid, p_note text default null)
returns business_claims language plpgsql security definer
set search_path = public, extensions as $$
declare
  c business_claims;
  b businesses;
begin
  if not is_admin() then
    raise exception 'Kun admin' using errcode = '42501';
  end if;

  select * into c from business_claims where id = p_claim_id and status = 'pending' for update;
  if not found then
    raise exception 'Fant ingen ventende forespørsel';
  end if;
  select * into b from businesses where id = c.business_id for update;
  if b.is_claimed then
    raise exception 'Bedriften er allerede overtatt';
  end if;

  update businesses
     set owner_id = c.claimant_id, is_claimed = true,
         org_number = coalesce(c.org_number, org_number)
   where id = b.id;
  insert into business_members (business_id, user_id, member_role)
  values (b.id, c.claimant_id, 'owner')
  on conflict (business_id, user_id) do update set member_role = 'owner';

  update business_claims
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = c.id returning * into c;
  update business_claims
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = 'Bedriften ble overtatt av en annen'
   where business_id = b.id and status = 'pending';

  perform push_notification(c.claimant_id, 'system', 'Du har overtatt ' || b.name,
                            'Nå kan du administrere profilen', 'business', b.id);
  return c;
end;
$$;

create or replace function reject_business_claim(p_claim_id uuid, p_note text default null)
returns business_claims language plpgsql security definer
set search_path = public, extensions as $$
declare
  c business_claims;
begin
  if not is_admin() then
    raise exception 'Kun admin' using errcode = '42501';
  end if;
  update business_claims
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
   where id = p_claim_id and status = 'pending'
  returning * into c;
  if not found then
    raise exception 'Fant ingen ventende forespørsel';
  end if;
  perform push_notification(c.claimant_id, 'system', 'Forespørselen ble avslått', p_note,
                            'business', c.business_id);
  return c;
end;
$$;

-- ========== RAPPORTERING ==========
create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references profiles(id) on delete cascade,
  target_type  report_target not null,
  target_id    uuid not null,
  reason       text not null check (reason in
                 ('spam', 'upassende', 'feil_info', 'tilbud_ikke_godtatt', 'annet')),
  details      text check (char_length(details) <= 1000),
  status       report_status not null default 'open',
  handled_by   uuid references profiles(id) on delete set null,
  handled_at   timestamptz,
  handled_note text,
  created_at   timestamptz not null default now()
);
create unique index on reports (reporter_id, target_type, target_id) where status = 'open';
create index on reports (status, created_at);

alter table reports enable row level security;
create policy "se egne rapporter" on reports
  for select using (reporter_id = auth.uid() or is_admin());
create policy "send rapport" on reports
  for insert with check (reporter_id = auth.uid() and status = 'open');
create policy "admin behandler rapporter" on reports
  for update using (is_admin());

-- ========== ENDRINGSLOGG ==========
-- Hvem endret hva. Skrives av trigger, leses av eier og admin.
create table audit_log (
  id          bigint generated always as identity primary key,
  business_id uuid,                  -- ingen FK: loggen skal overleve sletting
  actor_id    uuid,                  -- null = system/service_role
  action      text not null,         -- INSERT / UPDATE / DELETE
  table_name  text not null,
  row_id      uuid,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);
create index on audit_log (business_id, created_at desc);

alter table audit_log enable row level security;
create policy "eier og admin leser logg" on audit_log
  for select using (is_business_owner(business_id) or is_admin());

create or replace function audit_row()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
begin
  if tg_op = 'UPDATE' and v_old = v_new then
    return null;
  end if;
  insert into audit_log (business_id, actor_id, action, table_name, row_id, old_data, new_data)
  values (
    (case when tg_table_name = 'businesses' then v_row ->> 'id' else v_row ->> 'business_id' end)::uuid,
    auth.uid(), tg_op, tg_table_name, nullif(v_row ->> 'id', '')::uuid, v_old, v_new
  );
  return null;
end;
$$;

create trigger audit after insert or update or delete on businesses
  for each row execute function audit_row();
create trigger audit after insert or update or delete on business_members
  for each row execute function audit_row();
create trigger audit after insert or update or delete on deals
  for each row execute function audit_row();
create trigger audit after insert or update or delete on events
  for each row execute function audit_row();
create trigger audit after insert or update or delete on news_posts
  for each row execute function audit_row();
create trigger audit after insert or update or delete on opening_hours
  for each row execute function audit_row();
create trigger audit after insert or update or delete on loyalty_programs
  for each row execute function audit_row();

-- ========== VEDLIKEHOLD (kjøres hvert 15. minutt) ==========
-- Aktiver pg_cron i Supabase (Database -> Extensions), og planlegg:
--   select cron.schedule('dinvenn-vedlikehold', '*/15 * * * *', 'select run_maintenance()');
create or replace function run_maintenance()
returns void language plpgsql security definer
set search_path = public, extensions as $$
begin
  update deal_redemptions set status = 'expired'
   where status = 'issued' and expires_at <= now();

  update deals set status = 'expired'
   where status in ('active', 'paused') and ends_at is not null and ends_at <= now();

  update events set status = 'expired'
   where status in ('active', 'paused') and coalesce(ends_at, starts_at + interval '1 day') <= now();

  update student_verifications set status = 'expired'
   where status = 'verified' and expires_at <= now();
  update student_verifications set verification_token = null, token_expires_at = null
   where status = 'pending' and token_expires_at <= now();

  -- Personvern: ikke behold rådata lenger enn nødvendig
  delete from analytics_events where created_at < now() - interval '13 months';
  delete from notifications    where created_at < now() - interval '90 days';
end;
$$;

-- ========== LÅSING AV INTERNE FUNKSJONER ==========
-- Supabase gir som standard alle roller rett til å kalle funksjoner via API.
-- Disse er kun til internt bruk (andre funksjoner, triggere, Edge Functions).
revoke all on function award_points(uuid, int, text, text, uuid)                   from public, anon, authenticated;
revoke all on function award_badges(uuid)                                          from public, anon, authenticated;
revoke all on function push_notification(uuid, notification_type, text, text, text, uuid, jsonb)
                                                                                   from public, anon, authenticated;
revoke all on function notification_allowed(uuid, notification_type)               from public, anon, authenticated;
revoke all on function are_friends(uuid, uuid)                                     from public, anon, authenticated;
revoke all on function is_business_member_of(uuid, uuid)                           from public, anon, authenticated;
revoke all on function is_verified_student(uuid)                                   from public, anon, authenticated;
revoke all on function nearby_flash_audience(uuid)                                 from public, anon, authenticated;
revoke all on function run_maintenance()                                           from public, anon, authenticated;
revoke all on function handle_new_user()                                           from public, anon, authenticated;
revoke all on function on_business_created()                                       from public, anon, authenticated;
revoke all on function reward_business_referral()                                  from public, anon, authenticated;
revoke all on function notify_on_publish()                                         from public, anon, authenticated;
revoke all on function audit_row()                                                 from public, anon, authenticated;

-- Edge Functions (service_role) trenger disse
grant execute on function nearby_flash_audience(uuid) to service_role;
grant execute on function run_maintenance()           to service_role;

-- Funksjoner som SKAL kunne kalles fra appen (alle sjekker auth.uid() selv):
--   claim_deal, redeem_deal, share_deal, send_friend_request, respond_friend_request,
--   apply_referral, apply_business_referral, join_loyalty_program, add_stamp,
--   claim_loyalty_reward, reply_to_review, request_student_verification, verify_student,
--   approve_business_claim, reject_business_claim, business_deal_stats,
--   business_daily_stats, business_customer_stats
-- Anonyme brukere skal ikke kalle dem:
revoke execute on function claim_deal(uuid, uuid)                 from public, anon;
revoke execute on function redeem_deal(text, int)                 from public, anon;
revoke execute on function share_deal(uuid, uuid, text)           from public, anon;
revoke execute on function send_friend_request(text)              from public, anon;
revoke execute on function respond_friend_request(uuid, boolean)  from public, anon;
revoke execute on function apply_referral(text)                   from public, anon;
revoke execute on function apply_business_referral(uuid, text)    from public, anon;
revoke execute on function join_loyalty_program(uuid)             from public, anon;
revoke execute on function add_stamp(text)                        from public, anon;
revoke execute on function claim_loyalty_reward(text)             from public, anon;
revoke execute on function reply_to_review(uuid, text)            from public, anon;
revoke execute on function request_student_verification(text)     from public, anon;
revoke execute on function verify_student(text)                   from public, anon;
revoke execute on function approve_business_claim(uuid, text)     from public, anon;
revoke execute on function reject_business_claim(uuid, text)      from public, anon;
revoke execute on function business_deal_stats(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function business_daily_stats(uuid, int)        from public, anon;
revoke execute on function business_customer_stats(uuid, timestamptz, timestamptz) from public, anon;


-- FILE: 20261106000007_pilot.sql
-- Integrasjon og sikkerhetsregler for piloten.
set search_path = public, extensions;
grant usage on schema public to anon, authenticated;
grant select on categories, businesses, deals to anon, authenticated;
grant select, insert, update on businesses to authenticated;
grant select, insert, update, delete on deals, favorites to authenticated;
grant select on profiles, business_members, deal_redemptions to authenticated;
grant execute on function claim_deal(uuid, uuid), redeem_deal(text, int) to authenticated;

alter table deals add constraint deals_positive_limits check (
 max_per_user > 0 and (max_redemptions is null or max_redemptions > 0));
alter table deals add constraint deals_valid_dates check (ends_at is null or ends_at > starts_at);
alter table deals add constraint deals_valid_discount check (
 (discount_type not in ('percent','amount')) or
 (discount_value > 0 and discount_value is not null and (discount_type <> 'percent' or discount_value <= 100)));
alter table deals add constraint deals_nonblank_title check (length(trim(title)) > 0);

-- Offentlige bilder kan leses av alle; skriving krever medlemskap i mappeeierens bedrift.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-images', 'business-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "pilot upload egne bilder" on storage.objects for insert to authenticated
 with check (bucket_id = 'business-images' and exists (
   select 1 from public.business_members m where m.user_id = auth.uid()
   and m.business_id::text = (storage.foldername(name))[1]));
create policy "pilot endre egne bilder" on storage.objects for update to authenticated
 using (bucket_id = 'business-images' and exists (
   select 1 from public.business_members m where m.user_id = auth.uid()
   and m.business_id::text = (storage.foldername(name))[1]))
 with check (bucket_id = 'business-images' and exists (
   select 1 from public.business_members m where m.user_id = auth.uid()
   and m.business_id::text = (storage.foldername(name))[1]));
create policy "pilot slette egne bilder" on storage.objects for delete to authenticated
 using (bucket_id = 'business-images' and exists (
   select 1 from public.business_members m where m.user_id = auth.uid()
   and m.business_id::text = (storage.foldername(name))[1]));
create policy "pilot les egne bilder" on storage.objects for select to authenticated
 using (bucket_id = 'business-images' and exists (
   select 1 from public.business_members m where m.user_id = auth.uid()
   and m.business_id::text = (storage.foldername(name))[1]));

create or replace function redeem_deal(p_token text, p_party_size int default 1)
returns deal_redemptions language plpgsql security definer
set search_path = public, extensions as $$
declare
  r          deal_redemptions;
  d          deals;
  v_first    boolean;
  v_sharer   uuid;
  v_referrer uuid;
begin
  -- Lås alltid tilbud før innløsning, samme rekkefølge som claim_deal.
  select dd.* into d from deals dd join deal_redemptions rr on rr.deal_id = dd.id
    where rr.token = p_token for update of dd;
  select * into r from deal_redemptions where token = p_token for update;
  if not found then
    raise exception 'Ugyldig kode';
  end if;

  if not exists (select 1 from businesses where id = d.business_id and status = 'approved') then
    raise exception 'Bedriften er ikke godkjent';
  end if;
  if not is_business_member(d.business_id) then
    raise exception 'Ikke tilgang' using errcode = '42501';
  end if;

  if r.status = 'redeemed' then
    raise exception 'Koden er allerede brukt';
  end if;
  if r.status = 'expired' or r.expires_at <= now() then
    raise exception 'Koden er utløpt';
  end if;
  if d.status <> 'active'
     or d.starts_at > now()
     or (d.ends_at is not null and d.ends_at <= now()) then
    raise exception 'Tilbudet er ikke aktivt';
  end if;
  if not deal_is_valid_now(d.id) then
    raise exception 'Tilbudet gjelder ikke akkurat nå';
  end if;
  if coalesce(p_party_size, 1) < d.min_group_size then
    raise exception 'Tilbudet krever minst % personer', d.min_group_size;
  end if;

  if (select count(*) from deal_redemptions where deal_id = d.id and user_id = r.user_id and status = 'redeemed') >= d.max_per_user then
    raise exception 'Du har allerede brukt dette tilbudet';
  end if;
  if d.max_redemptions is not null and (select count(*) from deal_redemptions where deal_id = d.id and status = 'redeemed') >= d.max_redemptions then
    raise exception 'Tilbudet er utsolgt';
  end if;
  v_first := not exists (
    select 1 from deal_redemptions x join deals dd on dd.id = x.deal_id
    where x.user_id = r.user_id and x.status = 'redeemed' and dd.business_id = d.business_id
  );

  update deal_redemptions
     set status = 'redeemed', redeemed_at = now(),
         is_first_time = v_first, party_size = coalesce(p_party_size, 1)
   where id = r.id
  returning * into r;

  perform award_points(r.user_id, 10, 'Løste inn en vennepris', 'deal', d.id);
  if v_first then
    perform award_points(r.user_id, 20, 'Første besøk hos et nytt sted', 'business', d.business_id);
  end if;

  -- Delt tilbud: bonus til både den som delte og den som løste inn
  if r.shared_deal_id is not null then
    update shared_deals set rewarded_at = now()
    where id = r.shared_deal_id and rewarded_at is null
    returning from_user_id into v_sharer;
    if found then
      perform award_points(v_sharer,   15, 'En venn brukte tilbudet du delte', 'deal', d.id);
      perform award_points(r.user_id,  15, 'Brukte et tilbud en venn delte',   'deal', d.id);
      perform award_badges(v_sharer);
    end if;
  end if;

  -- Invitert bruker: bonus når første innløsning skjer
  if (select count(*) from deal_redemptions
      where user_id = r.user_id and status = 'redeemed') = 1 then
    update referrals set rewarded_at = now()
    where referred_user_id = r.user_id and rewarded_at is null
    returning referrer_id into v_referrer;
    if found then
      perform award_points(v_referrer, 50, 'En du inviterte løste inn sin første vennepris', 'user', r.user_id);
      perform award_points(r.user_id,  25, 'Velkomstbonus fra invitasjon', 'user', v_referrer);
    end if;
  end if;

  perform award_badges(r.user_id);
  return r;
end;
$$;


revoke execute on function redeem_deal(text, int) from public, anon;
grant execute on function redeem_deal(text, int) to authenticated;

commit;
