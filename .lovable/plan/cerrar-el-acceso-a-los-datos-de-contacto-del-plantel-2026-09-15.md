# Cerrar el acceso a los datos de contacto del plantel

## El problema (confirmado)

La regla de lectura actual de la tabla de jugadoras dice, literalmente: "cualquier persona que sea miembro del club puede leer todas las filas de jugadoras de ese club". Como las jugadoras entran al club como miembros, cualquiera de ellas puede pedir por la API el correo, el teléfono y la fecha de nacimiento de todas sus compañeras. La pantalla no lo muestra, pero el dato sale.

## Qué voy a cambiar

Una sola cosa: la regla de lectura de la tabla de jugadoras. Queda así:

- Cuerpo técnico del club (dueña, admin y entrenadoras) → ve todas las jugadoras de su club, con todos los datos. Sin cambios respecto a hoy.
- Jugadora → solo ve su propia ficha. Nada de sus compañeras.

Reviso también que ninguna pantalla se rompa. Ya lo verifiqué leyendo el código:

- Plantel, asistencia, calendario, crear convocatoria, crear entreno, panel y equipo: son pantallas de cuerpo técnico, siguen viendo todo.
- Inicio de la jugadora, Mi perfil y Mis convocatorias: solo consultan su propia ficha, siguen funcionando igual.
- Detalle de una convocatoria: la jugadora entra a esta pantalla, pero la parte que muestra nombres del resto del plantel solo se dibuja para el cuerpo técnico. Ella solo usa su propia fila para confirmar "Voy" / "No puedo". Sigue funcionando.
- Las invitaciones y los avisos automáticos corren del lado del servidor con permisos propios, no les afecta.

## Por qué así y no de otra forma

La alternativa sería dejar que la jugadora siga viendo la lista completa pero tapando solo las tres columnas sensibles. Es más código, más piezas nuevas (una vista aparte y cambios en las consultas) y más cosas que pueden romperse. Como ninguna pantalla de jugadora necesita ver la ficha de sus compañeras, la opción sencilla es también la más segura. Recomiendo esta.

## Detalle técnico

- Migración única sobre `public.players`: se reemplaza la política `Club members can view players` por una política SELECT con
  `is_club_staff(auth.uid(), club_id) OR user_id = auth.uid()`.
- No se tocan las políticas de INSERT, UPDATE ni DELETE (siguen en `is_club_admin`), ni los GRANT, ni ninguna función existente.
- No se toca código de la aplicación. Cero librerías nuevas.
- Reversible: volver atrás es recrear la política anterior.

## Comprobación antes de darlo por hecho

Después de aplicarlo, pruebo entrando a la app como jugadora y confirmo dos cosas: que puede abrir su convocatoria y responder, y que al pedir el plantel por la API solo le devuelve su propia ficha. Si no lo puedo probar, te lo digo.

## Cómo queda cada rol

| Rol | Puede leer |
| --- | --- |
| Dueña / Admin | Todas las jugadoras de su club, todos los datos |
| Entrenadora (cuerpo técnico) | Todas las jugadoras de su club, todos los datos |
| Jugadora | Solo su propia ficha |
| Persona fuera del club | Nada |
