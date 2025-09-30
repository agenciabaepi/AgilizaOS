import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Usuário não autenticado',
        authError: authError?.message 
      }, { status: 401 });
    }

    // Buscar dados do usuário
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuarioData) {
      return NextResponse.json({ 
        error: 'Dados do usuário não encontrados',
        usuarioError: usuarioError?.message 
      }, { status: 404 });
    }

    // Buscar todos os grupos (sem filtro de empresa)
    const { data: todosGrupos, error: todosGruposError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .order('created_at', { ascending: false });

    // Buscar grupos da empresa específica
    const { data: gruposEmpresa, error: gruposEmpresaError } = await supabase
      .from('grupos_produtos')
      .select('*')
      .eq('empresa_id', usuarioData.empresa_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      usuario: {
        id: usuarioData.id,
        nome: usuarioData.nome,
        email: usuarioData.email,
        empresa_id: usuarioData.empresa_id
      },
      todosGrupos: {
        count: todosGrupos?.length || 0,
        data: todosGrupos,
        error: todosGruposError?.message
      },
      gruposEmpresa: {
        count: gruposEmpresa?.length || 0,
        data: gruposEmpresa,
        error: gruposEmpresaError?.message
      }
    });

  } catch (error: unknown) {
    console.error('❌ Erro na API test-grupos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
