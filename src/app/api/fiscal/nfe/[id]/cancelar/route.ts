import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess } from '@/modules/fiscal';
import { cancelarNfeOuNfce } from '@/modules/fiscal/sefaz/cancelarNfe';

export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const maxDuration = 60;

/** Cancela NF-e autorizada (evento SEFAZ 110111). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const blocked = await assertFiscalAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const empresaId = await getEmpresaIdForUser(userId);
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const result = await cancelarNfeOuNfce(getSupabaseAdmin(), empresaId, {
      tipo: 'nfe',
      id,
      xJust: String(body.xJust || body.justificativa || ''),
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
