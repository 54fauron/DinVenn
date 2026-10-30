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
