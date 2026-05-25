-- Catálogo global: consoles Sony PlayStation (marca SONY, tipo VIDEOGAME)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql, marcas_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 10 modelos

INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'SONY',
  v.modelo,
  'VIDEOGAME',
  t.id,
  true
FROM (
  VALUES
    ('PLAYSTATION 4 CUH-10XX'),
    ('PLAYSTATION 4 CUH-11XX'),
    ('PLAYSTATION 4 CUH-12XX'),
    ('PLAYSTATION 4 SLIM CUH-20XX'),
    ('PLAYSTATION 4 PRO CUH-70XX'),
    ('PLAYSTATION 5 CFI-1000'),
    ('PLAYSTATION 5 DIGITAL EDITION CFI-1000'),
    ('PLAYSTATION 5 SLIM CFI-2000'),
    ('PLAYSTATION 5 SLIM DIGITAL EDITION CFI-2000'),
    ('PLAYSTATION 5 PRO')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'VIDEOGAME' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
