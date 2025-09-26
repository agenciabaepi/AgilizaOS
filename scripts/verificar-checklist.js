// Script simplificado para criar a tabela checklist_itens
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTabelaChecklist() {
  console.log('🔧 Criando tabela checklist_itens...\n');

  try {
    // Tentar inserir um registro de teste para verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela existe...');
    
    const { data, error } = await supabase
      .from('checklist_itens')
      .select('id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('❌ Tabela checklist_itens não existe');
      console.log('\n📋 SOLUÇÃO: Execute o SQL abaixo no Supabase SQL Editor:\n');
      
      const sql = `-- Criar tabela checklist_itens
CREATE TABLE IF NOT EXISTS checklist_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100) DEFAULT 'geral',
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  obrigatorio BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_checklist_itens_empresa_id ON checklist_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_ativo ON checklist_itens(ativo);
CREATE INDEX IF NOT EXISTS idx_checklist_itens_categoria ON checklist_itens(categoria);

-- Criar trigger para updated_at
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

-- Inserir itens padrão para todas as empresas
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
);`;

      console.log(sql);
      console.log('\n📋 INSTRUÇÕES:');
      console.log('1. Copie todo o SQL acima');
      console.log('2. Acesse o Supabase Dashboard');
      console.log('3. Vá em SQL Editor');
      console.log('4. Cole o SQL e execute');
      console.log('5. Recarregue a página de configurações');
      
    } else if (error) {
      console.error('❌ Erro ao verificar tabela:', error.message);
    } else {
      console.log('✅ Tabela checklist_itens já existe!');
      
      // Contar itens existentes
      const { data: itens, error: countError } = await supabase
        .from('checklist_itens')
        .select('id', { count: 'exact' });
        
      if (countError) {
        console.error('❌ Erro ao contar itens:', countError.message);
      } else {
        console.log(`✅ Total de itens: ${itens?.length || 0}`);
        console.log('\n🎉 Sistema pronto para uso!');
        console.log('Recarregue a página de configurações para ver os itens.');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

criarTabelaChecklist().then(() => {
  console.log('\n🏁 Verificação concluída!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
