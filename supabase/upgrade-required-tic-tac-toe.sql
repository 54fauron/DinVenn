-- Kjør én gang etter upgrade-deal-games.sql. Ingen tilbud eller QR-koder slettes.
begin;
-- Tre på rad er obligatorisk for nye uthentinger. Utstedte QR-koder beholdes.
set search_path = public, extensions;
alter table deals alter column requires_game set default true;
update deals set requires_game=true where not requires_game;
alter table deals add constraint deals_game_required check(requires_game);
-- Påbegynte andre spill erstattes av tre på rad. Allerede fullførte runder godtas.
update deal_game_sessions set kind='tic_tac_toe',
 state=jsonb_build_object('board',to_jsonb(array['','','','','','','','','']),'result',case when completed_at is null then '' else 'draw' end),
 revision=revision+1 where consumed_at is null and kind<>'tic_tac_toe';
create or replace function game_public(s deal_game_sessions) returns jsonb language sql stable
set search_path = public, extensions as $$
 select jsonb_build_object('id',s.id,'kind',s.kind,'state',s.state,'revision',s.revision,'completed',s.completed_at is not null,'expires_at',s.expires_at);
$$;
create or replace function start_deal_game(p_deal_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare d deals; s deal_game_sessions; v_state jsonb; used int;
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 select * into d from deals where id=p_deal_id for update;
 if not found or d.status<>'active' or d.starts_at>now() or (d.ends_at is not null and d.ends_at<=now())
 or not exists(select 1 from businesses where id=d.business_id and status='approved') then raise exception 'Tilbudet er ikke tilgjengelig'; end if;
 if d.student_only and not is_verified_student(auth.uid()) then raise exception 'Dette tilbudet er kun for verifiserte studenter'; end if;
 select * into s from deal_game_sessions where user_id=auth.uid() and deal_id=d.id and consumed_at is null for update;
 if found and s.expires_at>now() then return game_public(s); end if;
 if found then update deal_game_sessions set consumed_at=now() where id=s.id; end if;
 select count(*) into used from deal_redemptions where deal_id=d.id and user_id=auth.uid() and (status='redeemed' or (status='issued' and expires_at>now()));
 if used>=d.max_per_user then raise exception 'Du har allerede hentet eller brukt dette tilbudet'; end if;
 if d.max_redemptions is not null then
  select (select count(*) from deal_redemptions where deal_id=d.id and (status='redeemed' or(status='issued' and expires_at>now())))
   +(select count(*) from deal_game_sessions where deal_id=d.id and consumed_at is null and expires_at>now()) into used;
  if used>=d.max_redemptions then raise exception 'Tilbudet er utsolgt'; end if;
 end if;
 v_state:=jsonb_build_object('board',to_jsonb(array['','','','','','','','','']),'result','');
 insert into deal_game_sessions(user_id,deal_id,kind,state,expires_at) values(auth.uid(),d.id,'tic_tac_toe',v_state,least(now()+interval '1 hour',coalesce(d.ends_at,'infinity'::timestamptz))) returning * into s;
 return game_public(s);
end;
$$;
create or replace function play_deal_game(p_session_id uuid,p_revision int,p_action int) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s deal_game_sessions; d deals; st jsonb; board jsonb; bot int; result text; done boolean:=false;
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 select * into s from deal_game_sessions where id=p_session_id and user_id=auth.uid();
 if not found then raise exception 'Spillrunden finnes ikke.' using errcode='42501'; end if;
 select * into d from deals where id=s.deal_id for update;
 select * into s from deal_game_sessions where id=p_session_id and user_id=auth.uid() for update;
 if s.expires_at<=now() or s.consumed_at is not null then raise exception 'Spillrunden er utløpt. Start på nytt.'; end if;
 if d.status<>'active' or d.starts_at>now() or (d.ends_at is not null and d.ends_at<=now()) or not exists(select 1 from businesses where id=d.business_id and status='approved') then raise exception 'Tilbudet er ikke tilgjengelig'; end if;
 if p_revision is null or p_revision<>s.revision then raise exception 'Spillet er oppdatert. Last runden på nytt.' using errcode='40001'; end if;
 if s.completed_at is not null then return game_public(s); end if;
 if p_action is null then raise exception 'Ugyldig spilltrekk.'; end if;
 st:=s.state;
 if s.kind<>'tic_tac_toe' then raise exception 'Spillet er oppdatert. Last runden på nytt.'; end if;
  board:=st->'board';
  if p_action not between 0 and 8 or board->>p_action<>'' then raise exception 'Ugyldig spilltrekk.'; end if;
  board:=jsonb_set(board,array[p_action::text],'"X"'); result:=game_ttt_result(board);
  if result='' then
   select i into bot from generate_series(0,8) i where board->>i='' order by random() limit 1;
   board:=jsonb_set(board,array[bot::text],'"O"');result:=game_ttt_result(board);
  end if;
  st:=jsonb_build_object('board',board,'result',result);done:=result<>'';
 update deal_game_sessions set state=st,revision=revision+1,completed_at=case when done then now() end where id=s.id returning * into s;
 return game_public(s);
end;
$$;
create or replace function require_completed_deal_game() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare d deals; s deal_game_sessions; used int;
begin
 select * into d from deals where id=new.deal_id for update;
 select * into s from deal_game_sessions where user_id=new.user_id and deal_id=d.id and consumed_at is null and completed_at is not null and expires_at>now() for update;
 if not found then raise exception 'Fullfør spillet før du henter venneprisen.' using errcode='42501'; end if;
 if d.max_redemptions is not null then
  select (select count(*) from deal_redemptions where deal_id=d.id and (status='redeemed' or(status='issued' and expires_at>now())))
   +(select count(*) from deal_game_sessions where deal_id=d.id and id<>s.id and consumed_at is null and expires_at>now()) into used;
  if used>=d.max_redemptions then raise exception 'Tilbudet er utsolgt'; end if;
 end if;
 update deal_game_sessions set consumed_at=now() where id=s.id;
 return new;
end;
$$;

commit;
