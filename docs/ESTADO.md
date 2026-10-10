# Estado de FullTime

Última actualización: 9 de octubre de 2026.

**Resumen:** las 8 tareas del plan están hechas y publicadas en https://fulltimeapp.vercel.app.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Código | GitHub `fulltimeapp-pa/FullTime`, rama `main` |
| Web | https://fulltimeapp.vercel.app (Vercel, proyecto `full-time`, cuenta de fulltimeapp-pa) |
| Base de datos | Supabase propio, proyecto `jfsmdbsocbeqxgdygrwk` (us-east-1, plan Free) |
| Lovable | Ya no se usa. Los dos proyectos viejos siguen ahí, pero no están conectados a nada nuevo |

Cada push a `main` publica solo en Vercel.

## Hecho

### Tarea 0 — Diagnóstico (28-sep)
- Había dos proyectos FullTime en Lovable con bases distintas; el publicado no era el de GitHub.
- En la base de Lovable nadie con sesión podía leer convocatorias (permiso faltante en
  `is_club_member`, `is_club_staff`, `is_player_self`). Por eso había 0 convocatorias.
- Una jugadora no puede estar en dos clubes: `club_members` tiene `UNIQUE (user_id)`.

### Mudanza de Lovable a GitHub + Vercel + Supabase propio (28/29-sep)
Reemplaza la Tarea 1.
- `supabase/migrations/20260915000000_esquema_base.sql`: esquema completo copiado de Lovable.
- `supabase/migrations/20260928120000_permisos_funciones_rls.sql`: arregla el permiso faltante y
  agrega `call_up_players` a Realtime (el profe ve respuestas en vivo).
- Fotos de la portada copiadas a `public/img/` (antes vivían en Lovable).
- Entrar con Google usa Supabase directo (antes pasaba por Lovable).
- URL pública en un solo lugar: `VITE_SITE_URL` en `.env.production`.
- Quitada la llave VAPID de respaldo en `src/lib/push.ts`: si falta, error claro.
- Build con preset `vercel` en `vite.config.ts`.
- Portada: la caja "Lo que viene" ya no se desborda y el menú usa hamburguesa hasta 1024px.
- TypeScript: 0 errores.

### Tarea 2 — Privacidad de menores (30-sep)
- `players`: la jugadora solo ve su propia ficha (migración de Lovable del 15-sep, ya aplicada).
- `call_up_players`: nueva migración `20260930120000_respuestas_solo_staff_o_propia.sql`. La
  jugadora solo lee su propia respuesta; motivo de "No puedo", bienestar, RPE y asistencia de las
  compañeras quedan solo para el cuerpo técnico. Probado con 21 casos (owner, coach, 2 jugadoras,
  extraño) en PGlite y aplicado en Supabase.
- Resultado: la jugadora hoy no ve nada de sus compañeras (ni nombre). Es más estricto que "nombre,
  foto y estado"; si algún día se quiere mostrar la lista del equipo, hacerlo con una vista que
  exponga solo esos campos.
- Nueva página pública `/privacidad` (borrador aprobado por Bárbara, pendiente de revisión legal).
  Enlazada en el pie de la portada. Contacto: fulltimeapp.pa@gmail.com.

### Entrar con Google (30-sep)
- Proyecto "FullTime" en Google Cloud (cuenta fulltimeapp.pa@gmail.com), cliente web
  "FullTime web", app publicada (solo pide nombre y correo, no requiere revisión de Google).
- Activado en Supabase → Auth → Providers → Google. Probado: entrar con Google reconoce la cuenta
  que ya existía con correo (no duplica usuario).

### Tarea 3 — Registro de punta a punta (6-oct)
- `src/routes/auth.tsx`: si la persona llega desde una invitación al cuerpo técnico
  (`/unirse-equipo/...`), el registro ya no pide nombre de club ni crea un club propio: crea la
  cuenta y la devuelve a la invitación para aceptarla.
- Si después de registrarse no se puede iniciar sesión (por ejemplo, si algún día se vuelve a
  exigir confirmar el correo), ahora se explica qué hacer en vez de "No pudimos crear tu club".
- `/onboarding` (crear club entrando con Google) se deja como está: los dos caminos funcionan.
- Probado en la web real (6-oct): invitación al cuerpo técnico → cuenta nueva "Pepe" → entró a
  Prueba FC como coach. En la base: 1 club, roles admin + jugadora + coach, sin club de más.
- Vercel bloqueó un deploy por una vulnerabilidad en `@tanstack/react-start` 1.168.32: se
  actualizó a 1.168.60 (con react-router y router-plugin) y se quitó `bun.lock` (ya no se usa bun).

### Tarea 4 — Rol coach (6-oct, opción A)
- Migración `20261006120000_permisos_coach.sql`: el coach maneja plantel, categorías,
  convocatorias, entrenos, plantillas y fotos de jugadoras. Solo owner/admin: nombre y escudo del
  club, invitar o quitar cuerpo técnico.
- `call-ups.$id.tsx`: el detalle muestra respuestas y botones a todo el cuerpo técnico.
- Probado con 34 casos de acceso en PGlite y en la web real con la cuenta de coach "Pepe".

