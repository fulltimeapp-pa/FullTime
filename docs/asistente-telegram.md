# Asistente del HQ por Telegram (etapa 1)

Hecho el 8-nov-2026. Te escribe por Telegram:
- **Cada mañana desde las 7:00:** tareas de hoy y atrasadas, llamadas con su hora, clubes con próximo
  paso y quién lleva 3 días o más sin contestarte, con el mensaje de seguimiento listo para copiar.
- **1 hora antes de cada tarea con hora** (llamadas y reuniones): un aviso.

No usa inteligencia artificial todavía: son reglas fijas. No manda mensajes a nadie más que a ti, y
nunca datos de jugadoras. Costo: $0.

## Para activarlo (unos 15 minutos, en este orden)

**1. Pegar la migración en Supabase** (Bárbara)
`supabase/migrations/20261108120000_hq_asistente_telegram.sql` → SQL Editor → Run → "Success".
Agrega la hora a las tareas y el registro para no repetir avisos.

**2. Publicar el código** (Claude, cuando Bárbara diga "publícalo")

**3. Crear el bot en Telegram** (Bárbara, desde el celular)
1. Baja Telegram y crea tu cuenta.
2. Busca **@BotFather** (tiene una palomita azul) y escríbele `/newbot`.
3. Te pide un nombre (ej. *Asistente FullTime*) y un usuario que termine en `bot` (ej. *fulltime_hq_bot*).
4. Te contesta con una **clave larga** (el "token"). **Es secreta: no la compartas en ningún chat,
   ni conmigo.** Cópiala solo para el paso 5.
5. Busca tu bot por su usuario y tócale **Iniciar** (o escríbele "hola"). Si no haces esto, el bot no
   puede escribirte.

**4. Saber tu número de Telegram** (Bárbara)
Busca **@userinfobot**, escríbele cualquier cosa y te responde con tu **Id** (un número). No es secreto.

**5. Pegar los dos datos en Vercel** (Bárbara, desde la computadora)
1. vercel.com → proyecto **fulltime** → **Settings** → **Environment Variables**.
2. Agrega `TELEGRAM_BOT_TOKEN` con la clave del paso 3 y `TELEGRAM_CHAT_ID` con el número del paso 4.
3. Ve a **Deployments**, en el último toca los tres puntitos → **Redeploy**. Sin esto no lee las claves nuevas.

**6. Probarlo**
En el HQ crea una tarea con fecha de **hoy** y una **hora dentro de 40 minutos**. En unos 15 minutos te
llega el aviso. El resumen llega mañana desde las 7:00.

## Hablarle a Jarvis (desde el 9-nov)
Escríbele en Telegram **día + hora (opcional) + qué hacer** y crea la tarea en el HQ:
- `hoy 5pm Llamar a Juan` · `mañana Preparar el post` · `viernes 3:30pm Meet con David` · `20/11 Escribirle a Víctor`
- Días: hoy, mañana, pasado mañana, lunes a domingo (el próximo) o una fecha como 20/11.
- Hora: 5pm, 3:30pm, 15:00 o "a las 3". Sin am/pm, de 1 a 6 se entiende de la tarde.
- `/hoy`: te manda lo de hoy en el momento. `/ayuda`: te recuerda cómo escribirle.

En el resumen, en los avisos y al crear una tarea salen botones: **✅** la marca hecha y **➡️ Mañana** la pasa
al día siguiente. Solo le hace caso a tu cuenta; si otra persona le escribe, la ignora.
Sin IA: si no entiende, te explica el formato. No cuesta nada.

## Si algo falla
- No llega nada: revisa que le tocaste **Iniciar** al bot y que hiciste el **Redeploy**.
- Si alguien más pudo ver la clave del bot: en @BotFather → `/revoke` te da una nueva; cámbiala en Vercel
  y haz Redeploy.
- Para apagarlo: borra las dos variables en Vercel y haz Redeploy.

## Qué sigue (etapa 2, después del curso de Ederland, semana del 23-nov)
Tablero con "espera aprobación", agentes con IA por rol (redes, textos) y poder escribirle al asistente
para que cree tareas. Los personajes estilo bloques, el chat y la oficina virtual quedan para la etapa 3.
