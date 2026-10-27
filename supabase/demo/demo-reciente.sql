-- FullTime: demo "al día" para Prueba FC (27-oct-2026). Solo datos, no cambia la estructura.
-- Se arma con la fecha del día en que se corre, así la demo siempre tiene:
--   · el partido del próximo sábado contra UMECIT, con 11 confirmadas, 2 que no van (con motivo),
--     2 que lo abrieron sin responder, la lesionada y la Jugadora Prueba sin abrir; hoja con alineación SIN publicar.
--   · los 3 sábados anteriores con hoja completa (resultado, alineación, goles, tarjetas, cambios):
--     ganado 2-1, empate 1-1 y perdido 0-2 → Estadísticas con números.
--   · entrenos martes y jueves de las 3 semanas pasadas con asistencia, wellness y RPE → Bienestar y carga.
--   · entrenos de las 2 semanas que vienen con wellness y RPE activados.
--   · una lesionada (#7), una lesión vieja con alta (#4), una sancionada (#8, roja del último partido)
--     y una en duda (#12, gripe).
-- Se puede correr las veces que quieras: borra lo que armó la vez anterior (convocatorias desde hace
-- 30 días en adelante, lesiones y estados de las jugadoras de ejemplo) y lo vuelve a crear.
-- Necesita que antes se haya corrido supabase/demo/demo.sql (crea las 17 jugadoras de ejemplo).
do $$
declare
  v_user uuid; v_club uuid; v_cat uuid; v_me uuid; v_cu uuid;
  hoy date := (now() AT TIME ZONE 'America/Panama')::date;
  ult_sab date; prox_sab date; d date; k int; w int;
  rivales text[] := ARRAY['Santa Fe F.C.', 'Tevi Coclé F.C.', 'C.D. Origen'];
  goles_f int[] := ARRAY[0, 1, 2]; goles_c int[] := ARRAY[2, 1, 1];
  -- Lugar en la cancha (4-3-3) por dorsal: portera, 4 defensas, 3 medias, 3 delanteras.
  pos_x numeric[] := ARRAY[50, 20, 40, 60, 80, 25, 25, 50, 50, 75, 75];
  pos_y numeric[] := ARRAY[89, 74, 74, 74, 74, 45.5, 17, 45.5, 17, 45.5, 17];
  r record;
begin
  select id into v_user from auth.users where email = 'fulltimeapp.pa@gmail.com';
  select club_id into v_club from club_members where user_id = v_user;
  if v_club is null then raise exception 'No encontré tu club'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  select id into v_cat from categories where club_id = v_club order by created_at limit 1;
  if (select count(*) from players where club_id = v_club and email like '%@ejemplo.com') < 17 then
    raise exception 'Primero corre supabase/demo/demo.sql (faltan las jugadoras de ejemplo)';
  end if;
  select id into v_me from players where club_id = v_club and user_id is not null order by created_at limit 1;

  -- Limpiar lo de la corrida anterior
  delete from call_ups where club_id = v_club and starts_at >= (hoy - 30)::timestamp AT TIME ZONE 'America/Panama';
  delete from player_injuries where player_id in (select id from players where club_id = v_club and email like '%@ejemplo.com');
  delete from player_statuses where player_id in (select id from players where club_id = v_club and email like '%@ejemplo.com');

  -- Sábados: el último que ya pasó y el próximo (al menos en 2 días)
  ult_sab := hoy - ((extract(isodow from hoy)::int + 1) % 7);
  if ult_sab = hoy then ult_sab := hoy - 7; end if;
  prox_sab := ult_sab + 7;
  if prox_sab < hoy + 2 then prox_sab := prox_sab + 7; end if;

  -- ===== Partidos jugados (de más viejo a más nuevo) =====
  for k in 1..3 loop
    d := ult_sab - 7 * (3 - k);
    insert into call_ups (club_id, category_id, kind, starts_at, meet_at, place, note, created_by)
    values (v_club, v_cat, 'partido', (d + time '15:00') AT TIME ZONE 'America/Panama', (d + time '14:00') AT TIME ZONE 'America/Panama',
            'Estadio Rommel Fernández, cancha 2', 'Uniforme rojo. Traer canilleras y agua.', v_user)
    returning id into v_cu;
    insert into call_up_players (call_up_id, player_id, status, read_at, responded_at, attended, attended_at)
    select v_cu, p.id, 'going', (d - 2)::timestamp, (d - 2)::timestamp, true, (d + time '15:00')
    from players p where p.club_id = v_club and p.category_id = v_cat;
    insert into match_reports (call_up_id, club_id, opponent, competition, duration_min, field_size, formation, lineup_published, notes)
    values (v_cu, v_club, rivales[k], 'LFF', 90, 11, '4-3-3', true,
            CASE k WHEN 1 THEN 'Nos costó salir jugando. Mejorar la presión tras pérdida.'
                   WHEN 2 THEN 'Buen segundo tiempo. Empate justo.'
                   ELSE 'Gran partido. La presión alta funcionó.' END);
    -- Titulares 1 a 11 en su lugar, suplentes 12 a 17
    insert into match_lineup (call_up_id, player_id, club_id, role, pos_x, pos_y)
    select v_cu, p.id, v_club, 'titular', pos_x[p.jersey_number], pos_y[p.jersey_number]
    from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number between 1 and 11;
    insert into match_lineup (call_up_id, player_id, club_id, role)
    select v_cu, p.id, v_club, 'suplente'
    from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number between 12 and 17;
    -- Goles a favor (9 y 11 las goleadoras), goles en contra, una amarilla y dos cambios por partido
    for w in 1..goles_f[k] loop
      insert into match_events (call_up_id, club_id, kind, minute, player_id)
      select v_cu, v_club, 'gol', 20 + 25 * w, p.id from players p
      where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = CASE WHEN w = 1 THEN 9 ELSE 11 END;
    end loop;
    for w in 1..goles_c[k] loop
      insert into match_events (call_up_id, club_id, kind, minute) values (v_cu, v_club, 'gol_contra', 30 + 30 * w);
    end loop;
    insert into match_events (call_up_id, club_id, kind, minute, player_id)
    select v_cu, v_club, 'amarilla', 38, p.id from players p
    where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = CASE k WHEN 1 THEN 3 WHEN 2 THEN 6 ELSE 2 END;
    insert into match_events (call_up_id, club_id, kind, minute, player_id, player_in_id)
    select v_cu, v_club, 'cambio', 60, sale.id, entra.id
    from players sale, players entra
    where sale.club_id = v_club and entra.club_id = v_club and sale.email like '%@ejemplo.com' and entra.email like '%@ejemplo.com'
      and sale.jersey_number = 7 and entra.jersey_number = 14;
    insert into match_events (call_up_id, club_id, kind, minute, player_id, player_in_id)
    select v_cu, v_club, 'cambio', 72, sale.id, entra.id
    from players sale, players entra
    where sale.club_id = v_club and entra.club_id = v_club and sale.email like '%@ejemplo.com' and entra.email like '%@ejemplo.com'
      and sale.jersey_number = 10 and entra.jersey_number = 16;
    -- Último partido: roja a la #8 (por eso queda sancionada)
    if k = 3 then
      insert into match_events (call_up_id, club_id, kind, minute, player_id)
      select v_cu, v_club, 'roja', 81, p.id from players p
      where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = 8;
    end if;
  end loop;

  -- ===== Próximo partido: el momento estrella de la demo =====
  insert into call_ups (club_id, category_id, kind, starts_at, meet_at, place, note, created_by)
  values (v_club, v_cat, 'partido', (prox_sab + time '15:00') AT TIME ZONE 'America/Panama', (prox_sab + time '14:00') AT TIME ZONE 'America/Panama',
          'Estadio Rommel Fernández, cancha 2', 'Uniforme rojo. Traer canilleras y agua.', v_user)
  returning id into v_cu;
  insert into call_up_players (call_up_id, player_id)
  select v_cu, p.id from players p where p.club_id = v_club and p.category_id = v_cat
    and coalesce(p.jersey_number, 0) <> 8;  -- la sancionada no va convocada
  update call_up_players cp set status = 'going', read_at = now() - interval '20 hours', responded_at = now() - interval '19 hours'
  from players p where cp.player_id = p.id and cp.call_up_id = v_cu and p.jersey_number in (1, 2, 3, 4, 5, 6, 9, 10, 11, 14, 17);
  update call_up_players cp set status = 'declined', reason = 'Tengo examen de química ese día', read_at = now() - interval '18 hours', responded_at = now() - interval '18 hours'
  from players p where cp.player_id = p.id and cp.call_up_id = v_cu and p.jersey_number = 15;
  update call_up_players cp set status = 'declined', reason = 'Viaje familiar a Chiriquí', read_at = now() - interval '10 hours', responded_at = now() - interval '10 hours'
  from players p where cp.player_id = p.id and cp.call_up_id = v_cu and p.jersey_number = 16;
  update call_up_players cp set read_at = now() - interval '5 hours'
  from players p where cp.player_id = p.id and cp.call_up_id = v_cu and p.jersey_number in (12, 19);
  -- La #7 sale convocada aunque está lesionada: así se ve el aviso al convocar
  insert into match_reports (call_up_id, club_id, opponent, competition, duration_min, field_size, formation, lineup_published)
  values (v_cu, v_club, 'UMECIT F.C.', 'LFF', 90, 11, '4-3-3', false);
  insert into match_lineup (call_up_id, player_id, club_id, role, pos_x, pos_y)
  -- La #14 entra en el lugar de la #7 (lesionada) y la #17 en el de la #8 (sancionada)
  select v_cu, p.id, v_club, 'titular', pos_x[CASE p.jersey_number WHEN 14 THEN 7 WHEN 17 THEN 8 ELSE p.jersey_number END],
         pos_y[CASE p.jersey_number WHEN 14 THEN 7 WHEN 17 THEN 8 ELSE p.jersey_number END]
  from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number in (1, 2, 3, 4, 5, 6, 9, 10, 11, 14, 17);

  -- ===== Entrenos martes y jueves: 3 semanas pasadas y 2 que vienen =====
  for d in select g::date from generate_series(hoy - 21, hoy + 14, interval '1 day') g where extract(isodow from g) in (2, 4) loop
    insert into call_ups (club_id, category_id, kind, starts_at, ends_at, place, objetivo, wellness_enabled, rpe_enabled, created_by)
    values (v_club, v_cat, 'entreno', (d + time '18:00') AT TIME ZONE 'America/Panama', (d + time '19:30') AT TIME ZONE 'America/Panama',
            'Cancha sintética de Albrook',
            (ARRAY['Salida con balón desde atrás', 'Presión alta y recuperación', 'Definición y remates', 'Balón parado: córners y tiros libres', 'Transiciones rápidas'])[1 + (extract(doy from d)::int % 5)],
            true, true, v_user)
    returning id into v_cu;
    -- La Jugadora Prueba (tu iPhone) no va a los entrenos que vienen, para que no te lleguen recordatorios
    insert into call_up_players (call_up_id, player_id)
    select v_cu, p.id from players p where p.club_id = v_club and p.category_id = v_cat
      and (d < hoy or p.id is distinct from v_me);
    if d < hoy then
      -- Ya pasó: casi todas fueron; 2 faltaron con motivo
      update call_up_players cp set status = 'going', read_at = (d - 1)::timestamp, responded_at = (d - 1)::timestamp, attended = true, attended_at = (d + time '18:00')
      from players p where cp.player_id = p.id and cp.call_up_id = v_cu;
      update call_up_players cp set status = 'declined', reason = 'Exámenes en el colegio', attended = false
      from players p where cp.player_id = p.id and cp.call_up_id = v_cu
        and p.jersey_number in (1 + (extract(doy from d)::int % 19), 1 + ((extract(doy from d)::int + 7) % 19));
      -- Wellness (5 preguntas del 1 al 5) y RPE (del 1 al 10) de las que fueron
      for r in
        select p.id, p.jersey_number j from players p join call_up_players cp on cp.player_id = p.id
        where cp.call_up_id = v_cu and cp.attended
      loop
        insert into form_responses (call_up_id, player_id, club_id, kind, answers, score, submitted_at)
        select v_cu, r.id, v_club, 'wellness',
               jsonb_build_array(
                 jsonb_build_object('id', 'sueno', 'label', '¿Cómo dormiste?', 'type', 'escala5', 'value', s.sueno),
                 jsonb_build_object('id', 'energia', 'label', '¿Cómo está tu energía?', 'type', 'escala5', 'value', s.energia),
                 jsonb_build_object('id', 'animo', 'label', '¿Cómo te sientes de ánimo?', 'type', 'escala5', 'value', s.animo),
                 jsonb_build_object('id', 'dolor', 'label', '¿Tienes molestias o dolor muscular?', 'type', 'escala5', 'value', s.dolor, 'invert', true),
                 jsonb_build_object('id', 'estres', 'label', '¿Qué tan estresada estás?', 'type', 'escala5', 'value', s.estres, 'invert', true)),
               round((s.sueno + s.energia + s.animo + (6 - s.dolor) + (6 - s.estres)) / 5.0, 2),
               (d + time '16:30') AT TIME ZONE 'America/Panama'
        from (select
                -- La #9 viene mal (dormir poco y dolor): sale en "Para mirar"
                CASE WHEN r.j = 9 THEN 2 ELSE 3 + ((r.j + extract(doy from d)::int) % 3) END AS sueno,
                CASE WHEN r.j = 9 THEN 2 ELSE 3 + ((r.j * 2 + extract(doy from d)::int) % 3) END AS energia,
                CASE WHEN r.j = 9 THEN 2 ELSE 3 + ((r.j + 1) % 3) END AS animo,
                CASE WHEN r.j = 9 THEN 5 ELSE 1 + ((r.j + extract(doy from d)::int) % 3) END AS dolor,
                CASE WHEN r.j = 9 THEN 4 ELSE 1 + ((r.j * 3 + extract(doy from d)::int) % 3) END AS estres) s;
        insert into form_responses (call_up_id, player_id, club_id, kind, answers, score, submitted_at)
        select v_cu, r.id, v_club, 'rpe',
               jsonb_build_array(
                 jsonb_build_object('id', 'rpe', 'label', '¿Qué tan exigente sentiste el entreno?', 'type', 'escala10', 'value', x.rpe),
                 jsonb_build_object('id', 'comentario', 'label', '¿Algo que quieras contarle al Profe?', 'type', 'texto', 'value', NULL)),
               x.rpe, (d + time '20:00') AT TIME ZONE 'America/Panama'
        from (select 5 + ((r.j + extract(doy from d)::int) % 4) AS rpe) x;
      end loop;
    else
      -- Todavía no pasa: unas confirmaron, otras no
      update call_up_players cp set status = 'going', read_at = now() - interval '1 day', responded_at = now() - interval '1 day'
      from players p where cp.player_id = p.id and cp.call_up_id = v_cu and p.jersey_number between 1 and 11;
    end if;
  end loop;

  -- ===== Lesiones y estados =====
  insert into player_injuries (player_id, club_id, body_side, pos_x, pos_y, zone, laterality, injury_type, description, injured_on, expected_return)
  select p.id, v_club, 'espalda', 40, 55, 'muslo_posterior', 'derecha', 'desgarro', 'Sintió un pinchazo en un pique en el entreno.', hoy - 10, hoy + 10
  from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = 7;
  insert into player_injuries (player_id, club_id, body_side, pos_x, pos_y, zone, laterality, injury_type, description, injured_on, expected_return, returned_on)
  select p.id, v_club, 'frente', 38, 90, 'tobillo', 'derecha', 'esguince', 'Se dobló el tobillo en el partido.', hoy - 45, hoy - 30, hoy - 28
  from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = 4;
  insert into player_statuses (player_id, club_id, status, note, matches, since)
  select p.id, v_club, 'sancionada', 'Roja contra C.D. Origen', 1, ult_sab
  from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = 8;
  insert into player_statuses (player_id, club_id, status, note, since, until)
  select p.id, v_club, 'duda', 'Gripe', hoy - 1, hoy + 2
  from players p where p.club_id = v_club and p.email like '%@ejemplo.com' and p.jersey_number = 12;
end $$;

-- Para confirmar que quedó bien
select
  (select count(*) from call_ups c join club_members m on m.club_id = c.club_id join auth.users u on u.id = m.user_id
    where u.email = 'fulltimeapp.pa@gmail.com' and c.kind = 'partido' and c.starts_at >= now() - interval '30 days') as partidos,
  (select count(*) from call_ups c join club_members m on m.club_id = c.club_id join auth.users u on u.id = m.user_id
    where u.email = 'fulltimeapp.pa@gmail.com' and c.kind = 'entreno' and c.starts_at >= now() - interval '30 days') as entrenos,
  (select count(*) from form_responses f join club_members m on m.club_id = f.club_id join auth.users u on u.id = m.user_id
    where u.email = 'fulltimeapp.pa@gmail.com') as respuestas_wellness_rpe;
