import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    console.log('🔍 DEBUG PRODUTOS: Iniciando verificação...');
    
    // 1. Verificar se as tabelas existem
    console.log('📋 Verificando estrutura das tabelas...');
    
    const tabelas = [
      'produtos_servicos',
      'grupos_produtos', 
      'categorias_produtos',
      'subcategorias_produtos',
      'usuarios',
      'empresas'
    ];
    
    const resultados: any = {};
    
    for (const tabela of tabelas) {
      try {
        const { data, error } = await supabase
          .from(tabela)
          .select('*')
          .limit(1);
          
        if (error) {
          resultados[tabela] = { error: error.message, code: error.code };
        } else {
          resultados[tabela] = { 
            existe: true, 
            temDados: data && data.length > 0,
            totalRegistros: data ? data.length : 0
          };
        }
      } catch (err: any) {
        resultados[tabela] = { erro: err.message };
      }
    }
    
    // 2. Verificar produtos por empresa
    console.log('🏢 Verificando produtos por empresa...');
    
    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, nome')
      .limit(5);
      
    const produtosPorEmpresa: any = {};
    
    if (empresas) {
      for (const empresa of empresas) {
        const { data: produtos, error: produtosError } = await supabase
          .from('produtos_servicos')
          .select('id, nome, empresa_id')
          .eq('empresa_id', empresa.id);
          
        produtosPorEmpresa[empresa.nome] = {
          empresa_id: empresa.id,
          totalProdutos: produtos ? produtos.length : 0,
          produtos: produtos || [],
          erro: produtosError ? produtosError.message : null
        };
      }
    }
    
    // 3. Verificar categorias por empresa
    console.log('📂 Verificando categorias por empresa...');
    
    const categoriasPorEmpresa: any = {};
    
    if (empresas) {
      for (const empresa of empresas) {
        // Grupos
        const { data: grupos } = await supabase
          .from('grupos_produtos')
          .select('id, nome')
          .eq('empresa_id', empresa.id);
          
        // Categorias
        const { data: categorias } = await supabase
          .from('categorias_produtos')
          .select('id, nome')
          .eq('empresa_id', empresa.id);
          
        // Subcategorias
        const { data: subcategorias } = await supabase
          .from('subcategorias_produtos')
          .select('id, nome')
          .eq('empresa_id', empresa.id);
          
        categoriasPorEmpresa[empresa.nome] = {
          empresa_id: empresa.id,
          grupos: grupos || [],
          categorias: categorias || [],
          subcategorias: subcategorias || []
        };
      }
    }
    
    // 4. Verificar usuários e suas empresas
    console.log('👥 Verificando usuários e empresas...');
    
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nome, email, empresa_id, nivel')
      .limit(10);
      
    const usuariosComEmpresa = usuarios?.map(usuario => ({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      empresa_id: usuario.empresa_id,
      nivel: usuario.nivel,
      temEmpresa: !!usuario.empresa_id
    })) || [];
    
    return NextResponse.json({
      success: true,
      debug: {
        timestamp: new Date().toISOString(),
        tabelas: resultados,
        empresas: empresas || [],
        produtosPorEmpresa,
        categoriasPorEmpresa,
        usuariosComEmpresa,
        resumo: {
          totalEmpresas: empresas?.length || 0,
          totalUsuarios: usuariosComEmpresa.length,
          usuariosComEmpresa: usuariosComEmpresa.filter(u => u.temEmpresa).length,
          usuariosSemEmpresa: usuariosComEmpresa.filter(u => !u.temEmpresa).length
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erro no debug de produtos:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
