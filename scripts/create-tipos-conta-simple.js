const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjbxwqhqlvgqzwyrfqkm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYnh3cWhxbHZncXp3eXJmcWttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQ4MTU4NCwiZXhwIjoyMDQ5MDU3NTg0fQ.mwZ3w6lKJ7p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  console.log('🚀 Criando tabela tipos_conta...');
  
  try {
    // Criar tabela usando SQL direto
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .eq('sql', `
        CREATE TABLE IF NOT EXISTS tipos_conta (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
          nome VARCHAR(100) NOT NULL,
          descricao TEXT,
          cor VARCHAR(7) DEFAULT '#6B7280',
          ativo BOOLEAN DEFAULT true,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
      return false;
    }

    console.log('✅ Tabela criada!');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function insertDefaultTypes() {
  console.log('📝 Inserindo tipos padrão...');
  
  try {
    // Buscar empresas
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id')
      .limit(5);

    if (empresasError) {
      console.error('❌ Erro ao buscar empresas:', empresasError);
      return false;
    }

    console.log(`📊 Empresas encontradas: ${empresas?.length || 0}`);

    // Tipos padrão
    const tiposPadrao = [
      { nome: 'Fornecedor', descricao: 'Contas relacionadas a fornecedores e compras', cor: '#3B82F6' },
      { nome: 'Energia', descricao: 'Contas de energia elétrica', cor: '#F59E0B' },
      { nome: 'Água', descricao: 'Contas de água e esgoto', cor: '#06B6D4' },
      { nome: 'Internet', descricao: 'Contas de internet e telefone', cor: '#8B5CF6' }
    ];

    let inserted = 0;

    if (empresas && empresas.length > 0) {
      for (const empresa of empresas) {
        for (const tipo of tiposPadrao) {
          const { error } = await supabase
            .from('tipos_conta')
            .insert({
              empresa_id: empresa.id,
              nome: tipo.nome,
              descricao: tipo.descricao,
              cor: tipo.cor,
              ativo: true
            });

          if (error && !error.message.includes('duplicate')) {
            console.error(`❌ Erro ao inserir tipo ${tipo.nome}:`, error.message);
          } else {
            inserted++;
          }
        }
      }
    }

    console.log(`✅ ${inserted} tipos inseridos!`);
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 Iniciando criação da tabela tipos_conta...\n');

  try {
    // Tentar inserir dados primeiro (se a tabela já existir)
    await insertDefaultTypes();
    console.log('✅ Processo concluído!');
  } catch (error) {
    console.log('⚠️ Erro ao inserir dados, tentando criar tabela...');
    await createTable();
    await insertDefaultTypes();
  }
}

main().catch(console.error);
