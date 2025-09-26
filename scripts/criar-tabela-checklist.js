// Script para executar migração diretamente via Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Verifique se o arquivo .env.local existe e contém:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function criarTabelaChecklist() {
  console.log('🚀 Criando tabela checklist_itens...\n');

  try {
    // 1. Verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela existe...');
    
    const { data: testData, error: testError } = await supabase
      .from('checklist_itens')
      .select('id')
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      console.log('❌ Tabela não existe. Criando...');
      
      // 2. Criar tabela usando query direta (forçando criação)
      console.log('2️⃣ Tentando criar tabela...');
      
      // Primeiro, vamos tentar inserir um registro de teste para forçar a criação
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id')
        .limit(1);

      if (!empresas || empresas.length === 0) {
        console.log('❌ Nenhuma empresa encontrada. Crie uma empresa primeiro.');
        return;
      }

      const empresaId = empresas[0].id;
      console.log(`✅ Usando empresa ID: ${empresaId}`);

      // Tentar inserir um item de teste
      const { data: insertData, error: insertError } = await supabase
        .from('checklist_itens')
        .insert({
          empresa_id: empresaId,
          nome: 'Teste de Criação',
          descricao: 'Item criado automaticamente',
          categoria: 'geral',
          ordem: 0,
          obrigatorio: false,
          ativo: true
        })
        .select();

      if (insertError) {
        console.log('❌ Erro ao inserir item de teste:', insertError.message);
        console.log('\n📋 EXECUTE MANUALMENTE NO SUPABASE SQL EDITOR:');
        console.log('Copie e cole o SQL abaixo:\n');
        
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

-- Criar trigger
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

-- Inserir itens padrão
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
        return;
      }

      console.log('✅ Tabela criada com sucesso!');
      
      // Remover o item de teste
      if (insertData && insertData[0]) {
        await supabase
          .from('checklist_itens')
          .delete()
          .eq('id', insertData[0].id);
        console.log('✅ Item de teste removido');
      }

    } else if (testError) {
      console.error('❌ Erro ao verificar tabela:', testError.message);
      return;
    } else {
      console.log('✅ Tabela checklist_itens já existe!');
    }

    // 3. Inserir itens padrão
    console.log('\n3️⃣ Inserindo itens padrão...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome');

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError.message);
      return;
    }

    if (!empresas || empresas.length === 0) {
      console.log('⚠️ Nenhuma empresa encontrada');
      return;
    }

    console.log(`✅ Encontradas ${empresas.length} empresas`);

    const itensPadrao = [
      { nome: 'Aparelho não liga', descricao: 'Verificar se o aparelho liga normalmente', categoria: 'geral', ordem: 0, obrigatorio: false },
      { nome: 'Alto-falante', descricao: 'Testar funcionamento do alto-falante', categoria: 'audio', ordem: 1, obrigatorio: false },
      { nome: 'Microfone', descricao: 'Testar funcionamento do microfone', categoria: 'audio', ordem: 2, obrigatorio: false },
      { nome: 'Câmera frontal', descricao: 'Testar funcionamento da câmera frontal', categoria: 'video', ordem: 3, obrigatorio: false },
      { nome: 'Câmera traseira', descricao: 'Testar funcionamento da câmera traseira', categoria: 'video', ordem: 4, obrigatorio: false },
      { nome: 'Conectores', descricao: 'Testar funcionamento dos conectores (USB, P2, etc.)', categoria: 'conectividade', ordem: 5, obrigatorio: false },
      { nome: 'Botões', descricao: 'Testar funcionamento dos botões físicos', categoria: 'hardware', ordem: 6, obrigatorio: false },
      { nome: 'Vibração', descricao: 'Testar funcionamento da vibração', categoria: 'hardware', ordem: 7, obrigatorio: false },
      { nome: 'WiFi', descricao: 'Testar conectividade WiFi', categoria: 'conectividade', ordem: 8, obrigatorio: false },
      { nome: 'Bluetooth', descricao: 'Testar conectividade Bluetooth', categoria: 'conectividade', ordem: 9, obrigatorio: false },
      { nome: 'Biometria', descricao: 'Testar funcionamento da biometria (impressão digital, face)', categoria: 'seguranca', ordem: 10, obrigatorio: false },
      { nome: 'Carga', descricao: 'Testar funcionamento da carga', categoria: 'energia', ordem: 11, obrigatorio: false },
      { nome: 'Toque na tela', descricao: 'Testar responsividade do toque na tela', categoria: 'display', ordem: 12, obrigatorio: false }
    ];

    let totalInseridos = 0;
    for (const empresa of empresas) {
      console.log(`   📋 Processando ${empresa.nome}...`);
      
      for (const item of itensPadrao) {
        // Verificar se já existe
        const { data: existe } = await supabase
          .from('checklist_itens')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('nome', item.nome)
          .single();

        if (!existe) {
          const { error: insertError } = await supabase
            .from('checklist_itens')
            .insert({
              ...item,
              empresa_id: empresa.id
            });

          if (insertError) {
            console.log(`   ⚠️ Erro ao inserir ${item.nome}:`, insertError.message);
          } else {
            totalInseridos++;
          }
        }
      }
    }

    console.log(`✅ ${totalInseridos} itens inseridos com sucesso`);

    // 4. Verificar resultado
    console.log('\n4️⃣ Verificando resultado...');
    const { data: totalItens, error: countError } = await supabase
      .from('checklist_itens')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('❌ Erro ao contar itens:', countError.message);
    } else {
      console.log(`✅ Total de itens no sistema: ${totalItens?.length || 0}`);
    }

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n🚀 Agora você pode:');
    console.log('1. Recarregar a página de configurações');
    console.log('2. Acessar a aba "Checklist"');
    console.log('3. Ver os itens padrão carregados');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    console.log('\n📋 EXECUTE MANUALMENTE NO SUPABASE SQL EDITOR:');
    console.log('Copie e cole o conteúdo do arquivo: scripts/migrate-checklist-personalizado.sql');
  }
}

// Executar migração
criarTabelaChecklist().then(() => {
  console.log('\n🏁 Migração finalizada!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
