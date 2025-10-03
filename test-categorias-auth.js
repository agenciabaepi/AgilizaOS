const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxamrvfusyrtkcshehfm.supabase.co';
const supabaseKey = 'sb_publishable_yeCVZiOGAsnR7D9jDDkdNw_r-aOcv31';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCategorias() {
  console.log('🔍 Testando consulta de categorias com autenticação...');
  
  try {
    // 1. Fazer login
    console.log('1. Fazendo login...');
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'techrodolfo@gmail.com',
      password: '123456'
    });
    
    if (loginError) {
      console.error('❌ Erro no login:', loginError);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log('👤 Usuário autenticado:', authData.user.id);
    
    // 2. Buscar dados do usuário
    console.log('2. Buscando dados do usuário...');
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('empresa_id, nome')
      .eq('auth_user_id', authData.user.id)
      .single();
    
    if (usuarioError) {
      console.error('❌ Erro ao buscar usuário:', usuarioError);
      return;
    }
    
    console.log('✅ Dados do usuário:', usuarioData);
    const empresaId = usuarioData.empresa_id;
    
    // 3. Buscar grupos
    console.log('3. Buscando grupos...');
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nome');
    
    console.log('📊 Resultado da consulta de grupos:');
    console.log('  Data:', gruposData);
    console.log('  Error:', gruposError);
    console.log('  Quantidade:', gruposData?.length || 0);
    
    if (gruposData && gruposData.length > 0) {
      console.log('✅ Grupos encontrados:');
      gruposData.forEach((grupo, index) => {
        console.log(`  ${index + 1}. ${grupo.nome} (ID: ${grupo.id})`);
      });
    } else {
      console.log('⚠️ Nenhum grupo encontrado');
    }
    
    // 4. Buscar categorias
    console.log('4. Buscando categorias...');
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_produtos')
      .select(`
        *,
        grupo:grupos_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');
    
    console.log('📊 Resultado da consulta de categorias:');
    console.log('  Data:', categoriasData);
    console.log('  Error:', categoriasError);
    console.log('  Quantidade:', categoriasData?.length || 0);
    
    // 5. Buscar subcategorias
    console.log('5. Buscando subcategorias...');
    const { data: subcategoriasData, error: subcategoriasError } = await supabase
      .from('subcategorias_produtos')
      .select(`
        *,
        categoria:categorias_produtos(nome)
      `)
      .eq('empresa_id', empresaId)
      .order('nome');
    
    console.log('📊 Resultado da consulta de subcategorias:');
    console.log('  Data:', subcategoriasData);
    console.log('  Error:', subcategoriasError);
    console.log('  Quantidade:', subcategoriasData?.length || 0);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testCategorias();