### Tarea 5 — Editar y reenviar convocatoria (6-oct)
- Ya existía: editar fecha, hora, lugar y nota sin perder respuestas, con aviso de cambio.
- Nuevo: al editar se pueden sumar o quitar jugadoras (pide confirmar si se quita a alguien que
  ya respondió). Las nuevas reciben "Nueva convocatoria"; las que ya estaban, el aviso de cambio.
- Nuevo: botón "Recordar a las que no han respondido (N)" en el detalle. Dice a cuántas les llegó
  y a cuántas les faltan los avisos activados.
- Nuevo (pedido de Bárbara): en el detalle, lista gris "No convocadas" con las jugadoras del
  plantel que no están en la convocatoria (solo cuerpo técnico).
- Probado en la web real (6-oct): sumar, quitar con confirmación y recordatorio; el recordatorio
  llegó al iPhone al instante.
- `sendPush` ahora exige ser del cuerpo técnico del club (antes una jugadora podía disparar avisos
  a todo el equipo) y devuelve cuántas jugadoras tenían avisos activados (base para la Tarea 6).

### Entrenos repetidos del mes (6-oct)
- "Nuevo entreno" tiene "Un día / Varios días". En varios días: se eligen los días de la semana,
  cada uno con su hora, y "desde / hasta" (por defecto, fin de mes). Se ve la lista de fechas y
  se puede quitar alguna (feriados). Máximo 60 de una vez.
- Lógica de fechas en `src/lib/repetir.ts`, probada con 16 casos (meses, bisiesto, cambio de año,
  tres zonas horarias).
- Un solo aviso de resumen (`sendPushBulk`): "Tu profe publicó 14 entrenos · Del jue 1 oct al
  vie 30 oct". Solo cuerpo técnico.
- Panel: recuadro "Todavía no cargas los entrenos de {mes}" si no hay entrenos en el mes (desde el
  día 25 mira el mes siguiente), con botón que abre "Varios días".
- Probado en la web real (7-oct): "Varios días" creó los entrenos y llegó un solo aviso al iPhone.

### Hora de fin (7-oct)
- Migración `20261007120000_hora_fin.sql`: columna opcional `call_ups.ends_at` (debe ser después
  del inicio). Lo creado antes sigue sin hora de fin.
- Crear partido, crear entreno (un día y varios días, cada día con inicio y fin) y editar tienen
  "Empieza / Termina". Termina se sugiere 1 h 30 después y se puede cambiar.
- Se muestra "6:30 – 8:00 p. m." en detalle, listas, calendario, panel, inicio de la jugadora y en
  el aviso al celular. Funciones en `src/lib/call-ups.ts`, probadas con 9 casos.
- Ajuste (pedido de Bárbara, 7-oct): los **partidos no llevan hora de fin**, sino **hora de
  convocatoria** (a qué hora llegar) y **hora del partido**. Migración
  `20261007130000_hora_convocatoria.sql`: columna opcional `meet_at` (antes o igual al inicio).
  La convocatoria se sugiere 1 h antes. Se muestra "Convocatoria 2:00 p. m. · Partido 3:00 p. m."
  y cambiarla avisa a las jugadoras. Entrenos siguen con inicio y fin.
- `src/routeTree.gen.ts` vuelve a estar al día en el repo (le faltaba `/privacidad`). Regla: si se
  agrega una pantalla, se sube este archivo regenerado.

### Tarea 6 — ¿Le llegó el aviso? (7-oct)
- Botones: "Convocar y avisar al equipo", "Crear entreno y avisar", "Crear N entrenos y avisar".
- Al crear: mensaje "Avisamos a X de Y. A Z les faltan las notificaciones…".
- Detalle (cuerpo técnico): recuadro "X de Y reciben los avisos", con cuántas no tienen
  notificaciones y cuántas no han entrado a la app, y botón "Copiar mensaje para WhatsApp" (fecha,
  horas, lugar y link de la convocatoria).
- Cada jugadora sin responder muestra "No recibe avisos" o "Todavía no entra a la app".
- Grupos renombrados: Confirmadas · No va · La abrió, sin responder · No la ha abierto. Se mide
  que la abrió en la app, no que leyó el push.
- Servidor: `getCallUpReach` (solo cuerpo técnico) dice por jugadora si tiene cuenta y avisos, sin
  exponer datos del celular.
- La guía para instalar en iPhone ya existía (`PushOptIn` en la pantalla de inicio de la jugadora).

### Tarea 7 — Errores visibles (7-oct)
- `src/lib/errors.ts`: `translateDbError` (antes vivía en roster.tsx) y `friendlyError`. Ningún
  error crudo de la base ni en inglés en crear partido/entreno, plantel y equipo.
- Botón "Voy / No puedo": si falla, la jugadora ve "Tu profe todavía no la ve" con botón
  **Reintentar**; si sale bien, "¡Listo! Tu profe ya sabe que vas". Se revisa que de verdad se
  haya guardado la fila. Igual para wellness y RPE.
- Eliminar convocatoria, invitar jugadora, crear/borrar invitación y quitar cuerpo técnico:
  mensaje claro si fallan.
