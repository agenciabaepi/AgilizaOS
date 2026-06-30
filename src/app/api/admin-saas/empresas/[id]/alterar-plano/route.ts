import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { PLANOS_VENDA, type PlanoSlug } from '@/config/planModules';
import {
  arquivarTrialsParalelos,
  resolveAssinaturaIdParaAlteracao,
} from '@/lib/billing/adminEmpresaAssinatura';

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

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, created_at, dias_trial')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json(
        { ok: false, message: 'Empresa não encontrada' },
        { status: 404 }
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

    const assinaturaId = await resolveAssinaturaIdParaAlteracao(
      supabase,
      empresaId,
      empresa.created_at as string | null,
      empresa.dias_trial as number | null | undefined
    );

    const agora = new Date();
    const dataFim = new Date(agora);
    dataFim.setMonth(dataFim.getMonth() + 1);
    const agoraIso = agora.toISOString();

    const assinaturaPayload = {
      plano_id: plano.id,
      valor: valorCobranca,
      status: 'active' as const,
      data_fim: dataFim.toISOString(),
      data_trial_fim: null,
      proxima_cobranca: dataFim.toISOString(),
      observacoes:
        (observacoes || `Plano alterado para ${plano.nome} pelo admin`) + obsExtra,
      updated_at: agoraIso,
    };

    let assinaturaPrincipalId: string;

    if (assinaturaId) {
      const { error: updateError } = await supabase
        .from('assinaturas')
        .update(assinaturaPayload)
        .eq('id', assinaturaId);

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }
      assinaturaPrincipalId = assinaturaId;
    } else {
      const { data: inserted, error: createError } = await supabase
        .from('assinaturas')
        .insert({
          empresa_id: empresaId,
          ...assinaturaPayload,
          data_inicio: agoraIso,
          observacoes: (observacoes || `Assinatura criada para ${plano.nome} pelo admin`) + obsExtra,
        })
        .select('id')
        .single();

      if (createError || !inserted?.id) {
        return NextResponse.json(
          { ok: false, error: createError?.message || 'Falha ao criar assinatura' },
          { status: 500 }
        );
      }
      assinaturaPrincipalId = inserted.id;
    }

    await arquivarTrialsParalelos(supabase, empresaId, assinaturaPrincipalId, agoraIso);

    const empresaUpdate: Record<string, unknown> = {
      plano: slug || plano.nome.toLowerCase(),
    };

    if (limpar_recursos_customizados !== false) {
      empresaUpdate.recursos_customizados = null;
    }

    const { error: empresaUpdateError } = await supabase
      .from('empresas')
      .update(empresaUpdate)
      .eq('id', empresaId);

    if (empresaUpdateError) {
      return NextResponse.json(
        { ok: false, error: empresaUpdateError.message },
        { status: 500 }
      );
    }

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
