import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/produtos-servicos/buscar?produtoId=xxx
 * Retorna um produto/serviço por ID, somente se pertencer à empresa do usuário logado.
 * Resposta: { data: ProdutoServico | null, error: string | null }
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const produtoId = url.searchParams.get('produtoId');
    if (!produtoId) {
      return NextResponse.json(
        { data: null, error: 'produtoId é obrigatório' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const { data: usuario, error: usuarioError } = await admin
      .from('usuarios')
      .select('id, empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuario?.empresa_id) {
      return NextResponse.json(
        { data: null, error: 'Usuário ou empresa não encontrados' },
        { status: 403 }
      );
    }

    const { data: produto, error } = await admin
      .from('produtos_servicos')
      .select('*')
      .eq('id', produtoId)
      .eq('empresa_id', usuario.empresa_id)
      .single();

    if (error || !produto) {
      return NextResponse.json(
        { data: null, error: error?.message || 'Produto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: produto, error: null });
  } catch (err) {
    console.error('Erro em produtos-servicos/buscar:', err);
    return NextResponse.json(
      {
        data: null,
        error: err instanceof Error ? err.message : 'Erro interno',
      },
      { status: 500 }
    );
  }
}
