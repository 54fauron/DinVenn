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
