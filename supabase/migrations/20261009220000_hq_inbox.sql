-- FullTime HQ: Inbox (plantillas de mensajes y conversaciones). Solo la dueña de la plataforma lo ve.
CREATE TABLE public.hq_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,                  -- "Responder comentario"
  body text NOT NULL,                  -- el mensaje listo para copiar
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE public.hq_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  person text NOT NULL,                -- con quién
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('instagram', 'whatsapp', 'comentario', 'correo')),
  status text NOT NULL DEFAULT 'me_toca' CHECK (status IN ('me_toca', 'esperando', 'cerrada')),
  summary text,                        -- qué pasó / de qué hablaron
  last_contact date NOT NULL DEFAULT current_date,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX hq_conversations_status_idx ON public.hq_conversations (status, last_contact);

CREATE TRIGGER hq_templates_set_updated_at BEFORE UPDATE ON public.hq_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER hq_conversations_set_updated_at BEFORE UPDATE ON public.hq_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.hq_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo la duena gestiona plantillas" ON public.hq_templates
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
CREATE POLICY "Solo la duena gestiona conversaciones" ON public.hq_conversations
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Plantillas de arranque (se pueden cambiar o borrar desde HQ).
INSERT INTO public.hq_templates (name, body) VALUES
('Responder un comentario',
$t$¡Qué bueno que lo cuentes! ¿Y hoy cómo lo organizas: grupo de WhatsApp, alguna app o les escribes una por una?$t$),
('Contacto que me pasó alguien',
$t$¡Hola [nombre]! Soy Bárbara. [Quién] me pasó tu contacto. Estoy haciendo FullTime, una app para que los entrenadores de fútbol femenino sepan quién viene a cada partido sin perseguir a nadie por WhatsApp. ¿Te puedo hacer dos preguntas de cómo organizas hoy a tu equipo?$t$),
('Invitar a una demo',
$t$¿Te muestro cómo funciona en 20 minutos? Te enseño en vivo cómo le llega el aviso a la jugadora y cómo ves quién confirmó. ¿Te queda mejor el [día] a las [hora] o el [día] a las [hora]?$t$),
('Seguimiento si no responde',
$t$¡Hola [nombre]! Te escribo de nuevo por si se te pasó el mensaje 🙂 Sin compromiso: ¿cómo confirmas hoy quién viene a los partidos?$t$),
('Mandar la guía después de la demo',
$t$¡Gracias por tu tiempo, [nombre]! Te dejo la guía de una página para empezar y la sección de ayuda: fulltimeapp.vercel.app/ayuda. El primer mes es gratis. ¿Arrancamos con tu equipo esta semana?$t$);
