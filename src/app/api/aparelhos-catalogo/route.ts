import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { applyAparelhoTipoFilter } from '@/lib/aparelhos-tipo';
import { fetchCoresPorAparelhosCatalogo } from '@/lib/aparelhos-catalogo-cores-db';
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;
const SELECT_COLS = 'id, tipo, tipo_id, marca, modelo, imagem_url, imagem_frente_url, imagem_verso_url';

async function fetchAllAparelhos(
  admin: SupabaseClient,
  opts: { tipo?: string | null; tipo_id?: string | null; busca?: string | null }
) {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = admin
      .from('aparelhos_catalogo')
      .select(SELECT_COLS)
      .eq('ativo', true)
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    query = applyAparelhoTipoFilter(query, { tipo_id: opts.tipo_id, tipo: opts.tipo });

    if (opts.busca) {
      const term = `%${opts.busca.trim()}%`;
      query = query.or(`marca.ilike.${term},modelo.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/** Lista aparelhos do catálogo global (somente leitura, para usuários autenticados) */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get('busca');
    const tipo = searchParams.get('tipo');
    const tipo_id = searchParams.get('tipo_id');

    const admin = getSupabaseAdmin();
    const aparelhos = await fetchAllAparelhos(admin, { tipo, tipo_id, busca });

    const comCores = searchParams.get('com_cores') !== 'false';
    if (!comCores || !aparelhos.length) {
      return NextResponse.json({ aparelhos });
    }

    const ids = aparelhos.map((a) => a.id as string);
    const coresMap = await fetchCoresPorAparelhosCatalogo(admin, ids);

    const comCoresList = aparelhos.map((a) => ({
      ...a,
      cores: coresMap.get(a.id as string) || [],
    }));
    return NextResponse.json({ aparelhos: comCoresList });
  } catch (error) {
    console.error('Erro ao buscar catálogo de aparelhos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
