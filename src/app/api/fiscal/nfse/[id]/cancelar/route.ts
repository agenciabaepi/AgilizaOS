import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { assertFiscalAccess, cancelarNfseNacional } from '@/modules/fiscal';

export const runtime = 'nodejs';
export const preferredRegion = 'gru1';
export const maxDuration = 60;

/** Cancela NFS-e autorizada (evento 101101 na SEFIN Nacional). */
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
    const admin = getSupabaseAdmin();
    const { data: nfse, error } = await admin
      .from('fiscal_nfse')
      .select('chave_acesso')
      .eq('empresa_id', empresaId)
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!nfse) return NextResponse.json({ error: 'NFS-e não encontrada' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const xMotivo = String(body.xMotivo || body.xJust || body.justificativa || '').trim();
    if (xMotivo.length < 15) {
      return NextResponse.json(
        {
          ok: false,
          message: 'A justificativa do cancelamento deve ter no mínimo 15 caracteres.',
        },
        { status: 400 }
      );
    }

    const result = await cancelarNfseNacional(admin, empresaId, nfse.chave_acesso, {
      xMotivo,
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
