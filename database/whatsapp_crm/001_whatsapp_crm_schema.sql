-- CRM WhatsApp — schema inicial
-- Execute no Supabase SQL Editor
-- Documentação: https://developers.facebook.com/docs/whatsapp/cloud-api
--
-- Se rodou uma versão anterior parcial, as DROP abaixo recriam as tabelas do zero.
-- ⚠️ Só execute se ainda não houver dados de produção nestas tabelas.

DROP TABLE IF EXISTS whatsapp_os_contexto CASCADE;
DROP TABLE IF EXISTS whatsapp_conversa_notas CASCADE;
DROP TABLE IF EXISTS whatsapp_mensagens CASCADE;
DROP TABLE IF EXISTS whatsapp_automacoes CASCADE;
DROP TABLE IF EXISTS whatsapp_conversas CASCADE;
DROP TABLE IF EXISTS whatsapp_empresa_config CASCADE;

-- ---------------------------------------------------------------------------
-- Configuração por empresa (Cloud API — Phone Number ID + token)
-- ---------------------------------------------------------------------------
CREATE TABLE whatsapp_empresa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  phone_number_id text,
  business_account_id text,
  display_phone_number text,
  access_token text,
  webhook_verified boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

COMMENT ON TABLE whatsapp_empresa_config IS 'Credenciais WhatsApp Cloud API por empresa';
COMMENT ON COLUMN whatsapp_empresa_config.phone_number_id IS 'ID do número na Graph API (Meta)';
COMMENT ON COLUMN whatsapp_empresa_config.access_token IS 'Token de acesso permanente ou temporário';

