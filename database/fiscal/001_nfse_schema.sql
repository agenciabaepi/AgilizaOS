-- NFS-e Nacional (Sistema Nacional / SEFIN + ADN)
-- Execute no Supabase SQL Editor.
-- Documentação: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica

-- ---------------------------------------------------------------------------
-- Configuração fiscal por empresa (NFS-e primeiro; NF-e/NFC-e depois)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_empresa_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Ambiente: producao_restrita (homologação oficial) | producao
  ambiente text NOT NULL DEFAULT 'producao_restrita'
    CHECK (ambiente IN ('producao_restrita', 'producao')),

  -- Regime: mei | me_epp (Simples) | nao_optante
  opcao_simples text NOT NULL DEFAULT 'me_epp'
    CHECK (opcao_simples IN ('mei', 'me_epp', 'nao_optante')),

  -- Apuração SN (só ME/EPP): 1=fed+mun SN | 2=fed SN / mun fora | 3=ambos fora
  regime_apuracao_sn text DEFAULT '1'
    CHECK (regime_apuracao_sn IS NULL OR regime_apuracao_sn IN ('1', '2', '3')),

  regime_especial text NOT NULL DEFAULT '0',

  cnpj text NOT NULL,
  inscricao_municipal text,
  cod_municipio_ibge char(7) NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,

  -- Série DPS para apps próprios/API: 00001–49999 (FAQ CGNFS-e)
  serie_dps varchar(5) NOT NULL DEFAULT '1',

  -- Serviço padrão de assistência técnica (NBS / cTribNac) — editável
  c_trib_nac varchar(6),
  c_nbs varchar(9),
  descricao_servico_padrao text,
  aliquota_iss numeric(5, 2),
  percentual_tot_trib_sn numeric(5, 2),

  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

COMMENT ON TABLE fiscal_empresa_config IS 'Configuração do emitente NFS-e Nacional por empresa';
COMMENT ON COLUMN fiscal_empresa_config.ambiente IS 'producao_restrita = homologação SEFIN; producao = notas com valor fiscal';
COMMENT ON COLUMN fiscal_empresa_config.serie_dps IS 'Série da DPS (aplicativos próprios: 1–49999)';

-- ---------------------------------------------------------------------------
-- Certificado A1 (PFX) — ciphertext AES-256-GCM; senha nunca em plaintext
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_certificados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'A1' CHECK (tipo = 'A1'),
  subject_cn text,
  cnpj_certificado text,
  not_before timestamptz,
  not_after timestamptz,
  fingerprint_sha256 text,
  -- Blob criptografado: iv + tag + ciphertext (base64) do PFX
  pfx_ciphertext text NOT NULL,
  -- Senha do PFX criptografada com a mesma chave de cofre
  password_ciphertext text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id)
);

COMMENT ON TABLE fiscal_certificados IS 'Certificado A1 ICP-Brasil por empresa (cofre AES-GCM)';
COMMENT ON COLUMN fiscal_certificados.pfx_ciphertext IS 'PFX criptografado — nunca expor ao client';

CREATE INDEX IF NOT EXISTS idx_fiscal_certificados_expira
  ON fiscal_certificados (not_after)
  WHERE ativo = true;

-- ---------------------------------------------------------------------------
-- Contador atômico de nDPS (obrigatório — SEFIN rejeita fora de ordem/duplicado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_dps_counters (
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cnpj char(14) NOT NULL,
  serie varchar(5) NOT NULL,
  proximo_ndps bigint NOT NULL DEFAULT 1
    CHECK (proximo_ndps BETWEEN 1 AND 999999999999999),
  PRIMARY KEY (empresa_id, cnpj, serie)
);

-- ---------------------------------------------------------------------------
-- Retry store (falhas transientes / 429) — replay via cron
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_nfse_pending (
  id text PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'emission',
    'cancelamento_simples',
    'cancelamento_por_substituicao',
    'rollback_cancelamento'
  )),
  id_dps char(45),
  emitente_cnpj char(14),
  serie varchar(5),
  ndps bigint,
  chave_nfse char(50),
  chave_substituta char(50),
  tipo_evento varchar(10),
  c_motivo varchar(2),
  x_motivo text,
  xml_assinado text NOT NULL,
  first_attempt_at timestamptz NOT NULL,
  last_attempt_at timestamptz NOT NULL,
  not_before timestamptz,
  attempts int NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  last_error_msg text NOT NULL,
  last_error_name text NOT NULL,
  last_error_transient boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_pending_empresa
  ON fiscal_nfse_pending (empresa_id, last_attempt_at);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_pending_not_before
  ON fiscal_nfse_pending (not_before) WHERE not_before IS NOT NULL;

