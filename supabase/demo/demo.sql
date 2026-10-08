-- FullTime: datos de demostración para Prueba FC (8-oct-2026). Solo datos, no cambia la estructura.
do $$
declare
  v_user uuid; v_club uuid; v_cat uuid; v_pid uuid; v_cu uuid; v_me uuid;
begin
  select id into v_user from auth.users where email = 'fulltimeapp.pa@gmail.com';
  select club_id into v_club from club_members where user_id = v_user;
  if v_club is null then raise exception 'No encontré tu club'; end if;
  -- Correr como Bárbara (dueña del club), para que las reglas de asistencia lo permitan
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  select id into v_cat from categories where club_id = v_club order by created_at limit 1;
  update clubs set name = 'Prueba FC' where id = v_club;
  update categories set name = 'Sub-18 Femenino' where id = v_cat;
  -- Todo el plantel en la categoría Sub-18
  update players set category_id = v_cat where club_id = v_club;
  -- Limpiar convocatorias de prueba anteriores (las respuestas se borran con ellas)
  delete from call_ups where club_id = v_club;
  -- Quitar jugadoras demo de una corrida anterior, si la hubo
  delete from players where club_id = v_club and email like '%@ejemplo.com';
  select id into v_me from players where club_id = v_club and user_id is not null order by created_at limit 1;

  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Ana Lucía Pérez', 'ana.demo1@ejemplo.com', 1, 'portera', '6285-3012', '2010-08-11');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Valeria Gómez', 'valeria.demo2@ejemplo.com', 2, 'defensa', '6345-4243', '2009-11-16');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Camila Rodríguez', 'camila.demo3@ejemplo.com', 3, 'defensa', '6287-8860', '2009-08-09');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Sofía Castillo', 'sofia.demo4@ejemplo.com', 4, 'defensa', '6300-5158', '2010-02-11');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Daniela Herrera', 'daniela.demo5@ejemplo.com', 5, 'defensa', '6634-3856', '2008-03-08');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Mariana Vásquez', 'mariana.demo6@ejemplo.com', 6, 'mediocampista', '6305-6988', '2010-09-07');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Isabella Moreno', 'isabella.demo7@ejemplo.com', 8, 'mediocampista', '6929-9088', '2008-12-10');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Lucía Sánchez', 'lucia.demo8@ejemplo.com', 10, 'mediocampista', '6371-1109', '2009-07-08');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Gabriela Ríos', 'gabriela.demo9@ejemplo.com', 14, 'mediocampista', '6890-7650', '2010-06-19');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Natalia Batista', 'natalia.demo10@ejemplo.com', 15, 'mediocampista', '6686-9630', '2009-05-20');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Andrea Quintero', 'andrea.demo11@ejemplo.com', 7, 'delantera', '6825-5967', '2010-02-10');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Paola Jiménez', 'paola.demo12@ejemplo.com', 9, 'delantera', '6588-9204', '2008-08-22');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Karla Ortega', 'karla.demo13@ejemplo.com', 11, 'delantera', '6913-3625', '2008-04-21');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Fernanda Díaz', 'fernanda.demo14@ejemplo.com', 17, 'delantera', '6802-8159', '2008-07-17');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Michelle Torres', 'michelle.demo15@ejemplo.com', 12, 'portera', '6591-2658', '2010-04-19');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Alejandra Núñez', 'alejandra.demo16@ejemplo.com', 16, 'defensa', '6365-9752', '2009-11-18');
  insert into players (club_id, category_id, full_name, email, jersey_number, position, phone, birth_date) values (v_club, v_cat, 'Yarelis Cedeño', 'yarelis.demo17@ejemplo.com', 19, 'delantera', '6580-2453', '2009-03-16');
  update players set jersey_number = 20, position = 'mediocampista' where id = v_me and jersey_number is null;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'partido', '2026-10-10T15:00:00-05:00', null, '2026-10-10T14:00:00-05:00', 'Estadio Rommel Fernández, cancha 2', null, 'Uniforme rojo. Traer canilleras y agua.', v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  -- 12 van, 2 no van, 3 la abrieron sin responder; la Jugadora Prueba queda sin abrir
  update call_up_players cp set status='going', read_at=now()-interval '20 hours', responded_at=now()-interval '19 hours'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (1,2,3,4,5,6,8,10,7,9,11,17);
  update call_up_players cp set status='declined', reason='Tengo examen de química ese día', read_at=now()-interval '18 hours', responded_at=now()-interval '18 hours'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number = 14;
  update call_up_players cp set status='declined', reason='Viaje familiar a Chiriquí', read_at=now()-interval '10 hours', responded_at=now()-interval '10 hours'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number = 15;
  update call_up_players cp set read_at=now()-interval '5 hours'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,16,19);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-01T18:30:00-05:00', '2026-09-01T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Salida con balón desde atrás', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (17,3,4);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-03T18:00:00-05:00', '2026-09-03T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Presión alta y recuperación', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,7);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-04T18:00:00-05:00', '2026-09-04T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Definición y remates', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (19,1,3,14,12);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-08T18:30:00-05:00', '2026-09-08T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Transiciones rápidas', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (17,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-10T18:00:00-05:00', '2026-09-10T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Balón parado: córners y tiros libres', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (6,14,7,3,5);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-11T18:00:00-05:00', '2026-09-11T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Posesión en espacios reducidos', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,5,6,16,19);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-15T18:30:00-05:00', '2026-09-15T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Salida con balón desde atrás', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (5,15,12,9);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-17T18:00:00-05:00', '2026-09-17T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Presión alta y recuperación', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (15,5);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-18T18:00:00-05:00', '2026-09-18T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Definición y remates', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (15,1,9);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-22T18:30:00-05:00', '2026-09-22T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Transiciones rápidas', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (4,1,14,10,16);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-24T18:00:00-05:00', '2026-09-24T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Balón parado: córners y tiros libres', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (15,14,8,10);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-25T18:00:00-05:00', '2026-09-25T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Posesión en espacios reducidos', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (15,5,4,3,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-09-29T18:30:00-05:00', '2026-09-29T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Salida con balón desde atrás', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,10,8);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-01T18:00:00-05:00', '2026-10-01T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Presión alta y recuperación', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (3,12);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-02T18:00:00-05:00', '2026-10-02T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Definición y remates', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (19,5,16);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-06T18:30:00-05:00', '2026-10-06T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Transiciones rápidas', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '30 days', responded_at=now()-interval '30 days', attended=true, attended_at=now()-interval '30 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='No puede venir'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (9,3,17);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-08T18:00:00-05:00', '2026-10-08T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Balón parado: córners y tiros libres', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '2 days', responded_at=now()-interval '2 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (1,2,3,5,6,7,8,9,10,11,17,4,16);
  update call_up_players cp set read_at=now()-interval '1 day'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-09T18:00:00-05:00', '2026-10-09T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Posesión en espacios reducidos', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '2 days', responded_at=now()-interval '2 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (1,2,3,5,6,7,8,9,10,11,17,4,16);
  update call_up_players cp set read_at=now()-interval '1 day'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-13T18:30:00-05:00', '2026-10-13T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Salida con balón desde atrás', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '2 days', responded_at=now()-interval '2 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (1,2,3,5,6,7,8,9,10,11,17,4,16);
  update call_up_players cp set read_at=now()-interval '1 day'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-15T18:00:00-05:00', '2026-10-15T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Presión alta y recuperación', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '2 days', responded_at=now()-interval '2 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (1,2,3,5,6,7,8,9,10,11,17,4,16);
  update call_up_players cp set read_at=now()-interval '1 day'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-16T18:00:00-05:00', '2026-10-16T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Definición y remates', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '2 days', responded_at=now()-interval '2 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (1,2,3,5,6,7,8,9,10,11,17,4,16);
  update call_up_players cp set read_at=now()-interval '1 day'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (12,14);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-20T18:30:00-05:00', '2026-10-20T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Transiciones rápidas', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-22T18:00:00-05:00', '2026-10-22T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Balón parado: córners y tiros libres', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-23T18:00:00-05:00', '2026-10-23T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Posesión en espacios reducidos', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-27T18:30:00-05:00', '2026-10-27T20:00:00-05:00', null, 'Cancha sintética de Albrook', 'Salida con balón desde atrás', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-29T18:00:00-05:00', '2026-10-29T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Presión alta y recuperación', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'entreno', '2026-10-30T18:00:00-05:00', '2026-10-30T19:30:00-05:00', null, 'Cancha sintética de Albrook', 'Definición y remates', null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'partido', '2026-09-12T15:00:00-05:00', null, '2026-09-12T14:00:00-05:00', 'Cancha de Juan Díaz', null, null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '20 days', responded_at=now()-interval '20 days', attended=true, attended_at=now()-interval '20 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='Lesión leve'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (9,6,16);
  insert into call_ups (club_id, category_id, kind, starts_at, ends_at, meet_at, place, objetivo, note, created_by) values (v_club, v_cat, 'partido', '2026-09-26T15:00:00-05:00', null, '2026-09-26T14:00:00-05:00', 'Estadio Maracaná, El Chorrillo', null, null, v_user) returning id into v_cu;
  insert into call_up_players (call_up_id, player_id, remind_night_before_at, remind_soon_at) select v_cu, id, now(), now() from players where club_id = v_club;
  update call_up_players cp set status='going', read_at=now()-interval '20 days', responded_at=now()-interval '20 days', attended=true, attended_at=now()-interval '20 days'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu;
  update call_up_players cp set attended=false, status='declined', reason='Lesión leve'
    from players p where cp.player_id=p.id and cp.call_up_id=v_cu and p.jersey_number in (4,14,2);
  raise notice 'Demo lista';
end $$;
select (select count(*) from players p join club_members m on m.club_id=p.club_id join auth.users u on u.id=m.user_id where u.email='fulltimeapp.pa@gmail.com') as jugadoras,
       (select count(*) from call_ups c join club_members m on m.club_id=c.club_id join auth.users u on u.id=m.user_id where u.email='fulltimeapp.pa@gmail.com') as convocatorias;
