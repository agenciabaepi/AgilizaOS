const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjbxwqhqlvgqzwyrfqkm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYnh3cWhxbHZncXp3eXJmcWttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQ4MTU4NCwiZXhwIjoyMDQ5MDU3NTg0fQ.mwZ3w6lKJ7p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...');
  
  try {
    // Testar conexão básica
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }

    console.log('✅ Conexão OK! Empresas encontradas:', data?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function checkTable() {
  console.log('🔍 Verificando se tabela tipos_conta existe...');
  
  try {
    const { data, error } = await supabase
      .from('tipos_conta')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Tabela não existe:', error.message);
      return false;
    }

    console.log('✅ Tabela existe! Registros encontrados:', data?.length || 0);
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function createTableManually() {
  console.log('🚀 Criando tabela manualmente...');
  
  try {
    // Usar rpc para executar SQL
    const { data, error } = await supabase.rpc('exec', {
      sql: `
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
      `
    });

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

async function main() {
  console.log('🎯 Testando tipos_conta...\n');

  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Não foi possível conectar ao Supabase');
    return;
  }

  const tableExists = await checkTable();
  if (!tableExists) {
    console.log('📋 Tabela não existe, criando...');
    await createTableManually();
    await checkTable();
  }

  console.log('\n✅ Processo concluído!');
}

main().catch(console.error);
