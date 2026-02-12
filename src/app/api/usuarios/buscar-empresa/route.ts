import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/usuarios/buscar-empresa?authUserId=xxx
 * Retorna o empresa_id do usuário logado (pela tabela usuarios).
 * O authUserId na query deve ser o mesmo do usuário da sessão (segurança).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const queryAuthUserId = url.searchParams.get('authUserId');

    // Só retornar empresa se o authUserId da query for o mesmo da sessão
    if (queryAuthUserId && queryAuthUserId !== user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !usuario) {
      return NextResponse.json(
        { error: 'Usuário ou empresa não encontrados' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      empresa_id: usuario.empresa_id,
    });
  } catch (err) {
    console.error('Erro em usuarios/buscar-empresa:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
