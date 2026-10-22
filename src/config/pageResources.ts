/**
 * Rotas que exigem módulo do plano (Completo / trial) ou flag admin.
 * Financeiro operacional (vendas, caixa) permanece liberado no Básico;
 * contas a pagar/receber vêm ativas por padrão e podem ser desligadas no admin-saas.
 */
export const PAGE_RESOURCES = {
  '/whatsapp': 'whatsapp_crm',
  '/configuracoes/whatsapp': 'whatsapp_crm',
  '/financeiro/lucro-desempenho': 'lucro_desempenho',
  '/financeiro/comissoes-tecnicos': 'lucro_desempenho',
  '/financeiro/contas-a-pagar': 'contas_a_pagar',
  '/financeiro/contas-a-pagar/categorias': 'contas_a_pagar',
  '/financeiro/contas-a-receber': 'contas_a_receber',
  // Futuro: '/nota-fiscal': 'nota_fiscal',
} as const;

/** Permissão de aba em /configuracoes?tab=N → módulo premium */
export const CONFIG_TAB_PREMIUM_MODULES: Record<number, string> = {
  11: 'whatsapp_crm',
};

export function getRequiredResource(pathname: string): string | null {
  const cleanPath = pathname.split('?')[0];

  if (PAGE_RESOURCES[cleanPath as keyof typeof PAGE_RESOURCES]) {
    return PAGE_RESOURCES[cleanPath as keyof typeof PAGE_RESOURCES];
  }

  // Prefixo: /financeiro/comissoes-tecnicos/[id]
  if (cleanPath.startsWith('/financeiro/comissoes-tecnicos')) {
    return 'lucro_desempenho';
  }

  if (cleanPath.startsWith('/financeiro/contas-a-pagar')) {
    return 'contas_a_pagar';
  }

  if (cleanPath.startsWith('/financeiro/contas-a-receber')) {
    return 'contas_a_receber';
  }

  for (const [route, resource] of Object.entries(PAGE_RESOURCES)) {
    if (route.includes('[') && route.includes(']')) {
      const routeRegex = route
        .replace(/\[.*?\]/g, '[^/]+')
        .replace(/\//g, '\\/');
      if (new RegExp(`^${routeRegex}$`).test(cleanPath)) {
        return resource;
      }
    }
  }

  return null;
}

export function needsResourceCheck(pathname: string): boolean {
  return getRequiredResource(pathname) !== null;
}
