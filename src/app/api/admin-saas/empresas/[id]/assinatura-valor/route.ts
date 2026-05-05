import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

function parseValorMonetarioInput(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const normalized = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Atualiza apenas o valor mensal da assinatura vigente da empresa (sem trocar plano).
 * POST /api/admin-saas/empresas/[id]/assinatura-valor
 * Body: { valor: number }
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
    const body = await req.json().catch(() => ({}));
    const valor = parseValorMonetarioInput(body.valor);

    if (valor == null) {
      return NextResponse.json(
        { ok: false, message: 'Informe um valor mensal válido maior que zero.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: assinatura, error: findErr } = await supabase
      .from('assinaturas')
      .select('id, observacoes')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !assinatura?.id) {
      return NextResponse.json(
        { ok: false, message: 'Não há assinatura registrada para esta empresa. Use "Alterar assinatura" para criar ou trocar o plano.' },
        { status: 404 }
      );
    }

    const obsAnterior = typeof assinatura.observacoes === 'string' ? assinatura.observacoes.trim() : '';
    const linha = `[admin] Valor mensal ajustado manualmente para R$ ${valor.toFixed(2)} em ${new Date().toISOString()}`;
    const observacoes = obsAnterior ? `${obsAnterior}\n${linha}` : linha;

    const { error: upErr } = await supabase
      .from('assinaturas')
      .update({
        valor,
        observacoes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assinatura.id);

    if (upErr) {
      return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, valor });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Erro inesperado' },
      { status: 500 }
    );
  }
}
