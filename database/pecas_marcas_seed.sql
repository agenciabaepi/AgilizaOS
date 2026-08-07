-- Pré-cadastra marcas (iPhone, Samsung, Xiaomi...) em todos os grupos ativos,
-- com logos do Simple Icons CDN (https://github.com/simple-icons/simple-icons).
-- Execute no Supabase SQL Editor após pecas_catalogo.sql.

WITH marcas (nome, slug, imagem_url, ordem) AS (
  VALUES
    ('iPhone',   'iphone',   'https://cdn.simpleicons.org/apple/111111',   10),
    ('Samsung',  'samsung',  'https://cdn.simpleicons.org/samsung/1428A0', 20),
    ('Xiaomi',   'xiaomi',   'https://cdn.simpleicons.org/xiaomi/FF6900',  30),
    ('Motorola', 'motorola', 'https://cdn.simpleicons.org/motorola/E1140A', 40),
    ('LG',       'lg',       'https://cdn.simpleicons.org/lg/A50034',      50),
    ('Huawei',   'huawei',   'https://cdn.simpleicons.org/huawei/CF0A2C',  60),
    ('Asus',     'asus',     'https://cdn.simpleicons.org/asus/000000',    70),
    ('Google',   'google',   'https://cdn.simpleicons.org/google/4285F4',  80),
    ('Sony',     'sony',     'https://cdn.simpleicons.org/sony/000000',    90),
    ('Nokia',    'nokia',    'https://cdn.simpleicons.org/nokia/124191',  100),
    ('OnePlus',  'oneplus',  'https://cdn.simpleicons.org/oneplus/F5010C', 110),
    ('Realme',   'realme',   'https://cdn.simpleicons.org/realme/FFC915', 120),
    ('Oppo',     'oppo',     'https://cdn.simpleicons.org/oppo/1A531B',   130),
    ('Vivo',     'vivo',     'https://cdn.simpleicons.org/vivo/415FFF',   140)
)
INSERT INTO public.pecas_categorias_catalogo (grupo_id, nome, slug, imagem_url, ordem, ativo)
SELECT g.id, m.nome, m.slug, m.imagem_url, m.ordem, true
FROM public.pecas_grupos_catalogo g
CROSS JOIN marcas m
WHERE g.ativo = true
ON CONFLICT ON CONSTRAINT pecas_categorias_catalogo_grupo_slug_unique
DO UPDATE SET
  nome = EXCLUDED.nome,
  imagem_url = COALESCE(NULLIF(pecas_categorias_catalogo.imagem_url, ''), EXCLUDED.imagem_url),
  ordem = EXCLUDED.ordem,
  ativo = true,
  updated_at = now();
