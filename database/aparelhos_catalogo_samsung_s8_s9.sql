-- Catálogo global: Samsung Galaxy S8 / S9 (marca SAMSUNG, tipo CELULAR)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql, marcas_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 5 modelos

INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'SAMSUNG',
  v.modelo,
  'CELULAR',
  t.id,
  true
FROM (
  VALUES
    ('GALAXY S9'),
    ('GALAXY S9+'),
    ('GALAXY S8'),
    ('GALAXY S8+'),
    ('GALAXY S8 ACTIVE')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'CELULAR' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
