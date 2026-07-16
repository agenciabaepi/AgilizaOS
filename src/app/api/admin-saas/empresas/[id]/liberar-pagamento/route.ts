import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { forcarLiberacaoPorUltimoPagamentoAsaas } from '@/lib/billing/ativarAssinaturaSegura';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin-saas/empresas/[id]/liberar-pagamento
 * Força liberação da assinatura com base no último pagamento confirmado no Asaas.
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
    const admin = getSupabaseAdmin();
    const result = await forcarLiberacaoPorUltimoPagamentoAsaas(admin, empresaId);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          code: result.code,
          coberturaAte: 'coberturaAte' in result ? result.coberturaAte : undefined,
          paymentId: 'paymentId' in result ? result.paymentId : undefined,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      coberturaAte: result.coberturaAte,
      paymentId: result.paymentId,
      message: `Assinatura liberada até ${result.coberturaAte}`,
    });
  } catch (e) {
    console.error('POST liberar-pagamento:', e);
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 });
  }
}
