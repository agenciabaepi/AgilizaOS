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
 * Financeiro básico (vendas, caixa, contas) permanece no Básico;
 * lucro/desempenho e comissões agregadas exigem Completo.
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
    description: 'Inbox, automações e atendimento via WhatsApp — em desenvolvimento',
    status: 'development' as const,
  },
  lucro_desempenho: {
    label: 'Lucro e desempenho',
    description: 'Relatórios de lucratividade, desempenho e comissões dos técnicos',
    status: 'active' as const,
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

/** Aliases legados → módulo canônico. */
export const LEGACY_MODULE_ALIASES: Record<string, PremiumModule> = {
  chatgpt: 'ia',
  whatsapp: 'whatsapp_crm',
  'lucro-desempenho': 'lucro_desempenho',
};

export const RECURSOS_BASICO: Record<PremiumModule, boolean> = {
  nota_fiscal: false,
  ia: false,
  whatsapp_crm: false,
  lucro_desempenho: false,
};

export const RECURSOS_COMPLETO: Record<PremiumModule, boolean> = {
  nota_fiscal: true,
  ia: true,
  whatsapp_crm: true,
  lucro_desempenho: true,
};

/** Trial exibe todos os módulos premium para conversão. */
export const RECURSOS_TRIAL: Record<PremiumModule, boolean> = {
  ...RECURSOS_COMPLETO,
};

export const PLANO_COMPLETO_NOME = 'Completo';
