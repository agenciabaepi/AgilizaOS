const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://ygqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncWpxanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI2NzEsImV4cCI6MjA1MDU0ODY3MX0.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRLSStatus() {
  console.log('🔍 INVESTIGANDO POR QUE OS GRUPOS NÃO APARECEM');
  console.log('================================================');
  
  try {
    // 1. Verificar status do RLS
    console.log('\n1. VERIFICANDO STATUS DO RLS:');
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('check_rls_status');
    
    if (rlsError) {
      console.log('❌ Erro ao verificar RLS:', rlsError.message);
      
      // Tentar query alternativa para verificar RLS
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name, row_security')
        .eq('table_schema', 'public')
        .in('table_name', ['grupos_produtos', 'categorias_produtos', 'subcategorias_produtos']);
        
      if (tablesError) {
        console.log('❌ Erro ao verificar tabelas:', tablesError.message);
      } else {
        console.log('📋 Status das tabelas:', tables);
      }
    } else {
      console.log('✅ Status RLS:', rlsStatus);
    }

    // 2. Verificar se existem dados na tabela
    console.log('\n2. VERIFICANDO DADOS NA TABELA grupos_produtos:');
    const { count: totalGrupos, error: countError } = await supabase
      .from('grupos_produtos')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Erro ao contar grupos:', countError);
    } else {
      console.log(`📊 Total de grupos na tabela: ${totalGrupos}`);
    }

    // 3. Tentar buscar alguns grupos sem filtro
    console.log('\n3. BUSCANDO GRUPOS SEM FILTRO:');
    const { data: gruposSemFiltro, error: gruposSemFiltroError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .limit(5);
    
    if (gruposSemFiltroError) {
      console.log('❌ Erro ao buscar grupos sem filtro:', gruposSemFiltroError);
    } else {
      console.log(`✅ Grupos encontrados sem filtro: ${gruposSemFiltro?.length || 0}`);
      if (gruposSemFiltro && gruposSemFiltro.length > 0) {
        console.log('📋 Primeiros grupos:', gruposSemFiltro.map(g => ({
          id: g.id,
          nome: g.nome,
          empresa_id: g.empresa_id
        })));
      }
    }

    // 4. Buscar com o empresaId específico
    const empresaId = '3a3958e9-9ac7-4f04-9d0b-d537df70a4ac';
    console.log(`\n4. BUSCANDO GRUPOS PARA EMPRESA ${empresaId}:`);
    
    const { data: gruposEmpresa, error: gruposEmpresaError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId);
    
    if (gruposEmpresaError) {
      console.log('❌ Erro ao buscar grupos da empresa:', gruposEmpresaError);
    } else {
      console.log(`✅ Grupos encontrados para empresa: ${gruposEmpresa?.length || 0}`);
      if (gruposEmpresa && gruposEmpresa.length > 0) {
        console.log('📋 Grupos da empresa:', gruposEmpresa.map(g => ({
          id: g.id,
          nome: g.nome,
          empresa_id: g.empresa_id
        })));
      }
    }

    // 5. Verificar autenticação atual
    console.log('\n5. VERIFICANDO AUTENTICAÇÃO:');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Erro ao verificar usuário:', userError.message);
    } else if (user) {
      console.log('✅ Usuário autenticado:', {
        id: user.id,
        email: user.email
      });
      
      // Buscar dados do usuário
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*, empresa_id')
        .eq('id', user.id)
        .single();
        
      if (usuarioError) {
        console.log('❌ Erro ao buscar dados do usuário:', usuarioError.message);
      } else {
        console.log('✅ Dados do usuário:', usuarioData);
      }
    } else {
      console.log('❌ Nenhum usuário autenticado');
    }

    // 6. Testar query exata da aplicação
    console.log('\n6. TESTANDO QUERY EXATA DA APLICAÇÃO:');
    const queryExata = supabase
      .from('grupos_produtos')
      .select(`
        id,
        nome,
        descricao,
        empresa_id,
        created_at,
        updated_at
      `)
      .eq('empresa_id', empresaId)
      .order('nome');
    
    const { data: resultadoExato, error: erroExato } = await queryExata;
    
    if (erroExato) {
      console.log('❌ Erro na query exata:', erroExato);
    } else {
      console.log(`✅ Resultado da query exata: ${resultadoExato?.length || 0} grupos`);
      if (resultadoExato && resultadoExato.length > 0) {
        console.log('📋 Grupos encontrados:', resultadoExato.map(g => g.nome));
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o debug
debugRLSStatus().then(() => {
  console.log('\n🏁 Debug concluído');
  process.exit(0);
}).catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});