- Avisos: tabla nueva `push_log` (migración `20261007140000_push_log.sql`) con cada envío: tipo,
  a cuántas les tocaba, cuántas tienen avisos, enviados, fallidos y códigos de falla. Solo la
  dueña la lee. **Cómo verla:** Supabase → Table Editor → `push_log`. Verificado (7-oct): el
  recordatorio de prueba quedó registrado.
- Arreglos tras la prueba de Bárbara (7-oct): sin internet la app ya no saca de la sesión (usa la
  sesión guardada en el celular en vez de preguntarle a Supabase), y guardar una respuesta sin
  conexión ya no se queda colgado: falla al instante si no hay red o a los 10 segundos, con
  "Reintentar".
- Pantallas de error y de "página no encontrada" en español (`__root.tsx` y `error-page.ts`); si
  el error es por falta de internet dice "Sin conexión". `<html lang="es">`.

### Tarea 8 — Recordatorios automáticos (8-oct)
- Supabase llama cada 15 minutos a `/api/public/cron/reminders` (pg_cron + pg_net, migración
  `20261008120000_cron_recordatorios.sql`). La clave va en Supabase Vault como `cron_secret`
  (misma que `CRON_SECRET` en Vercel), nunca en el repo.
- "Unas horas antes": 3 h antes de la **hora de convocatoria** si el profe la puso, si no del
  inicio. Dice "Hoy" o "Mañana" según el día real (antes decía "Hoy" siempre).
- "Noche anterior": entre 6 y 9 p. m. de Panamá, para lo de mañana.
- Mensajes con "Convocatoria 2:00 p. m. · Partido 3:00 p. m.". Se salta a las que dijeron que no
  van. Cada envío queda en `push_log` (`auto_soon` / `auto_night`).
- Probado con 9 casos (ventana, Hoy/Mañana, convocatoria, zona horaria).
- **Probado en la vida real (8-oct):** partido con convocatoria a 2 h → llegó "Nueva convocatoria" y,
  en la siguiente vuelta, "Hoy hay partido · Convocatoria …" al iPhone.
- Activado el 8-oct desde el SQL Editor de Supabase (la herramienta de línea de comandos no
  conectaba): clave en Vault y tarea `fulltime-recordatorios` (*/15). Verificado: corrió a las
  8:45 y la app respondió 200. Ojo: esa migración no quedó marcada como aplicada en la
  herramienta; el próximo `db push` la volverá a ofrecer y es seguro aceptarla (reemplaza la
  tarea por la misma).
- Para revisar: `select status_code, content, created from net._http_response order by created
  desc limit 5;` en el SQL Editor.

### Fechas en español (8-oct, pedido de Bárbara)
- El campo de fecha del navegador mostraba mes/día/año si el navegador está en inglés. Se cambió
  por un campo propio (`src/components/ui/date-field.tsx`) que siempre muestra "jue 8 oct 2026" y
  abre un calendario en español que empieza en lunes. Usado en crear/editar partido, entrenos (un
  día, desde y hasta), fecha de nacimiento en el plantel (con selector de año) y pagos del panel.

### Panel de dueña (8-oct)
- `fulltimeapp.pa@gmail.com` agregada a `platform_admins` desde el SQL Editor. Bárbara ya entra a
  `/panel-fulltime` (botón "🛠 Panel de dueña" en su panel).

### Wellness y RPE, parte 1: formularios editables (9-oct)
- Decidido con Bárbara (a pedido de Carlos): se amplían wellness y RPE (CLAUDE.md actualizado) y se
  permite un recordatorio automático de wellness antes y de RPE después del entreno, solo a las
  convocadas que no lo llenaron, máximo uno de cada, texto del servidor. Periodo menstrual: no, por ahora.
- `/formularios` ("Wellness y RPE" en el menú): formularios tipo Google Forms. Plantillas de FullTime
  (wellness: sueño, energía, ánimo, dolor, estrés; RPE: 1–10 + comentario) que se pueden editar,
  duplicar o crear desde cero. Tipos: escala 1–5 (con "5 es malo" para dolor/estrés), escala 1–10,
  sí/no, opciones, texto. Obligatoria u opcional, ordenar, vista previa "Así lo ve la jugadora".
  ⭐ = el que se usa por defecto; al crear un entreno se puede elegir otro.
- La jugadora llena el formulario del entreno (wellness hasta la hora del entreno; RPE desde que
  empieza). El cuerpo técnico ve una tabla con el total y cada respuesta; wellness bajo (≤ 2.5) en rojo.
- Puntaje: wellness = promedio de las escalas 1–5 (las "5 es malo" cuentan al revés); RPE = la escala
  1–10. Probado (10 casos). Las respuestas guardan la pregunta tal como estaba.
- Tablas `club_forms`, `form_responses` y columnas `wellness_form_id` / `rpe_form_id` en `call_ups`
  (migración `20261010150000_formularios_wellness_rpe.sql`). Probado en PGlite (16 pruebas). Las
  respuestas viejas (columnas wellness_* y rpe) se siguen mostrando.
- Falta: aplicar la migración, probarlo en la web real, parte 2 (recordatorios) y parte 3 (historial).

