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
