-- Orçamentos comerciais (página /orcamentos): cabeçalho + itens
-- Separado da tabela `orcamentos` usada no fluxo de caixa/PDV (estrutura com JSON).
-- Execute no SQL Editor do Supabase (ou psql) uma vez.

-- ---------------------------------------------------------------------------
-- Cabeçalho
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orcamentos_emitidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,

  numero integer NOT NULL,
  data_emissao timestamptz NOT NULL DEFAULT now(),
  validade_dias integer NOT NULL DEFAULT 7,
  data_validade timestamptz,

  cliente_nome text,
  cliente_telefone text,
  cliente_email text,
  cliente_documento text,
  cliente_endereco text,

  desconto_modo text NOT NULL DEFAULT 'none'
    CHECK (desconto_modo IN ('none', 'percent', 'fixed')),
  desconto_percentual numeric(7, 4) DEFAULT 0,
  valor_desconto numeric(14, 2) NOT NULL DEFAULT 0,
  subtotal numeric(14, 2) NOT NULL DEFAULT 0,
  total numeric(14, 2) NOT NULL DEFAULT 0,

  forma_pagamento text,
  observacoes text,

  status text NOT NULL DEFAULT 'salvo'
    CHECK (status IN ('rascunho', 'salvo', 'enviado', 'aceito', 'recusado', 'cancelado')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_orcamentos_emitidos_empresa_numero UNIQUE (empresa_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_emitidos_empresa_id
  ON public.orcamentos_emitidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_emitidos_empresa_created
  ON public.orcamentos_emitidos(empresa_id, created_at DESC);

COMMENT ON TABLE public.orcamentos_emitidos IS
  'Orçamentos gerados na tela /orcamentos (cliente texto, itens, totais; número único por empresa).';

-- ---------------------------------------------------------------------------
-- Itens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orcamentos_emitidos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos_emitidos(id) ON DELETE CASCADE,
  produto_servico_id uuid REFERENCES public.produtos_servicos(id) ON DELETE SET NULL,

  descricao text NOT NULL,
  tipo text CHECK (tipo IS NULL OR tipo IN ('produto', 'servico')),
  quantidade numeric(14, 4) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario numeric(14, 2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total numeric(14, 2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,

  ordem smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_emitidos_itens_orcamento
  ON public.orcamentos_emitidos_itens(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_emitidos_itens_produto
  ON public.orcamentos_emitidos_itens(produto_servico_id)
  WHERE produto_servico_id IS NOT NULL;

COMMENT ON TABLE public.orcamentos_emitidos_itens IS
  'Linhas de produto/serviço de um orçamento emitido; valor_total é coluna gerada.';

-- ---------------------------------------------------------------------------
-- updated_at automático no cabeçalho
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_orcamentos_emitidos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orcamentos_emitidos_updated_at ON public.orcamentos_emitidos;
CREATE TRIGGER trg_orcamentos_emitidos_updated_at
  BEFORE UPDATE ON public.orcamentos_emitidos
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_orcamentos_emitidos_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: usuário só acessa orçamentos da própria empresa
-- ---------------------------------------------------------------------------
ALTER TABLE public.orcamentos_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos_emitidos_itens ENABLE ROW LEVEL SECURITY;

-- Cabeçalho
CREATE POLICY "orcamentos_emitidos_select_empresa"
  ON public.orcamentos_emitidos FOR SELECT
  TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "orcamentos_emitidos_insert_empresa"
  ON public.orcamentos_emitidos FOR INSERT
  TO authenticated
  WITH CHECK (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "orcamentos_emitidos_update_empresa"
  ON public.orcamentos_emitidos FOR UPDATE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "orcamentos_emitidos_delete_empresa"
  ON public.orcamentos_emitidos FOR DELETE
  TO authenticated
  USING (
    empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
    )
  );

-- Itens (via orçamento pai)
CREATE POLICY "orcamentos_emitidos_itens_select"
  ON public.orcamentos_emitidos_itens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos_emitidos o
      WHERE o.id = orcamento_id
        AND o.empresa_id IN (
          SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "orcamentos_emitidos_itens_insert"
  ON public.orcamentos_emitidos_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orcamentos_emitidos o
      WHERE o.id = orcamento_id
        AND o.empresa_id IN (
          SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "orcamentos_emitidos_itens_update"
  ON public.orcamentos_emitidos_itens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos_emitidos o
      WHERE o.id = orcamento_id
        AND o.empresa_id IN (
          SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orcamentos_emitidos o
      WHERE o.id = orcamento_id
        AND o.empresa_id IN (
          SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "orcamentos_emitidos_itens_delete"
  ON public.orcamentos_emitidos_itens FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos_emitidos o
      WHERE o.id = orcamento_id
        AND o.empresa_id IN (
          SELECT u.empresa_id FROM public.usuarios u WHERE u.auth_user_id = auth.uid()
        )
    )
  );

-- Service role (API server com admin client) ignora RLS, mas políticas explícitas opcionais:
-- CREATE POLICY "service_role_orcamentos_emitidos" ON public.orcamentos_emitidos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Exemplo de insert (substitua os UUIDs e valores)
-- ---------------------------------------------------------------------------
/*
INSERT INTO public.orcamentos_emitidos (
  empresa_id, usuario_id, numero, data_emissao, validade_dias, data_validade,
  cliente_nome, cliente_telefone, cliente_email, cliente_documento, cliente_endereco,
  desconto_modo, desconto_percentual, valor_desconto, subtotal, total,
  forma_pagamento, observacoes, status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  10390,
  now(),
  7,
  now() + interval '7 days',
  'Cliente Exemplo',
  '(12) 99999-9999',
  'cliente@email.com',
  '000.000.000-00',
  'Rua Exemplo, 123',
  'percent',
  10,
  50.00,
  500.00,
  450.00,
  'pix',
  'Garantia de 90 dias.',
  'salvo'
)
RETURNING id;

INSERT INTO public.orcamentos_emitidos_itens (
  orcamento_id, produto_servico_id, descricao, tipo, quantidade, valor_unitario, ordem
) VALUES (
  '<id_retornado_acima>',
  NULL,
  'Serviço de formatação',
  'servico',
  1,
  150.00,
  0
);
*/
