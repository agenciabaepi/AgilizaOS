const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://mjbxwqhqlvgqzwyrfqkm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qYnh3cWhxbHZncXp3eXJmcWttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQ4MTU4NCwiZXhwIjoyMDQ5MDU3NTg0fQ.mwZ3w6lKJ7p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8p6wJ8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function createTable() {
  console.log('🚀 Criando tabela tipos_conta...');
  
  try {
    // Tentar inserir um registro de teste para criar a tabela
    const { data, error } = await supabase
      .from('tipos_conta')
      .insert({
        empresa_id: '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac', // ID da empresa de teste
        nome: 'Teste',
        descricao: 'Tipo de teste',
        cor: '#FF0000',
        ativo: true
      });

    if (error) {
      console.log('❌ Erro ao criar tabela:', error.message);
      return false;
    }

    console.log('✅ Tabela criada com sucesso!');
    
    // Deletar o registro de teste
    await supabase
      .from('tipos_conta')
      .delete()
      .eq('nome', 'Teste');
    
    console.log('🧹 Registro de teste removido');
    return true;
  } catch (error) {
    console.error('❌ Erro:', error);
    return false;
  }
}

async function main() {
  console.log('🎯 Verificando tipos_conta...\n');

  const tableExists = await checkTable();
  
  if (!tableExists) {
    console.log('📋 Tabela não existe, tentando criar...');
    await createTable();
    await checkTable();
  }

  console.log('\n✅ Verificação concluída!');
}

main().catch(console.error);
