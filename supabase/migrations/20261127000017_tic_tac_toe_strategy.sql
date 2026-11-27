-- Smartere motstander. Eksisterende runder og QR-koder beholdes.
set search_path = public, extensions;
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
