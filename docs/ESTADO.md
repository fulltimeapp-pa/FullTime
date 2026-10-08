# Estado de FullTime

Última actualización: 29 de septiembre de 2026.

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
- Activado el 8-oct desde el SQL Editor de Supabase (la herramienta de línea de comandos no
  conectaba): clave en Vault y tarea `fulltime-recordatorios` (*/15). Verificado: corrió a las
  8:45 y la app respondió 200. Ojo: esa migración no quedó marcada como aplicada en la
  herramienta; el próximo `db push` la volverá a ofrecer y es seguro aceptarla (reemplaza la
  tarea por la misma).
- Para revisar: `select status_code, content, created from net._http_response order by created
  desc limit 5;` en el SQL Editor.

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

- **Prueba A de la Tarea 7 (baja prioridad, cuando Bárbara quiera):** en el iPhone abrir la
  convocatoria con internet, apagar la red y tocar "No puedo": a los 10 s máximo debe salir error con
  "Reintentar". El 7-oct seguía congelándose; se agregó un límite de 10 s a todo el guardado
  (incluida la renovación de sesión, commit 758ec8e). Falta confirmar en el celular.

- Avisos push: **funcionan en iPhone** (probado el 29-sep con la app instalada en la pantalla de
  inicio; llegó "Nueva convocatoria"). Falta probar el servicio de Google: sin Android a mano,
  se probará con la primera jugadora real que tenga Android (revisar en la base que tenga
  suscripción `fcm.googleapis.com` y que le lleguen).
- Agregar Vitest para tener tests en el repo.
- **Más adelante — límites por plan** (recordatorio de Bárbara, 6-oct): hay Plan Equipo (un solo
  equipo) y Plan Academia (varios equipos, precio por equipo). Hoy la app deja crear categorías sin
  límite. Hay que limitar según el plan, idealmente controlado desde el panel de la dueña
  (`/panel-fulltime`). Ojo: en la base nueva `platform_admins` está vacía, así que hoy nadie entra
  a ese panel; hay que agregar a Bárbara.
