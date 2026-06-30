import type { SupabaseClient } from '@supabase/supabase-js';
import { PLANO_SLUGS } from '@/config/planModules';
import { normalizarCodigoCupom, parseCupomRpcResult } from '@/lib/billing/cupomDesconto';

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
