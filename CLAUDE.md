# FullTime

App para que entrenadores de fútbol femenino organicen su equipo: plantel,
convocatorias, avisos al celular y confirmación de asistencia.

El problema real no es mandar el aviso, es saber que llegó.
Todo lo que se construya tiene que acercar al entrenador a esa certeza.

## Quién la usa

- Entrenador o coordinador: usuario principal y quien paga. Poco tiempo,
  usa el celular y no quiere aprender software.
- Jugadora: recibe la convocatoria y confirma. Muchas son menores de edad.
  Su experiencia tiene que ser de dos toques.

La pregunta detrás de cada decisión:
¿esto hace que un entrenador quiera usar FullTime cada semana porque de verdad
le facilita la vida? Si la respuesta es no, cuestióname la decisión.

## Estado real

- La app existe. Se construyó en Lovable, pero desde el 29-sep-2026 ya no usa Lovable:
  el código está en GitHub, se publica en Vercel y la base es un Supabase propio.
- NO se reconstruye. Se repara lo que bloquea meter al primer equipo.
- 0 equipos usándola. El cuello de botella es conseguir usuarios, no
  funcionalidades. No propongas nada nuevo a menos que te lo pida.
- El avance y las decisiones tomadas están en docs/ESTADO.md. Léelo al empezar.
  Si no existe, créalo.

## Stack (no se cambia)

TanStack Start · Vite · React · TypeScript · Tailwind · shadcn/ui
Supabase (auth, base de datos, RLS, edge functions)
PWA con push hecho a mano (Web Crypto, VAPID)
Publicación: Vercel, desde GitHub (`main` publica solo). Base: Supabase propio.
No migrar a otro hosting ni volver a Lovable sin preguntar.

## No tocar sin preguntar

- RLS de las 15 tablas.
- Cifrado y firma del push.
- El push solo sale por convocatorias (crearla, cambiarla, sumar jugadoras o
  recordar a las que no han respondido), siempre con texto armado en el
  servidor y solo si quien lo dispara es del cuerpo técnico. Si se crean
  varios entrenos de una vez, va un solo aviso de resumen (decidido 6-oct).
  No existe push de texto libre y así se queda.

## Fuera del alcance

Chat o avisos de texto libre · email como canal · entrenamientos
prediseñados · ampliar wellness o RPE · planes y pagos · rediseño visual ·
refactors grandes.

## Decisiones que no tomas tú

Para y pregúntame si te topas con:
- Cuentas de menores y permiso de los papás.
- Jugadora en varios equipos.
- Qué puede hacer el rol coach.
- Cualquier cambio de arquitectura, esquema de base de datos o branding.

## Cómo trabajar

- Entiende antes de cambiar. Lee el código y sus dependencias primero.
- Cambios pequeños y reversibles.
- No añadas librerías. Si crees que hace falta una, explícame por qué.
- La simplicidad está por encima de la elegancia técnica.
- Cambios de base de datos: siempre una migración nueva, nunca editar las
  existentes.
- Cambios de RLS: probarlos con sesiones de owner, coach y jugadora.
- Ante la duda con datos de menores: menos acceso, no más.
- Ningún secreto en el código. Las variables van en .env.example sin valores.

## Seguridad y errores

- Ningún fallo silencioso. Si algo falla, el usuario lo ve en palabras
  simples y puede reintentar.
- Nunca mostrar errores crudos de base de datos. Usar translateDbError.

## Interfaz

- Español de Panamá. Tuteo siempre, nunca voseo
  (nada de «registrate», «pedí», «elegí»).
- Sin lenguaje técnico en pantalla. El entrenador no sabe qué es un registro,
  un endpoint ni una instancia.
- Primero celular, pensado para usarse en una cancha bajo el sol: texto
  legible, botones grandes y contraste alto.
- Cada pantalla con un propósito claro. Sin pasos innecesarios.

## Estética

Moderna, deportiva y limpia. Tiene que competir con SaaS actual, no parecer
software deportivo genérico ni app infantil.

Crema #F4F1E8 · tinta #0C1A14 · acento verde lima #D6F84C
Detalles de la bandera de Panamá solo como microelementos.

## Antes de decir que algo está listo

1. TypeScript sin errores.
2. El proyecto compila.
3. Tests de lo que cambiaste, pasando.
4. Lo probaste corriendo la app.
5. Si no pudiste probar algo, dímelo y dime cómo lo pruebo yo.

Después: un commit pequeño en español, actualizar docs/ESTADO.md y
un resumen de 5 líneas como máximo.

## Cómo hablarme

No soy desarrolladora senior. Directo, corto y sin tecnicismos innecesarios.
Si hay opciones: dos o tres, cuál recomiendas y por qué.
Si detectas una mala decisión o una contradicción, dímelo antes de
proponer la solución.
