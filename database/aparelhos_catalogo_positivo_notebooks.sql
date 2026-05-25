-- Catálogo global: notebooks Positivo (marca POSITIVO, tipo NOTEBOOK)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 80 modelos

INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'POSITIVO',
  v.modelo,
  'NOTEBOOK',
  t.id,
  true
FROM (
  VALUES
    -- Motion
    ('MOTION Q232A'),
    ('MOTION Q232B'),
    ('MOTION Q432A'),
    ('MOTION Q432B'),
    ('MOTION Q464B'),
    ('MOTION Q464C'),
    ('MOTION Q464C-O'),
    ('MOTION Q4128C'),
    ('MOTION Q4128C-S'),
    ('MOTION C4128G-15'),
    ('MOTION C4500A'),
    ('MOTION C4500AI'),
    ('MOTION C4500C'),
    ('MOTION C4500D'),
    ('MOTION C4500DI'),
    ('MOTION GRAY C4128G'),
    ('MOTION RED Q232A'),
    ('MOTION RED Q232B'),
    ('MOTION PLUS Q464B'),

    -- Duo
    ('DUO C4128A'),
    ('DUO C4128B'),
    ('DUO C4128C'),
    ('DUO C464C'),

    -- Vision
    ('VISION C15M'),
    ('VISION I15M'),
    ('VISION R15M'),
    ('VISION C4128A-14'),
    ('VISION C4128B-15'),
    ('VISION I38256CI-15'),

    -- Master
    ('MASTER N2240'),
    ('MASTER N4340'),
    ('MASTER N8440'),

    -- Unique
    ('UNIQUE S1990'),
    ('UNIQUE S1991'),
    ('UNIQUE S1991L'),
    ('UNIQUE S2050'),
    ('UNIQUE S2065'),
    ('UNIQUE S2110'),
    ('UNIQUE S2500'),

    -- Stilo
    ('STILO XR2950'),
    ('STILO XR2990'),
    ('STILO XR2998'),
    ('STILO XR3000'),
    ('STILO XR3008'),
    ('STILO XR3010'),
    ('STILO XR3050'),
    ('STILO XR3208'),
    ('STILO XR3210'),
    ('STILO XR3220'),
    ('STILO XR3420'),
    ('STILO XR3500'),
    ('STILO XR3520'),
    ('STILO XR3525'),
    ('STILO XR3550'),
    ('STILO XR9430'),

    -- Stilo XRI
    ('STILO XRI2950'),
    ('STILO XRI2990'),
    ('STILO XRI3005'),
    ('STILO XRI3010'),
    ('STILO XRI3150'),

    -- Premium
    ('PREMIUM S1990'),
    ('PREMIUM S1991'),
    ('PREMIUM S1991L'),
    ('PREMIUM S2050'),
    ('PREMIUM S2065'),
    ('PREMIUM S2110'),
    ('PREMIUM S2500'),

    -- Outros
    ('MOBO 5900'),
    ('XC3550'),
    ('XC3552'),
    ('X450'),
    ('X451C'),
    ('X550'),
    ('X401'),
    ('X551MA'),
    ('X552E'),
    ('N30I')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'NOTEBOOK' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
