import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUserId } from '@/lib/api/routeAuthEmpresa';

/** Lista cores do catálogo global (autenticado) */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('cores_catalogo')
      .select('id, nome, hex, ordem')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('nome', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cores: data || [] });
  } catch (error) {
    console.error('Erro ao buscar cores:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
