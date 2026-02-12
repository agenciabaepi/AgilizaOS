import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cancela a assinatura da empresa (status = cancelled).
 * POST /api/admin-saas/empresas/[id]/cancelar-assinatura
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const supabase = getSupabaseAdmin();

    const { data: assinatura, error: findError } = await supabase
      .from('assinaturas')
      .select('id, status')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !assinatura) {
      return NextResponse.json(
        { ok: false, message: 'Nenhuma assinatura encontrada para esta empresa.' },
        { status: 404 }
      );
    }

    if (assinatura.status === 'cancelled') {
      return NextResponse.json(
        { ok: true, message: 'Assinatura já estava cancelada.' },
        { status: 200 }
      );
    }

    const { error: updateError } = await supabase
      .from('assinaturas')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assinatura.id);

    if (updateError) {
      console.error('[cancelar-assinatura] Erro:', updateError);
      return NextResponse.json(
        { ok: false, message: updateError.message || 'Falha ao cancelar assinatura' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Assinatura cancelada. O usuário deixará de ter acesso ao sistema ao vencer o período atual.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao cancelar assinatura';
    console.error('[cancelar-assinatura]:', err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
