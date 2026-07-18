import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANO_SLUGS } from '@/config/planModules';
import { normalizarCodigoCupom, parseCupomRpcResult } from '@/lib/billing/cupomDesconto';
import { pickAssinaturaParaContexto } from '@/lib/billing/pickAssinatura';

export async function obterPrecoPlano(
  admin: SupabaseClient,
  planoSlug: string | null | undefined
): Promise<number | null> {
  if (planoSlug !== PLANO_SLUGS.BASICO && planoSlug !== PLANO_SLUGS.COMPLETO) {
    return null;
  }
  const { data } = await admin
    .from('planos')
    .select('preco')
    .eq('slug', planoSlug)
    .eq('ativo', true)
    .maybeSingle();
  const preco = data?.preco != null ? Number(data.preco) : NaN;
  return Number.isFinite(preco) && preco > 0 ? preco : null;
}

export type PrecoCobrancaEmpresa = {
  preco: number;
  precoCatalogo: number;
  personalizado: boolean;
};

/**
 * Preço que a empresa deve pagar pelo plano:
 * se a assinatura vigente for desse plano e tiver `valor` > 0, usa esse valor
 * (preço personalizado no admin); senão, preço do catálogo.
 */
export async function obterPrecoCobrancaEmpresa(
  admin: SupabaseClient,
  empresaId: string,
  planoSlug: string
): Promise<PrecoCobrancaEmpresa | null> {
  const precoCatalogo = await obterPrecoPlano(admin, planoSlug);
  if (precoCatalogo == null) return null;

  const [{ data: empresa }, { data: rows }] = await Promise.all([
    admin.from('empresas').select('created_at, dias_trial').eq('id', empresaId).maybeSingle(),
    admin
      .from('assinaturas')
      .select(
        'id, valor, status, plano_id, created_at, data_fim, proxima_cobranca, data_trial_fim'
      )
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const picked = pickAssinaturaParaContexto(
    (rows || []) as Record<string, unknown>[],
    empresa?.created_at as string | null | undefined,
    typeof empresa?.dias_trial === 'number' ? empresa.dias_trial : null
  );

  if (!picked?.plano_id) {
    return { preco: precoCatalogo, precoCatalogo, personalizado: false };
  }

  const { data: planoRow } = await admin
    .from('planos')
    .select('slug')
    .eq('id', picked.plano_id as string)
    .maybeSingle();

  const slugAssinatura = String(planoRow?.slug || '').toLowerCase();
  if (slugAssinatura !== planoSlug) {
    return { preco: precoCatalogo, precoCatalogo, personalizado: false };
  }

  const valorAssinatura = Number(picked.valor);
  if (!Number.isFinite(valorAssinatura) || valorAssinatura <= 0) {
    return { preco: precoCatalogo, precoCatalogo, personalizado: false };
  }

  return {
    preco: valorAssinatura,
    precoCatalogo,
    personalizado: Math.abs(valorAssinatura - precoCatalogo) > 0.009,
  };
}

export async function validarCupomDesconto(
  admin: SupabaseClient,
  codigo: string,
  valorOriginal: number
) {
  const { data, error } = await admin.rpc('validar_cupom_desconto', {
    p_codigo: normalizarCodigoCupom(codigo),
    p_valor_original: valorOriginal,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return parseCupomRpcResult(data);
}

export async function reservarCupomDesconto(
  admin: SupabaseClient,
  codigo: string,
  empresaId: string,
  valorOriginal: number
) {
  const { data, error } = await admin.rpc('reservar_cupom_desconto', {
    p_codigo: normalizarCodigoCupom(codigo),
    p_empresa_id: empresaId,
    p_valor_original: valorOriginal,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return parseCupomRpcResult(data);
}

export async function cancelarReservaCupom(admin: SupabaseClient, cupomUsoId: string) {
  await admin.rpc('cancelar_reserva_cupom', { p_cupom_uso_id: cupomUsoId });
}

export async function confirmarCupomUso(
  admin: SupabaseClient,
  cupomUsoId: string,
  pagamentoId?: string | null
) {
  const { data, error } = await admin.rpc('confirmar_cupom_uso', {
    p_cupom_uso_id: cupomUsoId,
    p_pagamento_id: pagamentoId ?? null,
  });
  if (error) {
    console.warn('confirmar_cupom_uso:', error.message);
    return false;
  }
  return data === true;
}
