import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { PLANOS_VENDA, type PlanoSlug } from '@/config/planModules';

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
 * Altera o plano de uma empresa (Básico ou Completo).
 * POST /api/admin-saas/empresas/[id]/alterar-plano
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
    const body = await req.json();
    const { plano_id, plano_slug, observacoes, valor_mensal, limpar_recursos_customizados } = body;

    if (!plano_id && !plano_slug) {
      return NextResponse.json(
        { ok: false, message: 'plano_id ou plano_slug é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let planoQuery = supabase
      .from('planos')
      .select('id, nome, preco, slug, recursos_disponiveis')
      .eq('ativo', true);

    if (plano_id) {
      planoQuery = planoQuery.eq('id', plano_id);
    } else {
      planoQuery = planoQuery.eq('slug', String(plano_slug).trim().toLowerCase());
    }

    const { data: plano, error: planoError } = await planoQuery.single();

    if (planoError || !plano) {
      return NextResponse.json(
        { ok: false, message: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    const slug = (plano.slug || '').toLowerCase() as PlanoSlug;
    if (!PLANOS_VENDA.includes(slug)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Apenas os planos Básico e Completo podem ser atribuídos. Plano "${plano.nome}" não é vendável.`,
        },
        { status: 400 }
      );
    }

    let valorCobranca = Number(plano.preco);
    const manual = parseValorMonetarioInput(valor_mensal);
    if (manual != null) {
      valorCobranca = manual;
    }

    const obsExtra =
      valorCobranca !== Number(plano.preco)
        ? ` Valor mensal manual: R$ ${valorCobranca.toFixed(2)} (preço do plano: R$ ${Number(plano.preco).toFixed(2)}).`
        : '';

    const { data: assinaturaAtual, error: assinaturaError } = await supabase
      .from('assinaturas')
      .select('id, status, data_fim')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assinaturaError) {
      return NextResponse.json(
        { ok: false, error: assinaturaError.message },
        { status: 500 }
      );
    }

    const agora = new Date();
    const dataFim = new Date(agora);
    dataFim.setMonth(dataFim.getMonth() + 1);

    const assinaturaPayload = {
      plano_id: plano.id,
      valor: valorCobranca,
      status: 'active' as const,
      data_fim: dataFim.toISOString(),
      data_trial_fim: null,
      proxima_cobranca: dataFim.toISOString(),
      observacoes:
        (observacoes || `Plano alterado para ${plano.nome} pelo admin`) + obsExtra,
      updated_at: agora.toISOString(),
    };

    if (assinaturaAtual) {
      const { error: updateError } = await supabase
        .from('assinaturas')
        .update(assinaturaPayload)
        .eq('id', assinaturaAtual.id);

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: createError } = await supabase.from('assinaturas').insert({
        empresa_id: empresaId,
        ...assinaturaPayload,
        data_inicio: agora.toISOString(),
        observacoes: (observacoes || `Assinatura criada para ${plano.nome} pelo admin`) + obsExtra,
      });

      if (createError) {
        return NextResponse.json(
          { ok: false, error: createError.message },
          { status: 500 }
        );
      }
    }

    const empresaUpdate: Record<string, unknown> = {
      plano: slug || plano.nome.toLowerCase(),
    };

    if (limpar_recursos_customizados !== false) {
      empresaUpdate.recursos_customizados = null;
    }

    await supabase.from('empresas').update(empresaUpdate).eq('id', empresaId);

    return NextResponse.json({
      ok: true,
      message: `Plano alterado para ${plano.nome} com sucesso`,
      plano: { id: plano.id, slug, nome: plano.nome },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
