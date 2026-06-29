import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  clearImpersonationCookie,
  clearSupabaseSession,
  readImpersonationPayload,
} from '@/lib/admin-impersonation';

/**
 * POST /api/admin-saas/impersonate/exit
 * Encerra impersonation e volta ao painel admin.
 */
export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const payload = readImpersonationPayload(cookieStore);

    if (!payload) {
      return NextResponse.json({ ok: false, error: 'Nenhuma impersonation ativa' }, { status: 400 });
    }

    await clearSupabaseSession();
    clearImpersonationCookie(cookieStore);

    if (payload.logId && payload.logId !== 'unknown') {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('admin_impersonation_logs')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', payload.logId)
        .is('ended_at', null);
    }

    return NextResponse.json({
      ok: true,
      redirect: payload.returnUrl || '/admin-saas',
    });
  } catch (e) {
    console.error('POST /api/admin-saas/impersonate/exit:', e);
    return NextResponse.json({ ok: false, error: 'Erro ao encerrar impersonation' }, { status: 500 });
  }
}
