require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQueries() {
  console.log('🔍 Debug detalhado das queries...\n');

  // Empresa ID que aparece nos logs
  const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
  console.log('🏢 Empresa ID dos logs:', empresaId);

  try {
    // 1. Verificar se a empresa existe
    console.log('\n1️⃣ Verificando se a empresa existe...');
    const { data: empresaData, error: empresaError } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    console.log('📊 Empresa query result:');
    console.log('   - Error:', empresaError);
    console.log('   - Data:', empresaData);

    // 2. Contar total de grupos na tabela (sem filtro)
    console.log('\n2️⃣ Contando total de grupos na tabela...');
    const { count: totalGrupos, error: countError } = await supabase
      .from('grupos_produtos')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Total de grupos na tabela:', totalGrupos);
    console.log('   - Error:', countError);

    // 3. Buscar todos os grupos (sem filtro)
    console.log('\n3️⃣ Buscando todos os grupos (sem filtro)...');
    const { data: todosGrupos, error: todosGruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .limit(10);

    console.log('📊 Todos os grupos (primeiros 10):');
    console.log('   - Error:', todosGruposError);
    console.log('   - Count:', todosGrupos ? todosGrupos.length : 0);
    if (todosGrupos && todosGrupos.length > 0) {
      console.log('   - Primeiro grupo:', todosGrupos[0]);
      console.log('   - Empresa IDs únicos:', [...new Set(todosGrupos.map(g => g.empresa_id))]);
    }

    // 4. Buscar grupos com o empresa_id específico (como na aplicação)
    console.log('\n4️⃣ Buscando grupos com empresa_id específico...');
    const { data: gruposFiltrados, error: gruposFiltradosError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    console.log('📊 Grupos filtrados por empresa_id:');
    console.log('   - Error:', gruposFiltradosError);
    console.log('   - Count:', gruposFiltrados ? gruposFiltrados.length : 0);
    console.log('   - Data:', gruposFiltrados);

    // 5. Verificar se há diferença entre os empresa_ids
    if (todosGrupos && todosGrupos.length > 0) {
      console.log('\n5️⃣ Comparando empresa_ids...');
      const empresaIdsNaTabela = [...new Set(todosGrupos.map(g => g.empresa_id))];
      console.log('   - Empresa ID procurado:', empresaId);
      console.log('   - Empresa IDs na tabela:', empresaIdsNaTabela);
      
      const match = empresaIdsNaTabela.includes(empresaId);
      console.log('   - Há match?', match);
      
      if (!match) {
        console.log('❌ PROBLEMA: O empresa_id procurado não existe na tabela!');
      }
    }

    // 6. Verificar se há problemas de tipo de dados
    console.log('\n6️⃣ Verificando tipos de dados...');
    console.log('   - Tipo do empresaId:', typeof empresaId);
    console.log('   - Comprimento do empresaId:', empresaId.length);
    
    if (todosGrupos && todosGrupos.length > 0) {
      const primeiroGrupo = todosGrupos[0];
      console.log('   - Tipo do empresa_id na tabela:', typeof primeiroGrupo.empresa_id);
      console.log('   - Comprimento do empresa_id na tabela:', primeiroGrupo.empresa_id?.length);
    }

    // 7. Tentar query com diferentes abordagens
    console.log('\n7️⃣ Testando diferentes abordagens de query...');
    
    // Query com ilike (case insensitive)
    const { data: gruposIlike, error: gruposIlikeError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .ilike('empresa_id', empresaId);

    console.log('📊 Query com ilike:');
    console.log('   - Error:', gruposIlikeError);
    console.log('   - Count:', gruposIlike ? gruposIlike.length : 0);

    // Query com filter
    const { data: gruposFilter, error: gruposFilterError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .filter('empresa_id', 'eq', empresaId);

    console.log('📊 Query com filter:');
    console.log('   - Error:', gruposFilterError);
    console.log('   - Count:', gruposFilter ? gruposFilter.length : 0);

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

debugQueries();