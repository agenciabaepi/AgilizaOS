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
 * Módulos premium — exclusivos do Plano Completo.
 * O restante do sistema (OS, financeiro, estoque, etc.) é core e sempre liberado.
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
    description: 'Inbox, automações e atendimento via WhatsApp',
    status: 'beta' as const,
  },
} as const;

export type PremiumModule = keyof typeof PREMIUM_MODULES;

/** Aliases legados → módulo canônico. */
export const LEGACY_MODULE_ALIASES: Record<string, PremiumModule> = {
  chatgpt: 'ia',
  whatsapp: 'whatsapp_crm',
};

export const RECURSOS_BASICO: Record<PremiumModule, boolean> = {
  nota_fiscal: false,
  ia: false,
  whatsapp_crm: false,
};

export const RECURSOS_COMPLETO: Record<PremiumModule, boolean> = {
  nota_fiscal: true,
  ia: true,
  whatsapp_crm: true,
};

/** Trial exibe todos os módulos premium para conversão. */
export const RECURSOS_TRIAL: Record<PremiumModule, boolean> = {
  ...RECURSOS_COMPLETO,
};

export const PLANO_COMPLETO_NOME = 'Completo';
