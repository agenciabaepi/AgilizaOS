import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * GET /api/admin-saas/tecnicos
 * Lista todos os técnicos (usuarios com nivel = tecnico) para envio de notificação push.
 * Retorna id, nome, email, empresa_id, auth_user_id e nome da empresa.
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const { data: tecnicos, error } = await supabase
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        empresa_id,
        auth_user_id,
        empresas ( nome )
      `)
      .eq('nivel', 'tecnico')
      .order('nome', { ascending: true });

    if (error) {
      console.error('[admin-saas/tecnicos] Erro:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (tecnicos || []).map((t: any) => ({
      id: t.id,
      nome: t.nome || 'Sem nome',
      email: t.email || '',
      empresa_id: t.empresa_id,
      auth_user_id: t.auth_user_id,
      empresa_nome: t.empresas?.nome ?? '',
    }));

    return NextResponse.json({ tecnicos: list });
  } catch (e) {
    console.error('[admin-saas/tecnicos] Erro:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro ao listar técnicos' },
      { status: 500 }
    );
  }
}
