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
