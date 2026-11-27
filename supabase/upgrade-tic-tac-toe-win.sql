-- Kjør én gang etter upgrade-required-tic-tac-toe.sql. Utstedte QR-koder beholdes.
begin;
-- Seier kreves for nye QR-koder. Eksisterende QR-koder beholdes.
set search_path = public, extensions;
update deal_game_sessions set completed_at=null, revision=revision+1
where consumed_at is null and completed_at is not null and coalesce(state->>'result','')<>'X';
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
 if p_action=-1 and coalesce(s.state->>'result','') in ('O','draw') then
  update deal_game_sessions set state=jsonb_build_object('board',to_jsonb(array['','','','','','','','','']),'result',''),revision=revision+1 where id=s.id returning * into s;
  return game_public(s);
 end if;
 if coalesce(s.state->>'result','')<>'' then raise exception 'Start en ny runde for å prøve igjen.'; end if;
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
  st:=jsonb_build_object('board',board,'result',result);done:=result='X';
 update deal_game_sessions set state=st,revision=revision+1,completed_at=case when done then now() end where id=s.id returning * into s;
 return game_public(s);
end;
$$;
create or replace function require_completed_deal_game() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
declare d deals; s deal_game_sessions; used int;
begin
 select * into d from deals where id=new.deal_id for update;
 select * into s from deal_game_sessions where user_id=new.user_id and deal_id=d.id and consumed_at is null and completed_at is not null and kind='tic_tac_toe' and state->>'result'='X' and expires_at>now() for update;
 if not found then raise exception 'Vinn tre på rad før du henter venneprisen.' using errcode='42501'; end if;
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
