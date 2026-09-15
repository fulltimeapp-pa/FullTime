# Editar una convocatoria sin borrarla

Hoy, en el detalle de una convocatoria, el cuerpo técnico solo puede eliminar. Vamos a permitir editarla.

## Qué se va a poder editar

Fecha, hora, lugar y nota. Si es un entreno, también el objetivo (es el mismo detalle para partidos y entrenos, dejar fuera el entreno sería raro).

Dos cosas quedan fuera a propósito: qué jugadoras están convocadas (eso ya se maneja al crearla, y meterlo aquí abre otra caja) y el equipo/categoría (cambiarlo dejaría convocadas a jugadoras de otro equipo).

**Sobre el rival:** hoy la app no guarda el rival en ningún lado. No existe el campo ni al crear el partido ni en la pantalla. Para poder editarlo habría que crearlo primero, y eso ya no es este arreglo. Mi propuesta: por ahora el rival va en la nota, y si lo quieres como campo propio lo hacemos como el siguiente cambio, separado. Dime si prefieres que lo metamos aquí.

## Decisión 1: qué pasa con las confirmaciones — mi recomendación

**Se mantienen. No se borran nunca.**

Por qué: en liga el cambio típico es de media hora o de cancha. Si al cambiar la hora borramos todas las confirmaciones, el entrenador se queda con el tablero en blanco el día antes del partido y tiene que perseguir a dieciocho jugadoras otra vez por WhatsApp — justo lo que la app vino a evitar. Y la jugadora que ya dijo "voy" recibe un aviso del cambio y puede cambiar su respuesta ella misma si la nueva hora no le sirve. No se pierde información: quien quiera corregir, corrige.

La alternativa sería una casilla "pedir que confirmen de nuevo" que solo al cambiar fecha u hora ponga a todas en pendiente. Es útil cuando el cambio es grande (de sábado a domingo), pero es más pantalla y más decisión para el entrenador. Yo lo dejaría fuera de esta primera versión; si al usarlo lo extrañas, lo agregamos.

## Decisión 2: aviso a las jugadoras — mi recomendación

**Sí se avisa, con el mismo aviso al celular que ya existe.**

Cuando guardas un cambio de fecha, hora o lugar, sale el mismo aviso push que ya se manda al crear una convocatoria, pero con el título "Cambio en el partido" / "Cambio en el entreno" y la nueva fecha, hora y cancha. Al tocarlo se abre la convocatoria y puede cambiar su respuesta ahí mismo.

Si solo cambias la nota, no se manda nada (no vale la pena vibrar el celular de todas por una coma).

Además, los recordatorios automáticos (el de la noche anterior y el de unas horas antes) se reactivan cuando cambia la fecha o la hora, para que lleguen con el horario nuevo y no con el viejo.

Si el aviso falla, el cambio igual se guarda: te avisamos que se guardó pero que el aviso no salió, y te queda el botón para volver a intentarlo. Nada en silencio.

## Cómo se verá

En el detalle, junto a "Eliminar", aparece "Editar". Al tocarlo se abren los mismos campos del formulario de crear, ya llenos, con "Guardar cambios" y "Cancelar". Si algo falla al guardar, sale un mensaje en rojo con lenguaje normal ("No pudimos guardar el cambio. Intenta de nuevo."), nunca el error técnico.

## Detalle técnico

- Los campos fecha/hora/lugar/nota del formulario de crear se sacan a un componente compartido (`src/components/call-ups/CallUpFields.tsx`) que usan tanto `call-ups.new.tsx` como el detalle. Mismo markup, sin duplicar.
- En `call-ups.$id.tsx`: estado de edición + una mutación `UPDATE` sobre `call_ups` (starts_at, place, note, objetivo), con `onError` visible y `invalidateQueries` al terminar.
- Permisos: ya existe la política que deja al cuerpo técnico actualizar `call_ups`. **No hace falta ninguna migración ni cambio en la base.**
- Aviso: se reutiliza `sendPush`, añadiéndole una bandera opcional `updated` para que `buildCallUpMessage` cambie el título a "Cambio en...". Sin librerías nuevas.
- Recordatorios: al cambiar fecha u hora se limpian `remind_night_before_at` y `remind_soon_at` de las filas de esa convocatoria, para que el recordatorio vuelva a salir con la hora nueva.
- El botón "Editar" solo se muestra al cuerpo técnico, igual que "Eliminar".

## Comprobación antes de darlo por hecho

Abro la app, creo un partido de prueba, le cambio la hora y el lugar, y confirmo que se guarda, que la confirmación anterior sigue ahí y que la pantalla muestra los datos nuevos. Si algo no lo puedo probar, te lo digo.
