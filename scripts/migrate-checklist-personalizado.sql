-- Script para criar tabela de itens de checklist personalizados por empresa
-- Execute este SQL no Supabase SQL Editor

-- 1. Criar tabela checklist_itens
CREATE TABLE IF NOT EXISTS checklist_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) DEFAULT 'geral', -- geral, audio, video, conectividade, etc.
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0, -- para ordenar os itens
  obrigatorio BOOLEAN DEFAULT false, -- se o item é obrigatório
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_checklist_itens_empresa_id ON checklist_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_ativo ON checklist_itens(ativo);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_categoria ON checklist_itens(categoria);

-- 3. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checklist_itens_updated_at 
    BEFORE UPDATE ON checklist_itens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Inserir itens padrão para empresas existentes
-- Primeiro, vamos inserir itens padrão para cada empresa
INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Aparelho não liga' as nome,
  'Verificar se o aparelho liga normalmente' as descricao,
  'geral' as categoria,
  0 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Aparelho não liga'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Alto-falante' as nome,
  'Testar funcionamento do alto-falante' as descricao,
  'audio' as categoria,
  1 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Alto-falante'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Microfone' as nome,
  'Testar funcionamento do microfone' as descricao,
  'audio' as categoria,
  2 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Microfone'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Câmera frontal' as nome,
  'Testar funcionamento da câmera frontal' as descricao,
  'video' as categoria,
  3 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Câmera frontal'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Câmera traseira' as nome,
  'Testar funcionamento da câmera traseira' as descricao,
  'video' as categoria,
  4 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Câmera traseira'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Conectores' as nome,
  'Testar funcionamento dos conectores (USB, P2, etc.)' as descricao,
  'conectividade' as categoria,
  5 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Conectores'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Botões' as nome,
  'Testar funcionamento dos botões físicos' as descricao,
  'hardware' as categoria,
  6 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Botões'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Vibração' as nome,
  'Testar funcionamento da vibração' as descricao,
  'hardware' as categoria,
  7 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Vibração'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'WiFi' as nome,
  'Testar conectividade WiFi' as descricao,
  'conectividade' as categoria,
  8 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'WiFi'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Bluetooth' as nome,
  'Testar conectividade Bluetooth' as descricao,
  'conectividade' as categoria,
  9 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Bluetooth'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Biometria' as nome,
  'Testar funcionamento da biometria (impressão digital, face)' as descricao,
  'seguranca' as categoria,
  10 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Biometria'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Carga' as nome,
  'Testar funcionamento da carga' as descricao,
  'energia' as categoria,
  11 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Carga'
);

INSERT INTO checklist_itens (empresa_id, nome, descricao, categoria, ordem, obrigatorio)
SELECT 
  e.id as empresa_id,
  'Toque na tela' as nome,
  'Testar responsividade do toque na tela' as descricao,
  'display' as categoria,
  12 as ordem,
  false as obrigatorio
FROM empresas e
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_itens ci 
  WHERE ci.empresa_id = e.id 
  AND ci.nome = 'Toque na tela'
);

-- 5. Comentários sobre a estrutura
COMMENT ON TABLE checklist_itens IS 'Itens de checklist personalizados por empresa';
COMMENT ON COLUMN checklist_itens.empresa_id IS 'ID da empresa proprietária do checklist';
COMMENT ON COLUMN checklist_itens.nome IS 'Nome do item de checklist';
COMMENT ON COLUMN checklist_itens.descricao IS 'Descrição detalhada do item';
COMMENT ON COLUMN checklist_itens.categoria IS 'Categoria do item (geral, audio, video, etc.)';
COMMENT ON COLUMN checklist_itens.ativo IS 'Se o item está ativo e disponível';
COMMENT ON COLUMN checklist_itens.ordem IS 'Ordem de exibição do item';
COMMENT ON COLUMN checklist_itens.obrigatorio IS 'Se o item é obrigatório no checklist';
