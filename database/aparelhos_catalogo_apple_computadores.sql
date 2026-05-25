-- Catálogo global: computadores Apple (marca APPLE, tipos NOTEBOOK e COMPUTADOR)
-- Pré-requisitos: aparelhos_catalogo.sql, equipamentos_tipos_catalogo.sql
-- Duplicatas (marca + modelo) são ignoradas (ON CONFLICT DO NOTHING)
-- Total: 109 modelos (62 notebooks + 47 desktops)

-- ================================
-- NOTEBOOKS (MacBook Air / Pro / 12)
-- ================================
INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'APPLE',
  v.modelo,
  'NOTEBOOK',
  t.id,
  true
FROM (
  VALUES
    -- MacBook Neo
    ('MACBOOK NEO'),

    -- MacBook Air
    ('MACBOOK AIR'),
    ('MACBOOK AIR 11'),
    ('MACBOOK AIR 13'),
    ('MACBOOK AIR 15'),
    ('MACBOOK AIR M1 13'),
    ('MACBOOK AIR M2 13'),
    ('MACBOOK AIR M2 15'),
    ('MACBOOK AIR M3 13'),
    ('MACBOOK AIR M3 15'),
    ('MACBOOK AIR M4 13'),
    ('MACBOOK AIR M4 15'),
    ('MACBOOK AIR M5 13'),
    ('MACBOOK AIR M5 15'),

    -- MacBook Pro
    ('MACBOOK PRO'),
    ('MACBOOK PRO 13'),
    ('MACBOOK PRO 14'),
    ('MACBOOK PRO 15'),
    ('MACBOOK PRO 16'),
    ('MACBOOK PRO RETINA 13'),
    ('MACBOOK PRO RETINA 15'),
    ('MACBOOK PRO TOUCH BAR 13'),
    ('MACBOOK PRO TOUCH BAR 15'),
    ('MACBOOK PRO INTEL 13'),
    ('MACBOOK PRO INTEL 15'),
    ('MACBOOK PRO INTEL 16'),

    -- MacBook Pro M1
    ('MACBOOK PRO M1 13'),
    ('MACBOOK PRO M1 PRO 14'),
    ('MACBOOK PRO M1 PRO 16'),
    ('MACBOOK PRO M1 MAX 14'),
    ('MACBOOK PRO M1 MAX 16'),

    -- MacBook Pro M2
    ('MACBOOK PRO M2 13'),
    ('MACBOOK PRO M2 PRO 14'),
    ('MACBOOK PRO M2 PRO 16'),
    ('MACBOOK PRO M2 MAX 14'),
    ('MACBOOK PRO M2 MAX 16'),

    -- MacBook Pro M3
    ('MACBOOK PRO M3 14'),
    ('MACBOOK PRO M3 PRO 14'),
    ('MACBOOK PRO M3 PRO 16'),
    ('MACBOOK PRO M3 MAX 14'),
    ('MACBOOK PRO M3 MAX 16'),

    -- MacBook Pro M4
    ('MACBOOK PRO M4 14'),
    ('MACBOOK PRO M4 PRO 14'),
    ('MACBOOK PRO M4 PRO 16'),
    ('MACBOOK PRO M4 MAX 14'),
    ('MACBOOK PRO M4 MAX 16'),

    -- MacBook Pro M5
    ('MACBOOK PRO M5 14'),
    ('MACBOOK PRO M5 PRO 14'),
    ('MACBOOK PRO M5 PRO 16'),
    ('MACBOOK PRO M5 MAX 14'),
    ('MACBOOK PRO M5 MAX 16'),

    -- MacBook (clássico / 12)
    ('MACBOOK'),
    ('MACBOOK 12'),
    ('MACBOOK RETINA 12'),
    ('MACBOOK WHITE'),
    ('MACBOOK BLACK'),
    ('MACBOOK UNIBODY'),

    -- PowerBook / iBook (legados)
    ('POWERBOOK G4'),
    ('POWERBOOK G4 12'),
    ('POWERBOOK G4 15'),
    ('POWERBOOK G4 17'),
    ('IBOOK G3'),
    ('IBOOK G4')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'NOTEBOOK' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;

-- ================================
-- DESKTOPS (iMac / Mac Mini / Mac Studio / Mac Pro)
-- ================================
INSERT INTO public.aparelhos_catalogo (marca, modelo, tipo, tipo_id, ativo)
SELECT
  'APPLE',
  v.modelo,
  'COMPUTADOR',
  t.id,
  true
FROM (
  VALUES
    -- iMac
    ('IMAC'),
    ('IMAC 20'),
    ('IMAC 21.5'),
    ('IMAC 24'),
    ('IMAC 27'),
    ('IMAC INTEL 20'),
    ('IMAC INTEL 21.5'),
    ('IMAC INTEL 24'),
    ('IMAC INTEL 27'),
    ('IMAC RETINA 4K 21.5'),
    ('IMAC RETINA 5K 27'),
    ('IMAC M1 24'),
    ('IMAC M3 24'),
    ('IMAC M4 24'),

    -- iMac Pro
    ('IMAC PRO'),
    ('IMAC PRO 27'),

    -- Mac Mini
    ('MAC MINI'),
    ('MAC MINI INTEL'),
    ('MAC MINI M1'),
    ('MAC MINI M2'),
    ('MAC MINI M2 PRO'),
    ('MAC MINI M4'),
    ('MAC MINI M4 PRO'),

    -- Mac Studio
    ('MAC STUDIO'),
    ('MAC STUDIO M1 MAX'),
    ('MAC STUDIO M1 ULTRA'),
    ('MAC STUDIO M2 MAX'),
    ('MAC STUDIO M2 ULTRA'),
    ('MAC STUDIO M4 MAX'),
    ('MAC STUDIO M3 ULTRA'),

    -- Mac Pro
    ('MAC PRO'),
    ('MAC PRO TOWER'),
    ('MAC PRO RACK'),
    ('MAC PRO 2006'),
    ('MAC PRO 2008'),
    ('MAC PRO 2009'),
    ('MAC PRO 2010'),
    ('MAC PRO 2012'),
    ('MAC PRO 2013'),
    ('MAC PRO 2019'),
    ('MAC PRO INTEL'),
    ('MAC PRO M2 ULTRA'),

    -- Power Mac (legados)
    ('POWER MAC G4'),
    ('POWER MAC G5')
) AS v(modelo)
CROSS JOIN LATERAL (
  SELECT id
  FROM public.equipamentos_tipos_catalogo
  WHERE codigo = 'COMPUTADOR' AND ativo = true
  ORDER BY ordem NULLS LAST, created_at
  LIMIT 1
) AS t
ON CONFLICT ON CONSTRAINT aparelhos_catalogo_marca_modelo_unique DO NOTHING;
