import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

/**
 * GET /api/admin-saas/config/valor-assinatura
 * Retorna o valor atual da assinatura (admin)
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('config_sistema')
      .select('valor')
      .eq('chave', 'valor_assinatura_mensal')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const valor = data?.valor != null ? parseFloat(String(data.valor)) : 119.9;
    const valorFinal = Number.isFinite(valor) && valor > 0 ? valor : 119.9;

    return NextResponse.json({ ok: true, valor: valorFinal });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin-saas/config/valor-assinatura
 * Atualiza o valor da assinatura (admin)
 * Body: { valor: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const valor = typeof body.valor === 'number' ? body.valor : parseFloat(String(body.valor || ''));

    if (!Number.isFinite(valor) || valor <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Valor inválido. Informe um número positivo (ex: 119.90)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('config_sistema')
      .upsert(
        {
          chave: 'valor_assinatura_mensal',
          valor: String(valor),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chave' }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, valor });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}
