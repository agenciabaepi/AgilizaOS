-- Catálogo global: modelos Apple iPhone (marca APPLE, tipo CELULAR)
-- Pré-requisitos: aparelhos_catalogo.sql e equipamentos_tipos_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)

INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'APPLE',
  v.modelo,
  'CELULAR',
  t.id,
  true
FROM (
  VALUES
    ('IPHONE SE 1ª GERAÇÃO'),
    ('IPHONE 7'),
    ('IPHONE 7 PLUS'),
    ('IPHONE 8'),
    ('IPHONE 8 PLUS'),
    ('IPHONE X'),
    ('IPHONE XR'),
    ('IPHONE XS'),
    ('IPHONE XS MAX'),
    ('IPHONE 11 PRO'),
    ('IPHONE 11 PRO MAX'),
    ('IPHONE SE 2ª GERAÇÃO'),
    ('IPHONE 12 MINI'),
    ('IPHONE 12'),
    ('IPHONE 12 PRO'),
    ('IPHONE 12 PRO MAX'),
    ('IPHONE 13 MINI'),
    ('IPHONE 13'),
    ('IPHONE 13 PRO'),
    ('IPHONE 13 PRO MAX'),
    ('IPHONE SE 3ª GERAÇÃO'),
    ('IPHONE 14'),
    ('IPHONE 14 PLUS'),
    ('IPHONE 14 PRO'),
    ('IPHONE 14 PRO MAX'),
    ('IPHONE 15'),
    ('IPHONE 15 PLUS'),
    ('IPHONE 15 PRO'),
    ('IPHONE 15 PRO MAX'),
    ('IPHONE 16'),
    ('IPHONE 16 PLUS'),
    ('IPHONE 16 PRO'),
    ('IPHONE 16 PRO MAX'),
    ('IPHONE 16E'),
    ('IPHONE 17'),
    ('IPHONE AIR'),
    ('IPHONE 17 PRO'),
    ('IPHONE 17 PRO MAX'),
    ('IPHONE 17E')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'CELULAR' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
