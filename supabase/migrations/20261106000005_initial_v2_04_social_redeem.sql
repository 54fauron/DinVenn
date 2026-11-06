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
