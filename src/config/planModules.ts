/** Slugs estáveis dos planos no banco (`planos.slug`). */
export const PLANO_SLUGS = {
  TRIAL: 'trial',
  BASICO: 'basico',
  COMPLETO: 'completo',
} as const;

export type PlanoSlug = (typeof PLANO_SLUGS)[keyof typeof PLANO_SLUGS];

/** Planos vendáveis (checkout). */
export const PLANOS_VENDA: PlanoSlug[] = [PLANO_SLUGS.BASICO, PLANO_SLUGS.COMPLETO];

/**
 * Módulos exclusivos do Plano Completo (e liberados no trial).
 * Financeiro básico (vendas, caixa) permanece no Básico;
 * lucro/desempenho e comissões agregadas exigem Completo.
 *
 * Módulos com `defaultEnabled: true` ficam liberados em todos os planos
 * e só podem ser desligados via override em Gerenciar Recursos (admin-saas).
 */
export const PREMIUM_MODULES = {
  nota_fiscal: {
    label: 'Nota Fiscal',
    description: 'Emissão de NFC-e e NF-e integrada ao PDV',
    status: 'planned' as const,
  },
  ia: {
    label: 'Inteligência Artificial',
    description: 'Correção de laudos e consulta de aparelhos com IA',
    status: 'active' as const,
  },
  whatsapp_crm: {
    label: 'CRM WhatsApp',
    description: 'Inbox, automações e atendimento via WhatsApp — pausado por enquanto',
    status: 'development' as const,
    showOnPlanCard: false as const,
  },
  lucro_desempenho: {
    label: 'Lucro e desempenho',
    description: 'Relatórios de lucratividade, desempenho e comissões dos técnicos',
    status: 'active' as const,
  },
  contas_a_pagar: {
    label: 'Contas a Pagar',
    description: 'Gestão de despesas, contas fixas e pagamentos',
    status: 'active' as const,
    showOnPlanCard: false as const,
    defaultEnabled: true as const,
  },
  contas_a_receber: {
    label: 'Contas a Receber',
    description: 'Gestão de receitas e valores a receber',
    status: 'active' as const,
    showOnPlanCard: false as const,
    defaultEnabled: true as const,
  },
} as const;

export type PremiumModule = keyof typeof PREMIUM_MODULES;
export type PremiumModuleStatus = 'active' | 'planned' | 'development' | 'beta';

/** Badge exibido ao lado do módulo (planos, admin, checkout). */
export function premiumModuleStatusBadge(
  status: PremiumModuleStatus | (typeof PREMIUM_MODULES)[PremiumModule]['status']
): string | null {
  if (status === 'planned') return 'Em breve';
  if (status === 'development') return 'Em desenvolvimento';
  if (status === 'beta') return 'Beta';
  return null;
}

/** Label com sufixo de status para textos corridos. */
export function premiumModuleLabelWithStatus(mod: (typeof PREMIUM_MODULES)[PremiumModule]): string {
  const badge = premiumModuleStatusBadge(mod.status);
  return badge ? `${mod.label} (${badge.toLowerCase()})` : mod.label;
}

type PremiumModuleEntry = (typeof PREMIUM_MODULES)[PremiumModule];

export function isListedOnPlanCard(key: PremiumModule): boolean {
  const mod = PREMIUM_MODULES[key];
  return !('showOnPlanCard' in mod) || mod.showOnPlanCard !== false;
}

/** Módulos listados nos cards de plano (landing, assinatura e checkout). */
export function premiumModulesForPlanCard(): PremiumModuleEntry[] {
  return (Object.keys(PREMIUM_MODULES) as PremiumModule[])
    .filter(isListedOnPlanCard)
    .map((key) => PREMIUM_MODULES[key]);
}

/** Aliases legados → módulo canônico. */
export const LEGACY_MODULE_ALIASES: Record<string, PremiumModule> = {
  chatgpt: 'ia',
  whatsapp: 'whatsapp_crm',
  'lucro-desempenho': 'lucro_desempenho',
};

export function isModuleDefaultEnabled(key: PremiumModule): boolean {
  const mod = PREMIUM_MODULES[key];
  return 'defaultEnabled' in mod && mod.defaultEnabled === true;
}

/** Estado do formulário admin: módulos defaultEnabled entram explícitos (true) se ausentes. */
export function normalizeRecursosFormState(
  raw: Partial<Record<string, boolean>> | null | undefined
): Partial<Record<PremiumModule, boolean>> {
  const next: Partial<Record<PremiumModule, boolean>> = {};
  const src = raw && typeof raw === 'object' ? raw : {};
  for (const key of Object.keys(PREMIUM_MODULES) as PremiumModule[]) {
    if (key in src && typeof src[key] === 'boolean') {
      next[key] = src[key] as boolean;
    } else if (isModuleDefaultEnabled(key)) {
      next[key] = true;
    }
  }
  // Preserva overrides de módulos premium já salvos
  for (const [key, value] of Object.entries(src)) {
    if (typeof value !== 'boolean') continue;
    if (key in PREMIUM_MODULES && !(key in next)) {
      next[key as PremiumModule] = value;
    }
  }
  return next;
}

/** Payload de save: inclui defaultEnabled sempre; demais só se true (liberar) ou false explícito. */
export function buildRecursosSavePayload(
  valores: Partial<Record<PremiumModule, boolean>>
): Partial<Record<PremiumModule, boolean>> {
  const out: Partial<Record<PremiumModule, boolean>> = {};
  for (const key of Object.keys(PREMIUM_MODULES) as PremiumModule[]) {
    if (isModuleDefaultEnabled(key)) {
      out[key] = valores[key] !== false;
    } else if (valores[key] === true) {
      out[key] = true;
    } else if (valores[key] === false) {
      out[key] = false;
    }
  }
  return out;
}

export const RECURSOS_BASICO: Record<PremiumModule, boolean> = {
  nota_fiscal: false,
  ia: false,
  whatsapp_crm: false,
  lucro_desempenho: false,
  contas_a_pagar: true,
  contas_a_receber: true,
};

export const RECURSOS_COMPLETO: Record<PremiumModule, boolean> = {
  nota_fiscal: true,
  ia: true,
  whatsapp_crm: true,
  lucro_desempenho: true,
  contas_a_pagar: true,
  contas_a_receber: true,
};

/** Trial exibe todos os módulos premium para conversão. */
export const RECURSOS_TRIAL: Record<PremiumModule, boolean> = {
  ...RECURSOS_COMPLETO,
};

export const PLANO_COMPLETO_NOME = 'Completo';
