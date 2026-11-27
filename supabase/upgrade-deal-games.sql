    -- Kjør én gang i eksisterende pilotdatabase. Tidligere tilbud krever ikke spill.
    begin;
    set search_path = public, extensions;
    alter table deals add column requires_game boolean not null default false;
    create table deal_game_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    deal_id uuid not null references deals(id) on delete cascade,
    kind text not null check(kind in ('memory','tic_tac_toe','rock_paper_scissors','burgers','kebab')),
    state jsonb not null,
    revision int not null default 0,
    completed_at timestamptz,
    consumed_at timestamptz,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
    );
    create unique index game_session_open on deal_game_sessions(user_id,deal_id) where consumed_at is null;
    create index game_session_capacity on deal_game_sessions(deal_id,expires_at) where consumed_at is null;
    alter table deal_game_sessions enable row level security;
    revoke all on deal_game_sessions from public, anon, authenticated;

    create function game_public(s deal_game_sessions) returns jsonb language plpgsql stable
    set search_path = public, extensions as $$
    declare v_state jsonb:=s.state; faces jsonb:='[]'; i int;
    begin
    if s.kind='memory' then
    for i in 0..5 loop
    faces:=faces || jsonb_build_array(case when (v_state->'matched') @> to_jsonb(array[i]) or (v_state->'revealed') @> to_jsonb(array[i]) then v_state->'board'->i else 'null'::jsonb end);
    end loop;
    v_state:=(v_state-'board')||jsonb_build_object('faces',faces);
    end if;
    return jsonb_build_object('id',s.id,'kind',s.kind,'state',v_state,'revision',s.revision,'completed',s.completed_at is not null,'expires_at',s.expires_at);
    end;
    $$;
    create function game_ttt_result(board jsonb) returns text language plpgsql immutable
    set search_path = public, extensions as $$
    declare line int[]; mark text;
    begin
    foreach line slice 1 in array array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]] loop
    mark:=board->>line[1];
    if mark<>'' and mark=board->>line[2] and mark=board->>line[3] then return mark; end if;
    end loop;
    if not board @> '[""]'::jsonb then return 'draw'; end if;
    return '';
    end;
    $$;
    create function start_deal_game(p_deal_id uuid) returns jsonb
    language plpgsql security definer set search_path = public, extensions as $$
    declare d deals; s deal_game_sessions; v_kind text; v_state jsonb; board jsonb; used int;
    begin
    if auth.uid() is null then raise exception 'Du må være logget inn' using errcode='28000'; end if;
    select * into d from deals where id=p_deal_id for update;
    if not found or not d.requires_game or d.status<>'active' or d.starts_at>now() or (d.ends_at is not null and d.ends_at<=now())
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
    v_kind:=(array['memory','tic_tac_toe','rock_paper_scissors','burgers','kebab'])[1+floor(random()*5)::int];
    if v_kind='memory' then
    select jsonb_agg(n order by random()) into board from unnest(array[0,0,1,1,2,2]) n;
    v_state:=jsonb_build_object('board',board,'matched','[]'::jsonb,'revealed','[]'::jsonb,'pending',-1);
    elsif v_kind='tic_tac_toe' then v_state:=jsonb_build_object('board',to_jsonb(array['','','','','','','','','']),'result','');
    elsif v_kind='rock_paper_scissors' then v_state:='{"rounds":0}';
    elsif v_kind='burgers' then v_state:='{"stages":[0,0,0]}';
    else v_state:='{"cuts":0}'; end if;
    insert into deal_game_sessions(user_id,deal_id,kind,state,expires_at) values(auth.uid(),d.id,v_kind,v_state,least(now()+interval '1 hour',coalesce(d.ends_at,'infinity'::timestamptz))) returning * into s;
    return game_public(s);
    end;
    $$;
    create function play_deal_game(p_session_id uuid,p_revision int,p_action int) returns jsonb
    language plpgsql security definer set search_path = public, extensions as $$
    declare s deal_game_sessions; d deals; st jsonb; board jsonb; matched jsonb; pending int; bot int; rounds int; stage int; result text; done boolean:=false;
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
    if s.kind='memory' then
    matched:=st->'matched'; pending:=(st->>'pending')::int;
    if p_action not between 0 and 5 or matched @> to_jsonb(array[p_action]) or p_action=pending then raise exception 'Ugyldig spilltrekk.'; end if;
    if pending<0 then st:=st||jsonb_build_object('pending',p_action,'revealed',jsonb_build_array(p_action));
    else
    if st->'board'->pending=st->'board'->p_action then matched:=matched||jsonb_build_array(pending,p_action); end if;
    st:=st||jsonb_build_object('pending',-1,'revealed',jsonb_build_array(pending,p_action),'matched',matched);
    done:=jsonb_array_length(matched)=6;
    end if;
    elsif s.kind='tic_tac_toe' then
    board:=st->'board';
    if p_action not between 0 and 8 or board->>p_action<>'' then raise exception 'Ugyldig spilltrekk.'; end if;
    board:=jsonb_set(board,array[p_action::text],'"X"'); result:=game_ttt_result(board);
    if result='' then
    select i into bot from generate_series(0,8) i where board->>i='' order by random() limit 1;
    board:=jsonb_set(board,array[bot::text],'"O"');result:=game_ttt_result(board);
    end if;
    st:=jsonb_build_object('board',board,'result',result);done:=result<>'';
    elsif s.kind='rock_paper_scissors' then
    if p_action not between 0 and 2 then raise exception 'Ugyldig spilltrekk.'; end if;
    bot:=floor(random()*3)::int;rounds:=(st->>'rounds')::int+1;
    st:=jsonb_build_object('rounds',rounds,'player',p_action,'computer',bot,'result',case when bot=p_action then 'draw' when (p_action-bot+3)%3=1 then 'win' else 'loss' end);done:=rounds=3;
    elsif s.kind='burgers' then
    if p_action not between 0 and 2 then raise exception 'Ugyldig spilltrekk.'; end if;
    stage:=(st->'stages'->>p_action)::int;
    if stage>=2 then raise exception 'Ugyldig spilltrekk.'; end if;
    st:=jsonb_set(st,array['stages',p_action::text],to_jsonb(stage+1));done:=st->'stages'='[2,2,2]'::jsonb;
    else
    stage:=(st->>'cuts')::int;
    if p_action=0 and stage<5 then st:=jsonb_build_object('cuts',stage+1);
    elsif p_action=1 and stage=5 then done:=true;
    else raise exception 'Ugyldig spilltrekk.'; end if;
    end if;
    update deal_game_sessions set state=st,revision=revision+1,completed_at=case when done then now() end where id=s.id returning * into s;
    return game_public(s);
    end;
    $$;
    create function require_completed_deal_game() returns trigger language plpgsql security definer
    set search_path = public, extensions as $$
    declare d deals; s deal_game_sessions; used int;
    begin
    select * into d from deals where id=new.deal_id for update;
    if not d.requires_game then return new; end if;
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
    create trigger require_completed_deal_game before insert on deal_redemptions for each row execute function require_completed_deal_game();
    revoke all on function game_public(deal_game_sessions),game_ttt_result(jsonb),require_completed_deal_game(),start_deal_game(uuid),play_deal_game(uuid,int,int) from public,anon,authenticated;
    grant execute on function start_deal_game(uuid),play_deal_game(uuid,int,int) to authenticated;

    commit;
