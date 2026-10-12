-- Lesiones: cuando el tipo es "otra", el cuerpo técnico escribe cuál (pedido de Bárbara, 12-oct).
ALTER TABLE public.player_injuries
  ADD COLUMN injury_type_other text CHECK (injury_type_other IS NULL OR length(btrim(injury_type_other)) BETWEEN 1 AND 60);
