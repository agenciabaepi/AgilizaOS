-- Checklist de entrega / testes pós-manutenção (app GCList)
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS checklist_entrega text;

COMMENT ON COLUMN public.ordens_servico.checklist_entrega IS
  'JSON do relatório de testes do aparelho (app GCList) após manutenção, antes da entrega';

ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS checklist_entrega_em timestamptz;

COMMENT ON COLUMN public.ordens_servico.checklist_entrega_em IS
  'Data/hora em que o checklist de entrega foi enviado pelo GCList';
