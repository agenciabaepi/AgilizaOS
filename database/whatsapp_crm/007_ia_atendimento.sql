-- Quem está atendendo a conversa quando a IA está pausada:
--   transferencia = a IA passou para um atendente (aguardando atendimento humano)
--   atendente     = um atendente respondeu pelo CRM
--   manual        = um atendente assumiu a conversa manualmente (só volta para a IA manualmente)
alter table public.whatsapp_conversas
  add column if not exists ia_pausa_motivo text
  check (ia_pausa_motivo in ('transferencia', 'atendente', 'manual'));

update public.whatsapp_conversas
set ia_pausa_motivo = 'atendente'
where ia_pausada_ate is not null and ia_pausa_motivo is null;