### Wellness y RPE, parte 2: recordatorios automáticos (9-oct)
- En el cron de cada 15 min (`runReminders`): **wellness** cuando faltan 2 h o menos para la hora de
  referencia del entreno (convocatoria o inicio); **RPE** entre 30 min y 6 h después del fin (o de
  inicio + 90 min si no hay fin). Solo entrenos que lo piden, solo a convocadas que no dijeron que no,
  que no lo llenaron (y para RPE, que no estén marcadas como ausentes). Una vez por jugadora y entreno
  (columnas `remind_wellness_at`, `remind_rpe_at`, migración `20261010160000_recordatorio_wellness_rpe.sql`).
  Texto del servidor: "¿Cómo llegas al entreno?" / "¿Qué tan duro fue el entreno?". Se registran en
  push_log como auto_wellness / auto_rpe. Ventanas probadas (9 casos). Falta: probarlo en el celular.

### Estadísticas de temporada (9-oct)
- `/estadisticas` (menú del cuerpo técnico, "Estadísticas"): salen solo de los partidos con hoja.
  Filtros por categoría y competición. Equipo: partidos, ganados / empates / perdidos, goles a favor
  y en contra, tarjetas, goleadoras y goles por tramo de minutos. Tabla por jugadora: convocatorias,
  partidos jugados, titular, suplente que entró / que no, minutos, goles, tarjetas y lesiones;
  ordenable y con "Descargar" (CSV para Excel o Google Sheets). Lista de partidos con resultado
  (abre la hoja).
- La jugadora ve "Tu temporada" en su perfil: minutos, partidos, goles, titular, amarillas y rojas
  (siempre visibles, aunque sean 0; pedido de Bárbara). La base solo le da lo suyo.
- Probado en la web real por Bárbara (9-oct): funciona.
- Lógica en `src/lib/estadisticas.ts` (`buildSeason`), probada con 7 casos. Sin tablas nuevas.

### Hoja de partido (9-oct, idea de Carlos Rivera + revisión de goTeam)
- En cada partido, el cuerpo técnico ve "Hoja del partido" → `/hoja/<id>`: (1) datos: rival,
  **competición escrita por el entrenador** ("LFF", "Torneo Nacional Sub-16"; las que el club ya
  usó salen como botones y viene puesta la última de la categoría, igual que la duración) y notas; (2) titular / suplente de cada convocada (las que dijeron "No puedo" no salen);
  (3) incidencias con minuto: gol (con quién), **autogol del rival** (sin jugadora), **gol en
  contra** (sin jugadora), amarilla, roja, cambio (sale / entra), lesión con nota; (4) tabla de
  minutos, goles y tarjetas. Marcador arriba y "Copiar resumen" para WhatsApp.
- Resultado y minutos se calculan solos (`src/lib/hoja-partido.ts`, `summarizeMatch`): titular
  desde el 0, suplente desde que entra, sale con cambio, roja o lesión; **puede volver a entrar**
  (cambios ilimitados en juveniles) y se suman sus ratos. Probado con 9 casos.
- **Lista de competiciones del club** (pedido de Bárbara, 9-oct): "Editar lista" en la hoja para
  agregar, cambiar nombre (corrige también los partidos que la usaban) o borrar (sale de la lista; los
  partidos viejos mantienen el nombre). Una competición nueva escrita en la hoja entra sola. Tabla
  `club_competitions` (migración `20261010140000_competiciones.sql`, arranca con las ya usadas), solo
  cuerpo técnico; probado en PGlite (6 pruebas). Hoja + competiciones probadas en la web real por
  Bárbara (9-oct): funcionan.
- Al crear un partido, la app lleva directo a la hoja ("✅ Partido creado y aviso enviado") para poner
  rival, competición y titulares de una vez; goles, tarjetas y cambios se muestran desde la hora de
  convocatoria (o con "Anotar ahora de todas formas"). Todo sigue editable después del partido.
- La jugadora ve en el partido "Tus números": sus minutos, goles y tarjetas, y si salió lesionada.
- Decidido con Bárbara: el cuerpo técnico ve todo; cada jugadora solo lo suyo (sus incidencias,
  su titularidad, su lesión con la nota) y los datos generales de sus partidos; las compañeras no.
- Tablas nuevas `match_reports`, `match_lineup`, `match_events` (migración
  `20261010120000_hoja_de_partido.sql`; la competición libre en `20261010130000_hoja_competicion.sql`,
  que reemplazó el tipo fijo liga/torneo/copa/amistoso). El club lo pone la base desde la convocatoria; solo
  partidos; solo jugadoras del club. Probado en PGlite con dueña, coach, dos jugadoras y alguien de
  otro club (17 pruebas). Falta: aplicar la migración, probarla en la web real y la siguiente fase
  (estadísticas de temporada por equipo y por jugadora).

### FullTime HQ, fase 1 (8-oct)
- Zona `/hq`, solo para la dueña de la plataforma, con el menú que diseñó Bárbara: General
  (Inicio, Notificaciones, Proyectos, Clientes, Jarvis), Productividad (Tareas, Calendario,
  Reuniones, Métricas), Redes sociales (Contenido, Inbox, Automatizaciones) y Ventas (CRM,
  Cotizaciones). Lo que no está listo dice "Próximamente".
