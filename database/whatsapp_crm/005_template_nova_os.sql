-- Automação "OS cadastrada" passa a usar o template aprovado na Meta "nova_os" (pt_BR).
-- Template permite iniciar a conversa fora da janela de 24h.
UPDATE whatsapp_automacoes
SET
  usar_template_meta = true,
  meta_template_name = 'nova_os',
  mensagem_template = E'Olá {{cliente_nome}},\n\nSua ordem de serviço *Nº {{numero_os}}* foi criada.\n\nAparelho: {{equipamento}} {{marca}} {{modelo}}\nStatus: *{{status}}*\n\nEm breve entraremos em contato com atualizações.',
  updated_at = now()
WHERE evento = 'os_criada';
