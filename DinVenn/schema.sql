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
