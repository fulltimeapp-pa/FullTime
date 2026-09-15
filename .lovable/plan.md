Recomiendo atacar tres mejoras de alto impacto que están conectadas: la landing promete más de lo que el producto entrega hoy, el dashboard del profe tiene un selector que no filtra nada, y falta la funcionalidad de asistencia que ya se menciona en la landing.

````text
Foco: landing → onboarding → uso diario → asistencia real
````

## 1. Landing: alinear promesas y mejorar conversión móvil

**Problema detectado:**
- En "Cómo funciona" se promete "Asistencia, minutos, wellness y carga por semana", pero hoy no hay asistencia ni minutos.
- En "Herramientas" se habla de "microciclos, cargas y objetivos por semana", pero las plantillas de entreno no cubren eso todavía.
- La navegación móvil no tiene menú hamburguesa: los links desaparecen en pantallas pequeñas.
- No hay toasts globales en la app (el paquete `sonner` está instalado pero no se monta `<Toaster />`).

**Qué construir:**
- Reescribir el paso 4 de `HowItWorks` y la tarjeta de periodización en `Features` para que solo prometan lo que ya existe: convocatorias, entrenos con plan, wellness/RPE, calendario y avisos push. Mover "minutos", "carga" y "microciclos" a "Lo que viene".
- Agregar un menú hamburguesa en `Nav.tsx` para móvil con los mismos anclas y botones de autenticación.
- Montar `<Toaster />` en `src/routes/__root.tsx` para poder mostrar confirmaciones y errores en toda la app.
- Agregar una imagen `og:image` absoluta en `src/routes/index.tsx` usando el hero optimizado (la ruta raíz no tiene una ahora; la global está, pero una propia del héroe es mejor).

## 2. Dashboard de entrenadora: que el selector de categoría sí filtre

**Problema detectado:**
- En `dashboard.tsx` hay un `selectedCatId` que se inicializa pero no se usa para filtrar los partidos, entrenos ni la tarjeta de plantel. El selector no hace nada.

**Qué construir:**
- Filtrar `partidosQuery` y `entrenosQuery` por `category_id` cuando `selectedCatId` tenga valor.
- Actualizar la tarjeta "Plantel" para que muestre el conteo de jugadoras de la categoría seleccionada (no siempre la primera).
- Si no hay categorías, mostrar un CTA claro a `/roster`.
- Reemplazar los textos "Cargando..." por skeleton cards en el dashboard.

## 3. Asistencia real en convocatorias y entrenos

**Problema detectado:**
- La landing y "Cómo funciona" mencionan asistencia, pero hoy solo hay respuesta "voy/no voy". No hay forma de registrar quién realmente llegó.

**Qué construir:**
- Agregar una columna `attended` (boolean/null) y `attended_at` en `call_up_players`.
- En el detalle de convocatoria/entreno (`call-ups.$id.tsx`), mostrar un toggle o check para que la entrenadora marque quién asistió, solo después de la hora de inicio.
- En la vista de entrenadora, agregar un resumen: "X confirmaron · Y asistieron".
- En el detalle de jugadora, mostrar un indicador de asistencia pasada (ej. "Asististe" / "No asististe").
- (Opcional) Exportar la lista de asistencia del evento a texto plano para pegar en WhatsApp si alguien lo necesita.

**Base de datos:**
- Migración para agregar `attended` y `attended_at` a `call_up_players`, con RLS que permita a staff del club actualizar esos campos y a jugadoras solo ver su propia fila.

## Orden de trabajo

1. Landing (copy + menú móvil + toasts + og:image).
2. Dashboard (selector funcional + skeletons).
3. Asistencia (migración + UI de entrenadora + UI de jugadora).

## Criterio de éxito

- La landing no promete funciones que no existen.
- Desde el celular se puede navegar por todas las secciones.
- El selector de categoría en el dashboard filtra partidos, entrenos y el conteo de jugadoras.
- La entrenadora puede marcar asistencia y ver el resumen.

¿Avanzamos con este plan?