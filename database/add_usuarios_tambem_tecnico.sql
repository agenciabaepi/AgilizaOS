-- Admin pode atuar também como técnico (mesmo login)
-- Evita precisar de 2 contas quando o próprio admin é o técnico da empresa.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS tambem_tecnico boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usuarios.tambem_tecnico IS
  'Quando true e nivel=admin (ou usuarioteste), o usuário também aparece como técnico e pode receber OS/comissões.';

-- Só admin/usuarioteste devem manter o flag
UPDATE public.usuarios
SET tambem_tecnico = false
WHERE tambem_tecnico = true
  AND lower(coalesce(nivel::text, '')) NOT IN ('admin', 'usuarioteste');
