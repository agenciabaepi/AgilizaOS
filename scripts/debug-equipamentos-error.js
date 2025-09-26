const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugEquipamentosError() {
  console.log('🔍 Debugando erro na página de equipamentos...\n');

  try {
    // 1. Verificar se a tabela equipamentos_tipos existe
    console.log('1️⃣ Verificando se a tabela equipamentos_tipos existe...');
    const { data: equipamentos, error: equipamentosError } = await supabase
      .from('equipamentos_tipos')
      .select('*')
      .limit(1);

    if (equipamentosError) {
      console.log('❌ Erro ao buscar equipamentos:', equipamentosError);
      console.log('📋 Detalhes do erro:', equipamentosError.message);
      if (equipamentosError.code === '42P01') {
        console.log('❌ Tabela equipamentos_tipos NÃO EXISTE!');
        console.log('📋 Execute o SQL de migração no Supabase SQL Editor');
        return;
      }
    } else {
      console.log('✅ Tabela equipamentos_tipos existe');
    }

    // 2. Verificar se há empresas
    console.log('\n2️⃣ Verificando empresas...');
    const { data: empresas, error: empresasError } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(5);

    if (empresasError) {
      console.log('❌ Erro ao buscar empresas:', empresasError);
    } else {
      console.log('✅ Empresas encontradas:', empresas?.length || 0);
      if (empresas?.length === 0) {
        console.log('❌ Nenhuma empresa encontrada!');
        console.log('📋 Isso explica o erro na página de equipamentos');
        console.log('📋 A página precisa de uma empresa para funcionar');
        return;
      }
      console.log('📋 Primeira empresa:', empresas[0]);
    }

    // 3. Verificar equipamentos_tipos
    console.log('\n3️⃣ Verificando equipamentos_tipos...');
    const { data: equipamentos2, error: equipamentosError2 } = await supabase
      .from('equipamentos_tipos')
      .select('*')
      .limit(10);

    if (equipamentosError2) {
      console.log('❌ Erro ao buscar equipamentos:', equipamentosError2);
      console.log('📋 Detalhes do erro:', equipamentosError2.message);
    } else {
      console.log('✅ Equipamentos encontrados:', equipamentos2?.length || 0);
      if (equipamentos2?.length > 0) {
        console.log('📋 Primeiro equipamento:', equipamentos2[0]);
      }
    }

    // 4. Testar query específica da empresa
    if (empresas?.length > 0) {
      console.log('\n4️⃣ Testando query específica da empresa...');
      const empresaId = empresas[0].id;
      const { data: equipamentosEmpresa, error: equipamentosEmpresaError } = await supabase
        .from('equipamentos_tipos')
        .select('*')
        .eq('empresa_id', empresaId);

      if (equipamentosEmpresaError) {
        console.log('❌ Erro ao buscar equipamentos da empresa:', equipamentosEmpresaError);
      } else {
        console.log('✅ Equipamentos da empresa encontrados:', equipamentosEmpresa?.length || 0);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugEquipamentosError();
