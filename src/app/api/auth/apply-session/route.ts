import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { applySupabaseSession, readImpersonationPayload } from '@/lib/admin-impersonation';

/**
 * POST /api/auth/apply-session
 * Grava tokens Supabase nos cookies SSR (middleware).
 * Só aceita durante impersonation admin ativa.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonation = readImpersonationPayload(cookieStore);
    if (!impersonation) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const access_token = typeof body.access_token === 'string' ? body.access_token.trim() : '';
    const refresh_token = typeof body.refresh_token === 'string' ? body.refresh_token.trim() : '';

    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: 'Tokens obrigatórios' }, { status: 400 });
    }

    await applySupabaseSession({ access_token, refresh_token });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/auth/apply-session:', e);
    const message = e instanceof Error ? e.message : 'Erro interno';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
