import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, getEmpresaIdForUser } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/produtos-servicos/buscar?produtoId=xxx
 * Retorna um produto/serviço por ID, somente se pertencer à empresa do usuário logado.
 * Resposta: { data: ProdutoServico | null, error: string | null }
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) {
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

    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) {
      return NextResponse.json(
        { data: null, error: 'Usuário ou empresa não encontrados' },
        { status: 403 }
      );
    }

    const { data: produto, error } = await getSupabaseAdmin()
      .from('produtos_servicos')
      .select('*')
      .eq('id', produtoId)
      .eq('empresa_id', empresaId)
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
