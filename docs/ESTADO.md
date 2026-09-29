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

## Decisiones tomadas

- **Hosting:** GitHub + Vercel + Supabase propio, sin Lovable (decidido por Bárbara el 28-sep).
- **Datos de prueba de Lovable:** no se migraron (3 clubes, 1 jugadora de prueba).
- **Confirmación de correo apagada** en Supabase: el correo gratis de Supabase solo llega al
  equipo de Supabase, no a los usuarios. Para volver a encenderla hace falta dominio propio + SMTP
  (por ejemplo Resend).
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

- Entrar con Google: crear credenciales en Google Cloud y activarlas en Supabase
  (hasta entonces el botón da error).
- Avisos push: **funcionan en iPhone** (probado el 29-sep con la app instalada en la pantalla de
  inicio; llegó "Nueva convocatoria"). Falta probar el servicio de Google: sin Android a mano,
  probar con Chrome en la Mac (misma vía que Android): jugadora en Chrome, entrenadora en Safari.
- Tareas 2 a 8 del plan (privacidad, registro, coach, editar convocatoria, "¿llegó el aviso?",
  errores visibles, recordatorios).
- Agregar Vitest para tener tests en el repo.
