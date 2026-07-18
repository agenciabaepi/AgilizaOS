import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlanLimits } from '@/config/planLimits';
import { BILLING_TIME_ZONE } from '@/lib/billing/billingTimeZone';
import { getEmpresaPlanContext } from '@/lib/billing/getEmpresaPlanContext';

export type LimiteTipo = 'usuarios' | 'produtos' | 'servicos' | 'ordens' | 'clientes' | 'fornecedores';

function inicioMesIso(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  // Meia-noite no fuso de billing ≈ usar data local + Z offset aproximado via Date
  return `${y}-${m}-01T00:00:00.000Z`;
}

/**
 * Conta uso atual da empresa para um tipo de limite.
 * Ordens: apenas as criadas no mês civil corrente.
 */
export async function contarUsoLimite(
  admin: SupabaseClient,
  empresaId: string,
  tipo: LimiteTipo
): Promise<number> {
  if (tipo === 'usuarios') {
    const { count } = await admin
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);
    return count ?? 0;
  }

  if (tipo === 'produtos' || tipo === 'servicos') {
    // Produtos e serviços compartilham a tabela `produtos` (campo tipo).
    // Limite do plano Básico: 50 itens no catálogo total.
    const { count } = await admin
      .from('produtos')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);
    return count ?? 0;
  }

  if (tipo === 'ordens') {
    const inicioMes = inicioMesIso(BILLING_TIME_ZONE);
    const { count } = await admin
      .from('ordens_servico')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .gte('created_at', inicioMes);
    return count ?? 0;
  }

  if (tipo === 'clientes') {
    const { count } = await admin
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);
    return count ?? 0;
  }

  if (tipo === 'fornecedores') {
    const { count } = await admin
      .from('fornecedores')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);
    return count ?? 0;
  }

  return 0;
}

export async function assertDentroDoLimitePlano(
  admin: SupabaseClient,
  empresaId: string,
  tipo: LimiteTipo
): Promise<{ ok: true } | { ok: false; error: string; atual: number; limite: number }> {
  const ctx = await getEmpresaPlanContext(admin, empresaId);
  const slug = ctx?.planoSlug ?? null;
  const limits = getPlanLimits(slug);

  const limite =
    tipo === 'usuarios'
      ? limits.limite_usuarios
      : tipo === 'produtos' || tipo === 'servicos'
        ? limits.limite_produtos
        : tipo === 'ordens'
          ? limits.limite_ordens_mes
          : tipo === 'clientes'
            ? limits.limite_clientes
            : limits.limite_fornecedores;

  const atual = await contarUsoLimite(admin, empresaId, tipo);

  if (atual >= limite) {
    const label =
      tipo === 'ordens'
        ? 'ordens de serviço neste mês'
        : tipo === 'produtos' || tipo === 'servicos'
          ? 'produtos/serviços'
          : tipo;
    return {
      ok: false,
      atual,
      limite,
      error: `Limite do plano atingido (${atual}/${limite} ${label}). Faça upgrade para o Plano Completo.`,
    };
  }

  return { ok: true };
}
