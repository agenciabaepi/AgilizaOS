-- Bucket e políticas de storage para imagens de aparelhos
-- Execute no Supabase SQL Editor após criar as tabelas (aparelhos_catalogo.sql)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aparelhos',
  'aparelhos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Leitura pública (bucket público)
DROP POLICY IF EXISTS "aparelhos_public_read" ON storage.objects;
CREATE POLICY "aparelhos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'aparelhos');

-- Upload para usuários autenticados (configurações / seletor na OS)
DROP POLICY IF EXISTS "aparelhos_authenticated_insert" ON storage.objects;
CREATE POLICY "aparelhos_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aparelhos');

DROP POLICY IF EXISTS "aparelhos_authenticated_update" ON storage.objects;
CREATE POLICY "aparelhos_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'aparelhos')
  WITH CHECK (bucket_id = 'aparelhos');

DROP POLICY IF EXISTS "aparelhos_authenticated_delete" ON storage.objects;
CREATE POLICY "aparelhos_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aparelhos');
