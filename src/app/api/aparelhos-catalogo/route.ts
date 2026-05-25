import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { applyAparelhoTipoFilter } from '@/lib/aparelhos-tipo';
import { fetchCoresPorAparelhosCatalogo } from '@/lib/aparelhos-catalogo-cores-db';

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
    let query = admin
      .from('aparelhos_catalogo')
      .select('id, tipo, tipo_id, marca, modelo, imagem_url, imagem_frente_url, imagem_verso_url')
      .eq('ativo', true)
      .order('marca', { ascending: true })
      .order('modelo', { ascending: true });

    query = applyAparelhoTipoFilter(query, { tipo_id, tipo });

    if (busca) {
      const term = `%${busca.trim()}%`;
      query = query.or(`marca.ilike.${term},modelo.ilike.${term}`);
    }

    const comCores = searchParams.get('com_cores') !== 'false';

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const aparelhos = data || [];
    if (!comCores || !aparelhos.length) {
      return NextResponse.json({ aparelhos });
    }

    const ids = aparelhos.map((a) => a.id);
    const coresMap = await fetchCoresPorAparelhosCatalogo(admin, ids);
    const comCoresList = aparelhos.map((a) => ({
      ...a,
      cores: coresMap.get(a.id) || [],
    }));
    return NextResponse.json({ aparelhos: comCoresList });
  } catch (error) {
    console.error('Erro ao buscar catálogo de aparelhos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
