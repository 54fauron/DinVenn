-- Ost på rømmen: Utakt / Akademiet KI-lab, c20ffdd, 116 BPM.
set search_path = public, extensions;
alter table deal_game_sessions drop constraint deal_game_sessions_kind_check;
alter table deal_game_sessions add constraint deal_game_sessions_kind_check check(kind in ('memory','tic_tac_toe','rock_paper_scissors','burgers','kebab','sliding_puzzle','cheese_rhythm'));
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
 v_kind:=(array['tic_tac_toe','memory','burgers','sliding_puzzle','cheese_rhythm'])[1+floor(random()*5)::int];
 v_state:=case when v_kind='cheese_rhythm' then jsonb_build_object('phase','ready','result','') when v_kind='memory' then new_memory_state() when v_kind in ('burgers','sliding_puzzle') then new_side_game_state(v_kind) else jsonb_build_object('board',to_jsonb(array['','','','','','','','','']),'result','') end;
 insert into deal_game_sessions(user_id,deal_id,kind,state,expires_at) values(auth.uid(),d.id,v_kind,v_state,least(now()+interval '1 hour',coalesce(d.ends_at,'infinity'::timestamptz))) returning * into s;
 return game_public(s);
end;
$$;
create or replace function play_deal_game(p_session_id uuid,p_revision int,p_action int) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s deal_game_sessions; d deals; st jsonb; board jsonb; bot int; pending int; matched jsonb; revealed jsonb; mistakes int; result text; done boolean:=false; blank int; temp jsonb; target jsonb; stack jsonb;
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
 if s.kind='cheese_rhythm' then
  if p_action not in (-2,-1) or p_action is null then raise exception 'Ugyldig spilltrekk.'; end if;
  st:=case when p_action=-2 then jsonb_build_object('phase','running','started_at',clock_timestamp(),'result','') else jsonb_build_object('phase','ready','result','') end;
  update deal_game_sessions set state=st,revision=revision+1 where id=s.id returning * into s;
  return game_public(s);
 end if;
 if s.kind in ('burgers','sliding_puzzle') then
  st:=s.state;
  if p_action=-1 and (s.kind='sliding_puzzle' or st->>'result'='loss') then
   update deal_game_sessions set state=new_side_game_state(s.kind),revision=revision+1 where id=s.id returning * into s;
   return game_public(s);
  end if;
  if coalesce(st->>'result','')<>'' then raise exception 'Start en ny runde for å prøve igjen.'; end if;
  if s.kind='burgers' then
   if p_action is null or p_action not between 0 and 5 then raise exception 'Ugyldig spilltrekk.'; end if;
   target:=st->'target';stack:=st->'stack';mistakes:=(st->>'mistakes')::int;
   if p_action=(target->>jsonb_array_length(stack))::int then stack:=stack||jsonb_build_array(p_action);else mistakes:=mistakes+1;end if;
   result:=case when stack=target then 'win' when mistakes>=3 then 'loss' else '' end;
   st:=jsonb_build_object('target',target,'stack',stack,'mistakes',mistakes,'result',result);
  else
   board:=st->'tiles';
   select i into blank from generate_series(0,8) i where (board->>i)::int=0;
   if p_action is null or p_action not between 0 and 8 or abs(p_action/3-blank/3)+abs(p_action%3-blank%3)<>1 then raise exception 'Flytt en brikke ved siden av det tomme feltet.'; end if;
   temp:=board->p_action;board:=jsonb_set(jsonb_set(board,array[blank::text],temp),array[p_action::text],'0');
   result:=case when board='[1,2,3,4,5,6,7,8,0]'::jsonb then 'win' else '' end;
   st:=jsonb_build_object('tiles',board,'moves',(st->>'moves')::int+1,'result',result);
  end if;
  update deal_game_sessions set state=st,revision=revision+1,completed_at=case when result='win' then now() end where id=s.id returning * into s;
  return game_public(s);
 end if;
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
 select * into s from deal_game_sessions where user_id=new.user_id and deal_id=d.id and consumed_at is null and completed_at is not null and ((kind='tic_tac_toe' and state->>'result'='X') or (kind='memory' and state->>'result'='win' and jsonb_array_length(state->'matched')=16 and (state->>'mistakes')::int<6) or (kind='burgers' and state->>'result'='win' and state->'stack'=state->'target' and (state->>'mistakes')::int<3) or (kind='sliding_puzzle' and state->>'result'='win' and state->'tiles'='[1,2,3,4,5,6,7,8,0]'::jsonb) or (kind='cheese_rhythm' and state->>'result'='win' and (state->>'hits')::int>=14 and (state->>'extras')::int<=5)) and expires_at>now() for update;
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

create or replace function finish_rhythm_game(p_session_id uuid,p_revision int,p_taps int[]) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare s deal_game_sessions; d deals; targets int[]; matched boolean[]:=array_fill(false,array[17]); hits int:=0; extras int:=0; previous int:=-1; tap int; idx int; found_idx int; result text;
begin
 if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
 select * into s from deal_game_sessions where id=p_session_id and user_id=auth.uid();
 if not found then raise exception 'Spillrunden finnes ikke.' using errcode='42501'; end if;
 select * into d from deals where id=s.deal_id for update;
 select * into s from deal_game_sessions where id=p_session_id and user_id=auth.uid() for update;
 if s.expires_at<=now() or s.consumed_at is not null then raise exception 'Spillrunden er utløpt. Start på nytt.'; end if;
 if d.status<>'active' or d.starts_at>now() or (d.ends_at is not null and d.ends_at<=now()) or not exists(select 1 from businesses where id=d.business_id and status='approved') then raise exception 'Tilbudet er ikke tilgjengelig'; end if;
 if p_revision is null or p_revision<>s.revision then raise exception 'Spillet er oppdatert. Last runden på nytt.' using errcode='40001'; end if;
 if s.kind<>'cheese_rhythm' or s.state->>'phase'<>'running' then raise exception 'Start rytmerunden først.'; end if;
 if clock_timestamp()<(s.state->>'started_at')::timestamptz+interval '66 seconds' then raise exception 'Spill ferdig rytmerunden først.'; end if;
 if p_taps is null or cardinality(p_taps)>128 then raise exception 'Ugyldige rytmetrykk.'; end if;
 select array_agg(round((bar*4+case when bar in (14,18,22,25,28,30) then 2.5 else 2 end)*60000/116)::int order by bar)
 into targets from unnest(array[4,6,8,10,14,16,18,20,22,24,25,26,27,28,29,30,31]) bar;
 foreach tap in array p_taps loop
  if tap is null or tap<=previous or tap<0 or tap>66207 then raise exception 'Ugyldige rytmetrykk.'; end if;
  previous:=tap;found_idx:=null;
  for idx in 1..17 loop
   if not matched[idx] and abs(targets[idx]-tap)<=130 then found_idx:=idx;exit;end if;
  end loop;
  if found_idx is null then extras:=extras+1;else matched[found_idx]:=true;hits:=hits+1;end if;
 end loop;
 result:=case when hits>=14 and extras<=5 then 'win' else 'loss' end;
 update deal_game_sessions set state=jsonb_build_object('phase','done','hits',hits,'extras',extras,'result',result),revision=revision+1,completed_at=case when result='win' then now() end where id=s.id returning * into s;
 return game_public(s);
end;
$$;
revoke all on function finish_rhythm_game(uuid,int,int[]) from public,anon;
grant execute on function finish_rhythm_game(uuid,int,int[]) to authenticated;