-- ---------------------------------------------------------------------------
-- Conversas (inbox) — vinculadas a cliente e opcionalmente a uma OS
-- ---------------------------------------------------------------------------
CREATE TABLE whatsapp_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  os_id uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,
  wa_id text NOT NULL,
  telefone text NOT NULL,
  nome_contato text,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'arquivada')),
  ultima_mensagem_preview text,
  ultima_mensagem_em timestamptz,
  nao_lidas integer NOT NULL DEFAULT 0,
  atribuido_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, wa_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_empresa_ultima
  ON whatsapp_conversas (empresa_id, ultima_mensagem_em DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_cliente ON whatsapp_conversas (cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_os ON whatsapp_conversas (os_id);

COMMENT ON TABLE whatsapp_conversas IS 'Threads do inbox WhatsApp CRM';

-- ---------------------------------------------------------------------------
-- Mensagens (histórico inbound/outbound)
-- ---------------------------------------------------------------------------
CREATE TABLE whatsapp_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  direcao text NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'template', 'imagem', 'documento', 'audio', 'video', 'nota_interna', 'sistema')),
  conteudo text NOT NULL,
  meta_message_id text,
  status_entrega text CHECK (status_entrega IS NULL OR status_entrega IN ('enviada', 'entregue', 'lida', 'falha')),
  erro_entrega text,
  os_id uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,
  automacao_id uuid,
  enviado_por_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_conversa ON whatsapp_mensagens (conversa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_meta_id ON whatsapp_mensagens (meta_message_id) WHERE meta_message_id IS NOT NULL;

COMMENT ON TABLE whatsapp_mensagens IS 'Histórico de mensagens WhatsApp (Cloud API webhooks + envios)';

-- ---------------------------------------------------------------------------
-- Notas internas da conversa (equipe — não enviadas ao cliente)
-- ---------------------------------------------------------------------------
CREATE TABLE whatsapp_conversa_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  autor_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversa_notas_conversa ON whatsapp_conversa_notas (conversa_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Contexto da OS na conversa (status, pagamento, NF)
-- ---------------------------------------------------------------------------
CREATE TABLE whatsapp_os_contexto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES whatsapp_conversas(id) ON DELETE CASCADE,
  os_id uuid NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  status_os text,
  status_tecnico text,
  finalizado boolean NOT NULL DEFAULT false,
  finalizado_em timestamptz,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  nota_fiscal_emitida boolean NOT NULL DEFAULT false,
  nota_fiscal_numero text,
  nota_fiscal_emitida_em timestamptz,
  valor_faturado numeric(12, 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversa_id, os_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_os_contexto_os ON whatsapp_os_contexto (os_id);

COMMENT ON TABLE whatsapp_os_contexto IS 'Snapshot do contexto da OS vinculada à conversa (status, pagamento, NF)';

-- ---------------------------------------------------------------------------
-- Automações — mensagem automática por evento/status da OS
-- ---------------------------------------------------------------------------
CREATE TABLE whatsapp_automacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  evento text NOT NULL CHECK (evento IN (
    'os_criada',
    'os_status_alterado',
    'os_aprovada',
    'os_concluida',
    'os_entregue',
    'os_orcamento_enviado',
    'os_aguardando_peca',
    'pagamento_confirmado',
    'nota_fiscal_emitida'
  )),
  status_trigger text,
  mensagem_template text NOT NULL,
  usar_template_meta boolean NOT NULL DEFAULT false,
  meta_template_name text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_automacoes_empresa_evento
  ON whatsapp_automacoes (empresa_id, evento, ativo);

COMMENT ON TABLE whatsapp_automacoes IS 'Regras de mensagem automática por evento/status da OS';
COMMENT ON COLUMN whatsapp_automacoes.mensagem_template IS 'Texto com variáveis: {{cliente_nome}}, {{numero_os}}, {{status}}, {{equipamento}}, {{valor}}';

-- FK automacao_id em mensagens (após criar whatsapp_automacoes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_mensagens_automacao_id_fkey'
  ) THEN
    ALTER TABLE whatsapp_mensagens
      ADD CONSTRAINT whatsapp_mensagens_automacao_id_fkey
      FOREIGN KEY (automacao_id) REFERENCES whatsapp_automacoes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE whatsapp_empresa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversa_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_os_contexto ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_automacoes ENABLE ROW LEVEL SECURITY;

-- Política genérica por empresa_id
DO $policy$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'whatsapp_empresa_config',
    'whatsapp_conversas',
    'whatsapp_mensagens',
    'whatsapp_conversa_notas',
    'whatsapp_os_contexto',
    'whatsapp_automacoes'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Empresa pode ver %1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Empresa pode inserir %1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Empresa pode atualizar %1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Empresa pode deletar %1$s" ON %1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Service role full %1$s" ON %1$s', t);

    EXECUTE format($sql$
      CREATE POLICY "Empresa pode ver %1$s" ON %1$s FOR SELECT USING (
        empresa_id IN (
          SELECT u.empresa_id FROM usuarios u
          WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
        )
      )$sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Empresa pode inserir %1$s" ON %1$s FOR INSERT WITH CHECK (
        empresa_id IN (
          SELECT u.empresa_id FROM usuarios u
          WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
        )
      )$sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Empresa pode atualizar %1$s" ON %1$s FOR UPDATE USING (
        empresa_id IN (
          SELECT u.empresa_id FROM usuarios u
          WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
        )
      )$sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Empresa pode deletar %1$s" ON %1$s FOR DELETE USING (
        empresa_id IN (
          SELECT u.empresa_id FROM usuarios u
          WHERE u.auth_user_id = auth.uid() OR u.id = auth.uid()
        )
      )$sql$, t);

    EXECUTE format($sql$
      CREATE POLICY "Service role full %1$s" ON %1$s FOR ALL TO service_role
      USING (true) WITH CHECK (true)$sql$, t);
  END LOOP;
END;
$policy$;

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_empresa_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_conversas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_mensagens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_conversa_notas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_os_contexto TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_automacoes TO authenticated;

GRANT ALL ON whatsapp_empresa_config TO service_role;
GRANT ALL ON whatsapp_conversas TO service_role;
GRANT ALL ON whatsapp_mensagens TO service_role;
GRANT ALL ON whatsapp_conversa_notas TO service_role;
GRANT ALL ON whatsapp_os_contexto TO service_role;
GRANT ALL ON whatsapp_automacoes TO service_role;

-- Automações padrão (inseridas por empresa na primeira configuração via API)
