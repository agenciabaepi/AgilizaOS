-- Confirmação de identidade antes de a IA informar uma O.S. a um telefone diferente do cadastro:
--   pendente    = O.S. em confirmação e etapa atual (aparelho → nome)
--   verificadas = O.S. já confirmadas nesta conversa
--   tentativas  = início de cada confirmação (limite por período)
alter table public.whatsapp_conversas
  add column if not exists ia_verificacao jsonb;
