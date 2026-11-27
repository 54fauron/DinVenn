-- Beskrivelse av gave/andre tilbud og egen visningskode. Unik QR-token beholdes.
set search_path = public, extensions;
alter table deals add column discount_details text;
alter table deals add constraint deals_discount_details_length check (
 discount_details is null or length(trim(discount_details)) between 1 and 500
);
-- NOT VALID bevarer eventuelle eldre koder; nye og endrede rader kontrolleres.
alter table deals add constraint deals_promo_code_format check (
 promo_code is null or (length(trim(promo_code)) between 1 and 64 and promo_code !~ '[[:cntrl:]]')
) not valid;
create function guard_deal_details() returns trigger language plpgsql
set search_path = public, extensions as $$
begin
 new.discount_details := nullif(trim(new.discount_details), '');
 new.promo_code := nullif(trim(new.promo_code), '');
 if new.discount_type in ('freebie','other') and new.discount_details is null then
  if tg_op = 'INSERT' then
   raise exception 'Beskriv hva gaven eller tilbudet gjelder.' using errcode = '23514';
  elsif new.discount_type is distinct from old.discount_type
     or new.discount_details is distinct from old.discount_details then
   raise exception 'Beskriv hva gaven eller tilbudet gjelder.' using errcode = '23514';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function guard_deal_details() from public, anon, authenticated;
create trigger guard_deal_details before insert or update on deals
 for each row execute function guard_deal_details();

alter table deal_redemptions add column display_code text;
-- Visningskoden fryses ved uthenting; endret tilbudskode endrer ikke utstedte koder.
create function snapshot_deal_display_code() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
 select nullif(trim(d.promo_code), '') into new.display_code from deals d where d.id = new.deal_id;
 return new;
end;
$$;
revoke all on function snapshot_deal_display_code() from public, anon, authenticated;
create trigger snapshot_deal_display_code before insert on deal_redemptions
 for each row execute function snapshot_deal_display_code();
