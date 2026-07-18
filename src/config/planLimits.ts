import { PLANO_SLUGS, type PlanoSlug } from '@/config/planModules';

export type PlanLimits = {
  limite_usuarios: number;
  /** Produtos + serviços (mesma tabela `produtos`). */
  limite_produtos: number;
  limite_servicos: number;
  /** OS criadas no mês civil corrente. */
  limite_ordens_mes: number;
  limite_clientes: number;
  limite_fornecedores: number;
};

/** Limites do Plano Básico (enforcement). */
export const LIMITES_BASICO: PlanLimits = {
  limite_usuarios: 3,
  limite_produtos: 50,
  limite_servicos: 50,
  limite_ordens_mes: 50,
  limite_clientes: 500,
  limite_fornecedores: 50,
};

/** Trial: limites generosos para conversão (sem o teto restritivo do Básico). */
export const LIMITES_TRIAL: PlanLimits = {
  limite_usuarios: 10,
  limite_produtos: 200,
  limite_servicos: 200,
  limite_ordens_mes: 200,
  limite_clientes: 1000,
  limite_fornecedores: 100,
};

/** Plano Completo: tetos altos (praticamente sem restrição operacional). */
export const LIMITES_COMPLETO: PlanLimits = {
  limite_usuarios: 50,
  limite_produtos: 5000,
  limite_servicos: 5000,
  limite_ordens_mes: 5000,
  limite_clientes: 20000,
  limite_fornecedores: 500,
};

const BY_SLUG: Record<string, PlanLimits> = {
  [PLANO_SLUGS.BASICO]: LIMITES_BASICO,
  [PLANO_SLUGS.COMPLETO]: LIMITES_COMPLETO,
  [PLANO_SLUGS.TRIAL]: LIMITES_TRIAL,
};

/** Resolve limites pelo slug do plano; fallback Básico (mais restritivo). */
export function getPlanLimits(slug: string | null | undefined): PlanLimits {
  const key = (slug || '').trim().toLowerCase();
  if (key && BY_SLUG[key]) return BY_SLUG[key];
  return LIMITES_BASICO;
}

export function isPlanoBasico(slug: string | null | undefined): boolean {
  return (slug || '').trim().toLowerCase() === PLANO_SLUGS.BASICO;
}

export type PlanoSlugLimites = PlanoSlug;
