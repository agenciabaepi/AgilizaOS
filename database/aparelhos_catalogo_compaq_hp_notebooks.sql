-- Catálogo global: notebooks Compaq e HP Compaq Presario (tipo NOTEBOOK)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 40 modelos (18 Compaq + 22 HP)

-- =====================
-- COMPAQ (marca COMPAQ)
-- =====================
INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'COMPAQ',
  v.modelo,
  'NOTEBOOK',
  t.id,
  true
FROM (
  VALUES
    ('PRESARIO CQ-14'),
    ('PRESARIO CQ-15'),
    ('PRESARIO CQ-17'),
    ('PRESARIO CQ-21'),
    ('PRESARIO CQ-21N'),
    ('PRESARIO CQ-23'),
    ('PRESARIO CQ-25'),
    ('PRESARIO CQ-25 PC806'),
    ('PRESARIO CQ-25 PC807'),
    ('PRESARIO CQ-27'),
    ('PRESARIO CQ-27 PC814'),
    ('PRESARIO CQ-29'),
    ('PRESARIO CQ-31'),
    ('PRESARIO CQ-32'),
    ('PRESARIO CQ-35'),
    ('PRESARIO CQ-360'),
    ('PRESARIO 420'),
    ('PRESARIO 424')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'NOTEBOOK' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;

-- ============================
-- HP COMPAQ PRESARIO (marca HP)
-- ============================
INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'HP',
  v.modelo,
  'NOTEBOOK',
  t.id,
  true
FROM (
  VALUES
    ('COMPAQ PRESARIO C700'),
    ('COMPAQ PRESARIO C730BR'),
    ('COMPAQ PRESARIO C750BR'),
    ('COMPAQ PRESARIO CQ40'),
    ('COMPAQ PRESARIO CQ42'),
    ('COMPAQ PRESARIO CQ43'),
    ('COMPAQ PRESARIO CQ45'),
    ('COMPAQ PRESARIO CQ50'),
    ('COMPAQ PRESARIO CQ56'),
    ('COMPAQ PRESARIO CQ57'),
    ('COMPAQ PRESARIO CQ60'),
    ('COMPAQ PRESARIO CQ61'),
    ('COMPAQ PRESARIO CQ62'),
    ('COMPAQ PRESARIO CQ70'),
    ('COMPAQ PRESARIO G42'),
    ('COMPAQ PRESARIO G56'),
    ('COMPAQ PRESARIO G60'),
    ('COMPAQ PRESARIO G61'),
    ('COMPAQ PRESARIO G62'),
    ('COMPAQ PRESARIO G72'),
    ('COMPAQ PRESARIO V3000'),
    ('COMPAQ PRESARIO V5000'),
    ('COMPAQ PRESARIO V6000'),
    ('COMPAQ PRESARIO V6500')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'NOTEBOOK' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