-- ---------------------------------------------------------------------------
-- NFS-e autorizadas (documento fiscal — retenção ≥ 5 anos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_nfse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  chave_acesso char(50) NOT NULL,
  id_dps varchar(60) NOT NULL,
  numero_nfse text,
  numero_dfse text,
  serie_dps varchar(5),
  numero_dps bigint,
  status text NOT NULL DEFAULT 'autorizada'
    CHECK (status IN ('autorizada', 'cancelada', 'substituida')),
  tipo_ambiente smallint NOT NULL CHECK (tipo_ambiente IN (1, 2)),
  xml_nfse text NOT NULL,
  valor_servico numeric(15, 2),
  valor_liquido numeric(15, 2),
  tomador_documento text,
  tomador_nome text,
  descricao_servico text,
  c_trib_nac varchar(6),
  dh_proc timestamptz,
  -- Vínculos de negócio (OS / venda)
  ordem_servico_id uuid REFERENCES ordens_servico(id) ON DELETE SET NULL,
  venda_id uuid,
  emitido_por_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, chave_acesso),
  UNIQUE (empresa_id, id_dps)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_empresa_dh
  ON fiscal_nfse (empresa_id, dh_proc DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_os
  ON fiscal_nfse (ordem_servico_id) WHERE ordem_servico_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_tomador
  ON fiscal_nfse (empresa_id, tomador_documento);

-- ---------------------------------------------------------------------------
-- Rejeições permanentes (auditoria)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_nfse_rejeicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  id_dps char(45),
  codigo varchar(20) NOT NULL,
  descricao text NOT NULL,
  mensagens jsonb,
  payload_resumo jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_rejeicoes_empresa
  ON fiscal_nfse_rejeicoes (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_nfse_rejeicoes_codigo
  ON fiscal_nfse_rejeicoes (codigo);

-- ---------------------------------------------------------------------------
-- Eventos (cancelamento 101101, substituição 105102, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fiscal_nfse_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nfse_id uuid REFERENCES fiscal_nfse(id) ON DELETE CASCADE,
  chave_acesso char(50) NOT NULL,
  tipo_evento varchar(10) NOT NULL,
  num_seq_evento int NOT NULL DEFAULT 1,
  xml_evento text NOT NULL,
  dh_registro timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, chave_acesso, tipo_evento, num_seq_evento)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE fiscal_empresa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_dps_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfse_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfse ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfse_rejeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_nfse_eventos ENABLE ROW LEVEL SECURITY;

DO $policy$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fiscal_empresa_config',
    'fiscal_certificados',
    'fiscal_dps_counters',
    'fiscal_nfse_pending',
    'fiscal_nfse',
    'fiscal_nfse_rejeicoes',
    'fiscal_nfse_eventos'
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

-- Certificado: NUNCA expor ciphertext ao role authenticated (só service_role / API).
DROP POLICY IF EXISTS "Empresa pode ver fiscal_certificados" ON fiscal_certificados;
DROP POLICY IF EXISTS "Empresa pode inserir fiscal_certificados" ON fiscal_certificados;
DROP POLICY IF EXISTS "Empresa pode atualizar fiscal_certificados" ON fiscal_certificados;
DROP POLICY IF EXISTS "Empresa pode deletar fiscal_certificados" ON fiscal_certificados;
DROP POLICY IF EXISTS "Empresa ve metadados certificado" ON fiscal_certificados;
REVOKE ALL ON fiscal_certificados FROM authenticated;
REVOKE ALL ON fiscal_dps_counters FROM authenticated;
REVOKE ALL ON fiscal_nfse_pending FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON fiscal_empresa_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON fiscal_nfse TO authenticated;
GRANT SELECT ON fiscal_nfse_rejeicoes TO authenticated;
GRANT SELECT ON fiscal_nfse_eventos TO authenticated;

GRANT ALL ON fiscal_empresa_config TO service_role;
GRANT ALL ON fiscal_certificados TO service_role;
GRANT ALL ON fiscal_dps_counters TO service_role;
GRANT ALL ON fiscal_nfse_pending TO service_role;
GRANT ALL ON fiscal_nfse TO service_role;
GRANT ALL ON fiscal_nfse_rejeicoes TO service_role;
GRANT ALL ON fiscal_nfse_eventos TO service_role;
