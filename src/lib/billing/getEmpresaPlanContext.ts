import type { SupabaseClient } from '@supabase/supabase-js';
import {
  pickAssinaturaParaContexto,
  trialRowCalendarValid,
} from '@/lib/billing/pickAssinatura';
import { PLANO_SLUGS } from '@/config/planModules';
import { dataFimTrialAPartirDe } from '@/config/trial';
import { diffDiasCalendarioInTimeZone } from '@/lib/assinaturaCalendario';
import { BILLING_TIME_ZONE } from '@/lib/billing/billingTimeZone';
import { computeAssinaturaVencidaPorBilling } from '@/lib/billing/empresaSaasBilling';
import { expirarTrialsVencidosEmpresa } from '@/lib/billing/trialBilling';

export interface EmpresaPlanContext {
  empresaId: string;
  planoRecursos: Record<string, unknown>;
  recursosCustomizados: Record<string, boolean> | null;
  isTrial: boolean;
  /** Trial/assinatura ainda com direito de uso (não vencida). */
  assinaturaEmDia: boolean;
  sistemaLiberado: boolean;
  planoSlug: string | null;
  planoNome: string | null;
  planoId: string | null;
}

function trialImplicitoValido(
  empresaCreatedAt: string | null,
  empresaDiasTrial?: number | null
): boolean {
  if (!empresaCreatedAt) return false;
  const end = dataFimTrialAPartirDe(empresaCreatedAt, empresaDiasTrial);
  if (!end) return false;
  const d = diffDiasCalendarioInTimeZone(end, BILLING_TIME_ZONE);
  return d !== null && d >= 0;
}

export async function getEmpresaPlanContext(
  admin: SupabaseClient,
  empresaId: string
): Promise<EmpresaPlanContext | null> {
  const [{ data: empresa }, { data: assinaturas }] = await Promise.all([
    admin
      .from('empresas')
      .select('recursos_customizados, sistema_liberado, created_at, dias_trial')
      .eq('id', empresaId)
      .maybeSingle(),
    admin
      .from('assinaturas')
      .select('*, planos(id, slug, nome, recursos_disponiveis)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  if (!empresa) return null;

  const empresaCreatedAt = (empresa.created_at as string | undefined) ?? null;
  const empresaDiasTrial =
    typeof empresa.dias_trial === 'number' ? empresa.dias_trial : null;
  const sistemaLiberado = empresa.sistema_liberado === true;

  await expirarTrialsVencidosEmpresa(admin, empresaId, empresaCreatedAt, empresaDiasTrial);

  const { data: assinaturasApos } = await admin
    .from('assinaturas')
    .select('*, planos(id, slug, nome, recursos_disponiveis)')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(30);

  const rows = (assinaturasApos?.length ? assinaturasApos : assinaturas) || [];

  const picked = rows.length
    ? pickAssinaturaParaContexto(
        rows as Record<string, unknown>[],
        empresaCreatedAt,
        empresaDiasTrial
      )
    : null;

  const isTrial = picked
    ? trialRowCalendarValid(picked, empresaCreatedAt, empresaDiasTrial, BILLING_TIME_ZONE)
    : trialImplicitoValido(empresaCreatedAt, empresaDiasTrial);

  let planoRecursos: Record<string, unknown> = {};
  let planoSlug: string | null = null;
  let planoNome: string | null = null;
  let planoId: string | null = null;

  if (picked?.plano_id) {
    planoId = picked.plano_id as string;
    const rawPlanos = picked.planos;
    const plano = (Array.isArray(rawPlanos) ? rawPlanos[0] : rawPlanos) as
      | Record<string, unknown>
      | null
      | undefined;
    if (plano) {
      planoSlug = (plano.slug as string) ?? null;
      planoNome = (plano.nome as string) ?? null;
      planoRecursos = (plano.recursos_disponiveis as Record<string, unknown>) ?? {};
    }
  }

  if (!planoSlug && isTrial) {
    planoSlug = PLANO_SLUGS.TRIAL;
  }

  const assinaturaVencida = computeAssinaturaVencidaPorBilling(
    picked
      ? {
          status: String(picked.status),
          data_trial_fim: picked.data_trial_fim as string | null | undefined,
          proxima_cobranca: picked.proxima_cobranca as string | null | undefined,
          data_fim: picked.data_fim as string | null | undefined,
        }
      : null,
    empresaCreatedAt,
    {
      empresaIdPresent: true,
      sistemaLiberado,
      empresaDiasTrial,
      timeZone: BILLING_TIME_ZONE,
    }
  );

  // Espelha a UI: vencida = sem direito a premium (salvo override admin).
  const assinaturaEmDia = !assinaturaVencida;

  return {
    empresaId,
    planoRecursos,
    recursosCustomizados: (empresa.recursos_customizados as Record<string, boolean> | null) ?? null,
    isTrial,
    assinaturaEmDia,
    sistemaLiberado,
    planoSlug,
    planoNome,
    planoId,
  };
}
