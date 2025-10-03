const { createClient } = require('@supabase/supabase-js');

const supabaseConfig = {
  url: 'https://nxamrvfusyrtkcshehfm.supabase.co',
  anonKey: 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31'
};

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

async function debugCategoriasLogs() {
  console.log('=== DEBUG: Simulando logs da página de categorias ===\n');

  try {
    // Simular o que acontece quando a página carrega
    console.log('DEBUG: Componente CategoriasPage carregado');
    console.log('DEBUG: useEffect resolverEmpresa executado');
    console.log('DEBUG: Iniciando resolução do empresaId...');

    // 1. Simular verificação de usuarioData (que vem do AuthContext)
    console.log('DEBUG: usuarioData?.empresa_id: undefined (simulando sem autenticação)');
    
    // 2. Simular busca via auth
    console.log('DEBUG: Buscando empresa_id via auth...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('DEBUG: Usuário obtido:', user ? 'Autenticado' : 'Não autenticado');
      
      if (!user) {
        console.log('❌ PROBLEMA: Nenhum usuário autenticado');
        console.log('🔍 CAUSA: A página não consegue obter o empresaId');
        console.log('📋 RESULTADO: empresaId permanece null');
        console.log('📋 CONSEQUÊNCIA: carregarDados() nunca é executado');
        console.log('📋 TELA: Mostra "Nenhum grupo criado" porque grupos.length === 0');
        return;
      }

      console.log('DEBUG: Buscando dados do usuário no banco...');
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', user.id)
        .single();
      
      console.log('DEBUG: Resultado da busca:', { userData, error });
      
      if (userData?.empresa_id) {
        console.log('DEBUG: Definindo empresaId:', userData.empresa_id);
        
        // 3. Simular carregarDados()
        await simularCarregarDados(userData.empresa_id);
      } else {
        console.log('❌ PROBLEMA: Empresa não encontrada para o usuário');
        console.log('🔍 CAUSA: Usuário não tem empresa_id válido');
        console.log('📋 RESULTADO: empresaId permanece null');
        console.log('📋 CONSEQUÊNCIA: carregarDados() nunca é executado');
        console.log('📋 TELA: Mostra "Nenhum grupo criado"');
      }
      
    } catch (authError) {
      console.log('❌ PROBLEMA: Erro na autenticação:', authError.message);
      console.log('🔍 CAUSA: Falha ao obter usuário ou dados do usuário');
      console.log('📋 RESULTADO: empresaId permanece null');
      console.log('📋 CONSEQUÊNCIA: carregarDados() nunca é executado');
      console.log('📋 TELA: Mostra "Nenhum grupo criado"');
    }

  } catch (error) {
    console.log('❌ ERRO GERAL:', error);
  }
}

async function simularCarregarDados(empresaId) {
  console.log(`\n=== SIMULAÇÃO: carregarDados() com empresaId ${empresaId} ===\n`);
  
  try {
    console.log('DEBUG: Executando carregarDados...');
    console.log(`DEBUG: empresaId = ${empresaId}`);
    
    if (!empresaId) {
      console.log('DEBUG: empresaId é null, saindo da função');
      console.log('DEBUG: setLoading(false)');
      return;
    }

    console.log('DEBUG: setLoading(true)');
    
    // Buscar grupos
    console.log('DEBUG: Buscando grupos...');
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');

    if (gruposError) {
      console.log('❌ ERRO ao buscar grupos:', gruposError);
      console.log('DEBUG: setLoading(false)');
      console.log('📋 RESULTADO: grupos permanece []');
      console.log('📋 TELA: Mostra "Nenhum grupo criado"');
      return;
    }

    console.log(`DEBUG: Grupos carregados: ${gruposData.length}`);
    console.log('DEBUG: setGrupos(gruposData)');
    
    // Buscar categorias
    console.log('DEBUG: Buscando categorias...');
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select(`
        *,
        grupo:grupos_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (categoriasError) {
      console.log('❌ ERRO ao buscar categorias:', categoriasError);
    } else {
      console.log(`DEBUG: Categorias carregadas: ${categoriasData.length}`);
      console.log('DEBUG: setCategorias(categoriasData)');
    }

    // Buscar subcategorias
    console.log('DEBUG: Buscando subcategorias...');
    const { data: subcategoriasData, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select(`
        *,
        categoria:categorias_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');

    if (subcategoriasError) {
      console.log('❌ ERRO ao buscar subcategorias:', subcategoriasError);
    } else {
      console.log(`DEBUG: Subcategorias carregadas: ${subcategoriasData.length}`);
      console.log('DEBUG: setSubcategorias(subcategoriasData)');
    }

    console.log('DEBUG: setLoading(false)');
    
    // Simular renderização
    console.log('\n=== SIMULAÇÃO: Renderização da tela ===');
    const loading = false;
    const gruposLength = gruposData ? gruposData.length : 0;
    const mostrarMensagem = gruposLength === 0 && !loading;
    
    console.log('Estado final:');
    console.log(`   - loading: ${loading}`);
    console.log(`   - grupos.length: ${gruposLength}`);
    console.log(`   - Condição (grupos.length === 0 && !loading): ${mostrarMensagem}`);
    
    if (mostrarMensagem) {
      console.log('\n❌ PROBLEMA: Tela mostrará "Nenhum grupo criado"');
      console.log('🔍 CAUSA: Não há grupos para este empresaId');
    } else {
      console.log('\n✅ SUCESSO: Tela mostrará os grupos encontrados');
      console.log('📋 Grupos que aparecerão:');
      gruposData.slice(0, 5).forEach((grupo, index) => {
        console.log(`   ${index + 1}. ${grupo.nome}`);
      });
      if (gruposData.length > 5) {
        console.log(`   ... e mais ${gruposData.length - 5} grupos`);
      }
    }

  } catch (error) {
    console.log('❌ ERRO em carregarDados:', error);
    console.log('DEBUG: setLoading(false)');
    console.log('📋 RESULTADO: grupos permanece []');
    console.log('📋 TELA: Mostra "Nenhum grupo criado"');
  }
}

debugCategoriasLogs();