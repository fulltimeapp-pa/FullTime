-- Hoja de partido: la competición la escribe el entrenador (pedido de Bárbara, 9-oct).
-- En vez de liga / torneo / copa / amistoso fijos, un nombre libre ("LFF", "Torneo Nacional Sub-16").
-- La app sugiere las que el club ya usó y pone por defecto la última de esa categoría.
ALTER TABLE public.match_reports ADD COLUMN competition text CHECK (competition IS NULL OR length(competition) <= 80);

-- Lo que ya se anotó con el tipo fijo pasa a la competición con su nombre en español.
UPDATE public.match_reports
SET competition = CASE match_type
  WHEN 'liga' THEN 'Liga' WHEN 'torneo' THEN 'Torneo' WHEN 'copa' THEN 'Copa' WHEN 'amistoso' THEN 'Amistoso'
END
WHERE competition IS NULL;

ALTER TABLE public.match_reports DROP COLUMN match_type;
