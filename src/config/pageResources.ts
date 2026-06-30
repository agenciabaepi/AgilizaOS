/**
 * Rotas que exigem módulo premium do plano.
 * Módulos core (financeiro, OS, estoque, etc.) não são listados aqui.
 */
export const PAGE_RESOURCES = {
  '/whatsapp': 'whatsapp_crm',
  '/configuracoes/whatsapp': 'whatsapp_crm',
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
