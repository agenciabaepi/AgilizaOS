import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { fetchChecklistCatalogoItens } from '@/lib/checklist-server';

/** Lista itens de checklist do catálogo global (somente leitura) */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo_id = searchParams.get('tipo_id');
    const equipamento_categoria = searchParams.get('equipamento_categoria');

    if (!tipo_id && !equipamento_categoria) {
      return NextResponse.json({ error: 'tipo_id ou equipamento_categoria é obrigatório' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const itens = await fetchChecklistCatalogoItens(admin, {
      equipamentoCategoria: equipamento_categoria,
      tipoId: tipo_id,
    });

    return NextResponse.json({ itens });
  } catch (error) {
    console.error('Erro ao buscar checklist catálogo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
