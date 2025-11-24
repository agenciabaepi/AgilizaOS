// Configuração de recursos/módulos necessários para cada página do sistema
// Isso permite controlar o acesso baseado no plano da empresa

export const PAGE_RESOURCES = {
  // Financeiro - Módulo completo
  '/financeiro': 'financeiro',
  '/financeiro/vendas': 'financeiro',
  '/financeiro/movimentacoes-caixa': 'financeiro',
  '/financeiro/contas-a-pagar': 'financeiro',
  '/financeiro/contas-a-pagar/categorias': 'financeiro',
  '/financeiro/lucro-desempenho': 'financeiro',
  '/financeiro/comissoes-tecnicos': 'financeiro',
  
  // Sub-recursos do financeiro
  '/vendas': 'vendas',
  '/movimentacao-caixa': 'movimentacao_caixa',
  
  // WhatsApp
  '/configuracoes/whatsapp': 'whatsapp',
  
  // ChatGPT (quando implementado)
  // '/configuracoes/chatgpt': 'chatgpt',
  
  // Editor de foto (quando implementado)
  // '/editor-foto': 'editor_foto',
} as const;

/**
 * Obtém o recurso necessário para acessar uma rota específica
 * @param pathname - Caminho da rota (ex: '/financeiro/vendas')
 * @returns Nome do recurso necessário ou null se não requer recurso específico
 */
export function getRequiredResource(pathname: string): string | null {
  // Remove query parameters
  const cleanPath = pathname.split('?')[0];
  
  // Procura por correspondência exata primeiro
  if (PAGE_RESOURCES[cleanPath as keyof typeof PAGE_RESOURCES]) {
    return PAGE_RESOURCES[cleanPath as keyof typeof PAGE_RESOURCES];
  }
  
  // Procura por correspondência com parâmetros dinâmicos
  for (const [route, resource] of Object.entries(PAGE_RESOURCES)) {
    if (route.includes('[') && route.includes(']')) {
      // Converte rota com parâmetros em regex
      const routeRegex = route
        .replace(/\[.*?\]/g, '[^/]+') // [id] -> [^/]+
        .replace(/\//g, '\\/'); // / -> \/
      
      if (new RegExp(`^${routeRegex}$`).test(cleanPath)) {
        return resource;
      }
    }
  }
  
  // Se não encontrar, retorna null (sem recurso específico necessário)
  return null;
}

/**
 * Verifica se uma rota precisa de verificação de recurso
 */
export function needsResourceCheck(pathname: string): boolean {
  return getRequiredResource(pathname) !== null;
}

