import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { fetchCoresPorAparelhoCatalogo } from '@/lib/aparelhos-catalogo-cores-db';

/** Variantes de cor (com imagens) de um aparelho do catálogo global */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const aparelhoId = new URL(request.url).searchParams.get('aparelho_catalogo_id');
    if (!aparelhoId) {
      return NextResponse.json({ error: 'aparelho_catalogo_id é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const cores = await fetchCoresPorAparelhoCatalogo(admin, aparelhoId);
    return NextResponse.json({ cores });
  } catch (error) {
    console.error('Erro ao buscar cores do aparelho:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
