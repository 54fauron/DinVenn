-- Kjør én gang i en eksisterende pilotdatabase. Hovedadressene beholdes.
begin;
-- Flere avdelinger under samme bedrift. businesses beholder hovedadressen.
set search_path = public, extensions;
create table business_locations (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references businesses(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120),
 address text not null check (length(trim(address)) between 1 and 250),
 postal_code text not null check (postal_code ~ '^[0-9]{4}$'),
 city text not null check (length(trim(city)) between 1 and 120),
 lat double precision,
 lng double precision,
 created_at timestamptz not null default now(),
 constraint business_locations_coordinates check (
   (lat is null and lng is null) or
   (lat is not null and lng is not null and lat between -90 and 90 and lng between -180 and 180)
 )
);
create index business_locations_business_idx on business_locations(business_id);
alter table business_locations enable row level security;
revoke all on business_locations from public, anon, authenticated;
grant select on business_locations to anon, authenticated;
grant insert, update, delete on business_locations to authenticated;
create policy "les avdelinger for godkjente eller egne bedrifter" on business_locations
 for select to anon, authenticated using (
   exists (select 1 from businesses b where b.id=business_id and b.status='approved')
   or is_business_member(business_id) or is_admin()
 );
create policy "administrer egne avdelinger" on business_locations
 for all to authenticated
 using (is_business_member(business_id) or is_admin())
 with check (is_business_member(business_id) or is_admin());
create trigger audit after insert or update or delete on business_locations
 for each row execute function audit_row();

commit;
