import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readImpersonationPayload } from '@/lib/admin-impersonation';

/**
 * GET /api/admin-saas/impersonate/status
 * Retorna dados da impersonation ativa (para o banner no app).
 */
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const payload = readImpersonationPayload(cookieStore);

    if (!payload) {
      return NextResponse.json({ ok: true, active: false });
    }

    return NextResponse.json({
      ok: true,
      active: true,
      targetNome: payload.targetNome,
      targetEmail: payload.targetEmail,
      empresaNome: payload.empresaNome,
      startedAt: payload.startedAt,
      returnUrl: payload.returnUrl,
    });
  } catch (e) {
    console.error('GET /api/admin-saas/impersonate/status:', e);
    return NextResponse.json({ ok: false, active: false }, { status: 500 });
  }
}