- **Inicio:** números clave, "Para hoy" (próximos pasos de hoy, de mañana o atrasados, con botón de
  WhatsApp), pruebas que vencen en 3 días o menos y clubes dormidos.
- **CRM:** columnas Contacto → Demo agendada → Demo hecha → En prueba → Pagando · Perdido. Cada
  prospecto: contacto, equipo, WhatsApp, correo, próximo paso con fecha, notas y su club cuando se
  registra. Tabla nueva `prospects` (migración `20261008150000_hq_prospectos.sql`), solo la dueña
  la ve (probado en PGlite).
- **Clientes y Métricas** siguen en `/panel-fulltime` (enlazado desde HQ y con "Volver a FullTime
  HQ"). El botón del panel del club ahora dice "🛠 FullTime HQ".
- Probado en la web real (8-oct): Bárbara agregó su primer prospecto (Carlos Rivera, Inter CF,
  demo agendada) y aparece en "Para hoy" como "Mañana".
- Siguientes fases: Jarvis (asistente con IA; antes ver el costo mensual).

### FullTime HQ: Reuniones (9-oct)
- `/hq/reuniones`: anotar cada reunión con título, fecha, con quién, prospecto del CRM, qué pasó,
  qué le gustó, qué preguntó o le preocupó y próximos pasos.
- Al guardar se puede actualizar al prospecto de una vez (etapa, próximo paso y fecha; por defecto
  "Demo agendada" pasa a "Demo hecha").
- En la ficha del prospecto del CRM sale su lista de reuniones y "+ Anotar reunión".
- Tabla nueva `meetings` (migración `20261009120000_hq_reuniones.sql`), solo la dueña la ve
  (probado en PGlite). Migración aplicada en el SQL Editor y publicado (9-oct).

### FullTime HQ: Tareas (9-oct)
- `/hq/tareas`: escribes y das Enter y queda para hoy. Grupos Atrasadas / Hoy / Próximas y
  "Ver hechas". Cada tarea: fecha opcional, urgente 🔥 y prospecto del CRM ligado.
- Las de hoy y las atrasadas salen en Inicio → "Para hoy" con botón "✅ Hecha".
- Tabla nueva `hq_tasks` (migración `20261009150000_hq_tareas.sql`), solo la dueña la ve (probado
  en PGlite). Migración aplicada y probado en la web real por Bárbara (9-oct): todo funciona.

### FullTime HQ: Calendario (9-oct)
- `/hq/calendario`: vista de mes (lunes primero) que junta tareas, próximos pasos del CRM y
  reuniones, con colores por tipo. Tocas un día y se abre una ventana con todo lo de ese día; puedes marcar tareas como hechas y
  agregar una tarea para ese día. En celular se ven puntitos; en computadora, el texto.
- No usa tablas nuevas. Probado en la web real por Bárbara (9-oct): funciona.

### FullTime HQ: Cotizaciones (9-oct)
- Precios (los de la portada, ahora en `src/lib/precios.ts` para que portada y cotización coincidan):
  Plan Equipo $9.99/mes; Plan Academia 1er equipo $9.99, 2 a 4 $7.99 c/u, del 5to $6.99 c/u.
- Decidido con Bárbara: pago de 1, 3, 6 o 12 meses en un solo pago. 3 meses −5%, 6 meses −10%,
  12 meses = 2 meses gratis. Descuento especial opcional en % (ej. "precio fundador"). Sin ITBMS
  por ahora. Pago por Yappy al +507 6991-1552; los datos de cuenta bancaria NO van en el PDF (se
  mandan por WhatsApp al confirmar).
- `/hq/cotizaciones`: lista con número (COT-0001), estado (borrador, enviada, aceptada, rechazada)
  y botón PDF. `/cotizacion/<id>`: hoja tamaño carta lista para "Guardar como PDF".
- Tabla nueva `hq_quotes` (migración `20261009170000_hq_cotizaciones.sql`); el total se guarda al
  cotizar. Solo la dueña la ve (probado en PGlite). Cálculos probados (12 meses Plan Equipo =
  $99.90; Academia 3 equipos × 12 meses = $259.70). Migración aplicada; probado en la web real por
  Bárbara (9-oct), con PDF: funciona.

### FullTime HQ: Notificaciones (9-oct)
- `/hq/notificaciones`: avisos armados con lo que ya hay (sin tabla nueva): club nuevo (últimos 30
  días), prueba que vence en 3 días o menos o ya vencida, pago que vence en 5 días o ya vencido,
  club dormido, tareas atrasadas y prospectos con el próximo paso vencido. Lo urgente primero.
- Contador rojo en el menú con los avisos nuevos. "Visto" se recuerda en ese navegador (al salir de
  la pantalla o con "Marcar todo como visto"); en otro aparato vuelven a salir como nuevos.
- Lógica en `src/lib/hq-avisos.ts` (`buildAvisos`), probada con datos de ejemplo (12 casos).
  Probado en la web real por Bárbara (9-oct): funciona.

### FullTime HQ: Proyectos (9-oct)
- `/hq/proyectos`: tarjetas con nombre, meta, fecha límite, estado (activo, en pausa, terminado),
  barra de avance ("3 de 8 tareas hechas") y próximas tareas. Al abrir uno: editarlo, agregarle
  tareas (con fecha opcional) y marcarlas como hechas. Los terminados se esconden en "Ver terminados".
- En Tareas, cada tarea puede elegir su proyecto y muestra "📁 nombre del proyecto".
- Tabla nueva `hq_projects` y columna `project_id` en `hq_tasks` (migración
  `20261009190000_hq_proyectos.sql`). Si se borra un proyecto, sus tareas quedan sueltas. Solo la
  dueña lo ve (probado en PGlite). Migración aplicada y probado en la web real por Bárbara (9-oct).
- Bárbara cargó 10 tareas en "Primeros 5 clubes" con un SQL suelto (no es migración).
- Orden manual y edición dentro del proyecto (pedido de Bárbara, 9-oct): flechas ↑ ↓ en las
  pendientes; al tocar una tarea se edita ahí mismo (nombre, fecha, urgente) o se borra. Dentro del
  proyecto manda tu orden; en Tareas, Inicio y Calendario sigue el orden por fecha. Columna
  `position` en `hq_tasks` (migración `20261009200000_hq_tareas_orden.sql`, arranca con el orden por
  fecha). Migración aplicada y probado en la web real por Bárbara (9-oct): funciona.

### FullTime HQ: Contenido (9-oct)
- `/hq/contenido`: columnas Idea → Borrador → Programada → Publicada (como las carpetas del
  Escritorio de Bárbara). Cada publicación: idea, red (Instagram, TikTok, Facebook, LinkedIn),
  formato (post, carrusel, reel, story), fecha, texto (copy) con botón Copiar y notas (ej. archivo).
  Flechas en cada tarjeta para pasarla al estado siguiente o anterior.
- En el Calendario de HQ salen las publicaciones con fecha ("Contenido"); las publicadas, tachadas.
- Tabla nueva `hq_posts` (migración `20261009210000_hq_contenido.sql`), solo la dueña la ve
  (probado en PGlite). Migración aplicada y probado en la web real por Bárbara (9-oct): funciona.
- Se pasó el artefacto "Calendario FullTime Octubre" (claude.ai) a HQ con un SQL suelto: 4 posts
  con su texto y hashtags + 4 rutinas de stories (Programada) y 4 tareas. No quedan sincronizados:
  desde ahora octubre se maneja en HQ. El Post 11 no salió el 6 (cumpleaños de su mamá) y se
  reprogramó al domingo 11 en la noche; "Contestar comentarios" pasó al lunes 12.

### FullTime HQ: Inbox (9-oct)
- `/hq/inbox`, pestaña **Conversaciones**: con quién, por dónde (WhatsApp, Instagram DM,
  comentario, correo), qué pasó, prospecto del CRM y a quién le toca ("Me toca a mí", "Le toca a
  la otra persona", "Cerrada"). Botones "Ya le respondí" / "Me respondió" / "Cerrar"; las que
  esperan 3+ días salen en rojo con "mándale un seguimiento". Botón de WhatsApp si el prospecto
  tiene teléfono. Las "Me toca a mí" salen en Inicio → Para hoy.
- Pestaña **Plantillas**: mensajes listos con botón Copiar. Arranca con 5 (responder comentario,
  contacto referido, invitar a demo, seguimiento, mandar la guía), editables.
- Tablas nuevas `hq_templates` y `hq_conversations` (migración `20261009220000_hq_inbox.sql`, trae
  las 5 plantillas). Solo la dueña las ve (probado en PGlite). Migración aplicada y probado en la
  web real por Bárbara (9-oct): funciona.

### FullTime HQ: Automatizaciones (9-oct)
- Corren solas al abrir HQ (como mucho cada 10 minutos por pestaña) y con "Revisar ahora". No
  mandan avisos al celular (la regla del push sigue igual: solo convocatorias).
  1. Conversación del Inbox esperando 3+ días → tarea "Mandar seguimiento a …" para hoy (una vez por
     cada último contacto; no se repite aunque la marques hecha).
  2. Prospecto que se registró (club ligado o mismo correo que el dueño del club) → "En prueba" y
     se liga al club.
  3. Prospecto cuyo club tiene el pago al día → "Pagando".
- `/hq/automatizaciones`: explica las 3 reglas y muestra lo que hicieron (historial en ese
  navegador). Lógica en `src/lib/hq-automatizaciones.ts`, probada con datos de ejemplo (11 casos).
  Sin tablas nuevas. Falta: que Bárbara lo pruebe en la web real.

### Sección de Ayuda (9-oct)
- `/ayuda` (pública, no hace falta entrar): preguntas frecuentes con pestañas "Soy entrenador" y
  "Soy jugadora" (invitar, convocar, entrenos del mes, quién vio el aviso, recordatorios, cambios,
  asistencia, cuerpo técnico, confirmar, avisos en iPhone y Android, contraseña, quién ve mis datos)
  y botón de WhatsApp +507 6991-1552. Los textos usan los nombres reales de los botones.
- Acceso: "Ayuda" en el menú del entrenador y enlace "¿No te llegan los avisos…? Ver ayuda" en el
  inicio de la jugadora. Probada en tamaño celular (sin scroll de lado) y en la web real por
  Bárbara (9-oct): funciona.

### Detalles menores del prompt original (8-oct)
- Perfil de entrenador: el rol se ve como "Dueño/a del club", "Admin" o "Cuerpo técnico" (antes
  "owner"/"admin"). Los nombres viven en `ROLE_LABEL` de `src/lib/active-club.ts`.
- "Copiar lista" del partido: separa Asistieron / No asistieron / Sin marcar (antes mezclaba las
  dos últimas) y avisa si no se pudo copiar.

### Contacto en la portada (8-oct)
- Pie de página y sección de precios: el correo pasa de `barbarchan2415@gmail.com` (tenía un
  error de escritura) a `fulltimeapp.pa@gmail.com`, igual que las guías y la política de
  privacidad. El enlace de Calendly no se tocó.

### Historial ordenado (8-oct)
- Partidos y Entrenos: "Próximos" arriba; "Historial (N)" cerrado por defecto, con lo más reciente
  primero y agrupado por mes ("Octubre de 2026"). No se borra nada (de ahí sale la asistencia).

## Decisiones tomadas

- **Hosting:** GitHub + Vercel + Supabase propio, sin Lovable (decidido por Bárbara el 28-sep).
- **Datos de prueba de Lovable:** no se migraron (3 clubes, 1 jugadora de prueba).
- **Confirmación de correo apagada** en Supabase: el correo gratis de Supabase solo llega al
  equipo de Supabase, no a los usuarios. Para volver a encenderla hace falta dominio propio + SMTP
  (por ejemplo Resend).
- **Menores:** el club es responsable de tener la autorización de madre, padre o tutor antes de
  cargar a una jugadora menor (así lo dice la política de privacidad).
- **Orden de trabajo (6-oct):** Tarea 5 → entrenos repetidos del mes → Tareas 6, 7, 8 →
  ordenar historial.
- **Entrenos repetidos:** "Repetir" por días de la semana con su horario, hasta fin de mes o una
  fecha, con vista previa para quitar días. Un solo aviso de resumen a las jugadoras. Recordatorio
  de inicio de mes como recuadro en el panel del entrenador (no push).
- **Historial:** no se borra (de ahí sale la asistencia). Se esconde lo pasado en una sección
  "Historial" y la asistencia se filtra "desde tal fecha".
- **Vercel plan Hobby:** sirve para probar; al cobrar hay que pasar a Pro (uso comercial).

## Variables de entorno

Lista completa y explicada en `.env.example`. Dónde se cargan:

| Variable | Dónde |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Vercel |
| `VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Vercel (llaves nuevas, generadas el 29-sep) |
| `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` | Vercel (secretas) |
| `VITE_SITE_URL` | `.env.production` en el repo (no es secreta) |

Para desarrollo local: `.env.local` (no se sube al repo).

## Cómo probar

- **Base de datos (sin tocar Supabase):** las migraciones se prueban con PGlite simulando sesiones
  de owner, coach, jugadora y un extraño (script usado el 28-sep; pasar a `tests/` cuando se
  agregue Vitest).
- **Prueba real hecha el 29-sep:** registro de club → alta de jugadora → invitación aceptada en
  incógnito → partido creado → jugadora respondió "Voy" → el profe vio 1 confirmada. Verificado en
  la base.
- **Aplicar migraciones nuevas:** `npx supabase db push` desde la carpeta del repo.

## Pendiente

**Para empezar la próxima sesión (pedido de Bárbara, 9-oct):**
- Probar Automatizaciones en la web real: entrar a HQ → Automatizaciones y tocar "Revisar ahora"
  (debe decir "Todo al día"). Luego en el Inbox poner la conversación de Carlos en "Le toca a la
  otra persona" con último contacto de hace 4 días y volver a "Revisar ahora": debe crear la tarea
  "Mandar seguimiento a Carlos Rivera".
- Decidir con Bárbara qué ideas de Carlos van primero (ver abajo). El 9-oct ella le escribió que
  integraría "algunas de sus ideas" en una o dos semanas y luego le ayuda a montar su equipo e
  invitar a las jugadoras (volver a escribirle ~23-oct). Antes: cambiar CLAUDE.md si se amplía
  wellness/RPE y definir reglas para datos de salud de menores.
- Los videos tutoriales quedaron para la semana del 12-oct.

**Pruebas con el celular (Bárbara):**
- "No puedo" sin internet (baja prioridad): abrir la convocatoria con internet, apagar la red y
  tocar "No puedo". A los 10 s máximo debe salir error con "Reintentar" (arreglo 758ec8e, falta
  confirmar en el celular).
- Avisos en Android: funcionan en iPhone; falta probar con la primera jugadora real que tenga
  Android (revisar en la base que tenga suscripción `fcm.googleapis.com`).

**Feedback de Carlos Rivera (demo por Meet, 9-oct, ~40 min). NADA decidido todavía.**
Hoy usa goTeam (lo paga el club). Dice que esas plataformas son caras y poco amigables; valora lo
simple. Le gustó el proyecto y **se ofreció a probarlo** con su equipo y decir dónde se queda corto.
Lo que pidió, en su orden de importancia:
1. Wellness y RPE "automatizados": recordatorio a la jugadora (RPE 20–30 min después del entreno),
   formulario de wellness editable, historial por jugadora ("cómo estuvo este mes") e informes
   (ej. RPE de toda la pretemporada). Mencionó registrar el periodo menstrual.
2. Estadísticas de partido: goles (con opción **autogol** y gol en contra sin cargárselo a una
   jugadora), tarjetas, cambios, lesión en el partido, **minutos jugados** por jugadora y por
   temporada (la duración del partido cambia por categoría: 60, 70… min). Estadísticas de cargas.
3. Historial de lesiones por jugadora (fecha, zona, tiempo fuera; ver patrones).
4. En la convocatoria: titulares vs solo convocadas, alineación y plan de partido simples dentro
   del mismo partido (en goTeam hay que crearlos aparte).
5. Accesos por equipo: cada entrenador ve solo su equipo; lo asigna el administrador del club.
Para decidir con Bárbara antes de construir: (a) CLAUDE.md pone "ampliar wellness o RPE" fuera del
alcance; (b) periodo menstrual y lesiones son datos de salud de menores: necesitan reglas claras
de quién los ve y permiso; (c) apunta a un nivel más profesional que el usuario actual (CLAUDE.md:
entrenador con poco tiempo que no quiere aprender software). Revisión completa de goTeam (9-oct):
`docs/GOTEAM.md`, con propuesta en orden (hoja de partido → estadísticas → estado/lesiones).

- **Idea: chat dentro de la app (Bárbara, 9-oct). Solo anotada, NO decidida.** Chat del equipo
  completo, chat entre jugadoras de uno a uno (sin que ellas armen grupos) y chat del entrenador con
  cada jugadora. Antes de construir hay que decidir: (1) choca con CLAUDE.md, que pone "chat o
  avisos de texto libre" fuera del alcance; (2) menores de edad: un chat privado adulto–menor o
  entre menores necesita reglas (¿lo ven los papás? ¿el cuerpo técnico ve los chats entre
  jugadoras? ¿se puede reportar o bloquear?); (3) moderación y quién responde por lo que se
  escribe. Preguntas pendientes para Bárbara cuando haya tiempo.
- Límites por plan (recordatorio de Bárbara, 6-oct): Plan Equipo (un equipo) y Plan Academia
  (varios equipos, precio por equipo). Hoy la app deja crear categorías sin límite; controlarlo
  desde el panel de la dueña.
- Agregar Vitest para guardar en el repo las pruebas que hoy corren aparte (necesita OK de
  Bárbara: es una librería nueva).
- Revisión legal de `/privacidad` antes de tener muchos equipos.

**Dominio propio (revisado el 8-oct en nic.pa, ambos libres):**
- **fulltime.pa** — recomendado (corto, combina con @fulltime.pa). Registro: $200 por 2 años
  ($300 / 3, $400 / 4, $500 / 5).
- **fulltime.com.pa** — opción económica. Registro: $50 por 2 años ($75 / 3, $100 / 4, $110 / 5).
- Se compra en nic.pa (cuenta + pago, lo hace Bárbara). Confirmar el precio de renovación al
  comprar. Al tenerlo: conectarlo a Vercel, actualizar `VITE_SITE_URL`, las URL de Supabase Auth y
  de Google, y se podrá mandar correo desde el dominio (volver a activar la confirmación de correo).

**Demo para mostrar (8-oct):** el club de Bárbara está cargado con datos de demostración
(Prueba FC · Sub-18 Femenino, 18 jugadoras, partido del sábado 10-oct, entrenos de octubre e
historial de septiembre). Script: `supabase/demo/demo.sql` (no es migración; se corre a mano en
el SQL Editor y se puede repetir). Guion de 10 minutos: `docs/DEMO.md`.
Guías de 1 página en PDF (entrenador y jugadoras, con WhatsApp +507 6991-1552 y
fulltimeapp.pa@gmail.com): `docs/guias/`. Se editan en el HTML y se regeneran con Chrome.

**Idea para después — Ayuda dentro de la app (Bárbara, 8-oct):** una sección de "Ayuda" con
tutoriales paso a paso (crear partido, cargar entrenos del mes, invitar jugadoras, activar avisos).
Bárbara quiere convertir las guías de `docs/guias/` en **videos tutoriales** grabando su
pantalla, paso a paso (8-oct). Los videos podrían vivir luego en esa sección de Ayuda.

**Idea para después — "FullTime HQ" (Bárbara, 8-oct):** un centro de control del negocio que crece
desde `/panel-fulltime` (ya tiene clubes, CRM básico, pagos y métricas). Secciones: Inicio (el día
de un vistazo), Notificaciones (club dormido, prueba por vencer, avisos fallidos), Clientes/CRM por
etapas (Contacto → Demo → Prueba → Pagando → Perdido), Ventas/Cotizaciones (con la calculadora de
planes), Proyectos y tareas, Calendario y reuniones, Métricas (embudo + ingresos), Contenido
(posible conexión con Metricool), Inbox (formulario web / WhatsApp / Instagram) y
Automatizaciones. Fases sugeridas: 1) lo que vende (CRM, cotizaciones, métricas, alertas);
2) lo que organiza (tareas, calendario); 3) inbox y contenido conectando herramientas existentes.
