-- Kjør én gang etter upgrade-tic-tac-toe-win.sql. Inkluderer smartere tre på rad. QR-koder og påbegynte tre på rad-runder beholdes.
begin;
-- Memory 4x4 med seks feil, tilfeldig spillvalg og serverkontrollert seier.
set search_path = public, extensions;
create or replace function new_memory_state() returns jsonb language sql volatile
set search_path = public, extensions as $$
 select jsonb_build_object('board',jsonb_agg(i%8 order by random()),'matched','[]'::jsonb,'revealed','[]'::jsonb,'pending',-1,'mistakes',0,'result','') from generate_series(0,15) i;
$$;
revoke all on function new_memory_state() from public, anon, authenticated;
create or replace function game_public(s deal_game_sessions) returns jsonb language sql stable
set search_path = public, extensions as $$
 select jsonb_build_object('id',s.id,'kind',s.kind,'state',case when s.kind='memory' then
  jsonb_build_object('faces',(select jsonb_agg(case when s.state->'matched' @> jsonb_build_array(i) or s.state->'revealed' @> jsonb_build_array(i) then s.state->'board'->i else 'null'::jsonb end order by i) from generate_series(0,15) i),
   'matched',s.state->'matched','revealed',s.state->'revealed','mistakes',s.state->'mistakes','max_mistakes',6,'result',s.state->'result')
  else s.state end,'revision',s.revision,'completed',s.completed_at is not null,'expires_at',s.expires_at);
$$;
create or replace function start_deal_game(p_deal_id uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare d deals; s deal_game_sessions; v_state jsonb; v_kind text; used int;
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
 v_kind:=case when random()<0.5 then 'memory' else 'tic_tac_toe' end;
 v_state:=case when v_kind='memory' then new_memory_state() else jsonb_build_object('board',to_jsonb(array['','','','','','','','','']),'result','') end;
 insert into deal_game_sessions(user_id,deal_id,kind,state,expires_at) values(auth.uid(),d.id,v_kind,v_state,least(now()+interval '1 hour',coalesce(d.ends_at,'infinity'::timestamptz))) returning * into s;
 return game_public(s);
end;
$$;
create or replace function play_deal_game(p_session_id uuid,p_revision int,p_action int) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s deal_game_sessions; d deals; st jsonb; board jsonb; bot int; pending int; matched jsonb; revealed jsonb; mistakes int; result text; done boolean:=false;
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
 if s.kind='memory' then
  st:=s.state;
  if p_action=-1 and st->>'result'='loss' then
   update deal_game_sessions set state=new_memory_state(),revision=revision+1 where id=s.id returning * into s;
   return game_public(s);
  end if;
  if coalesce(st->>'result','')<>'' then raise exception 'Start en ny runde for å prøve igjen.'; end if;
  board:=st->'board'; matched:=st->'matched'; pending:=(st->>'pending')::int; mistakes:=(st->>'mistakes')::int;
  if p_action is null or p_action not between 0 and 15 or matched @> jsonb_build_array(p_action) or p_action=pending then raise exception 'Ugyldig spilltrekk.'; end if;
  if pending=-1 then
   revealed:=jsonb_build_array(p_action); pending:=p_action;
  else
   revealed:=jsonb_build_array(pending,p_action);
   if board->>pending=board->>p_action then matched:=matched || revealed; else mistakes:=mistakes+1; end if;
   pending:=-1;
  end if;
  result:=case when jsonb_array_length(matched)=16 then 'win' when mistakes>=6 then 'loss' else '' end;
  st:=jsonb_build_object('board',board,'matched',matched,'revealed',revealed,'pending',pending,'mistakes',mistakes,'result',result);
  update deal_game_sessions set state=st,revision=revision+1,completed_at=case when result='win' then now() end where id=s.id returning * into s;
  return game_public(s);
 end if;
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
   -- Prioritize winning, then blocking X, then center, corners and edges.
   select i into bot from generate_series(0,8) i where board->>i=''
   order by case
    when game_ttt_result(jsonb_set(board,array[i::text],'"O"'))='O' then 0
    when game_ttt_result(jsonb_set(board,array[i::text],'"X"'))='X' then 1
    when i=4 then 2
    when i in (0,2,6,8) then 3 else 4 end, random() limit 1;
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
 select * into s from deal_game_sessions where user_id=new.user_id and deal_id=d.id and consumed_at is null and completed_at is not null and ((kind='tic_tac_toe' and state->>'result'='X') or (kind='memory' and state->>'result'='win' and jsonb_array_length(state->'matched')=16 and (state->>'mistakes')::int<6)) and expires_at>now() for update;
 if not found then raise exception 'Vinn spillet før du henter venneprisen.' using errcode='42501'; end if;
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
