// Configuração de permissões para cada página do sistema
export const PAGE_PERMISSIONS = {
  // Dashboard
  '/dashboard': 'dashboard',
  '/dashboard-atendente': 'dashboard',
  
  // Lembretes
  '/lembretes': 'lembretes',
  
  // Ordens de Serviço
  '/ordens': 'ordens',
  '/ordens/[id]': 'ordens',
  '/ordens/[id]/editar': 'ordens',
  '/ordens/[id]/imprimir': 'ordens',
  '/ordens/[id]/imprimir/teste': 'ordens',
  '/nova-os': 'ordens',
  '/os': 'ordens',
  '/os/[id]': 'ordens',
  '/os/[id]/status': 'ordens',
  '/os/[id]/login': 'ordens',
  '/os/buscar': 'ordens',
  
  // Bancada
  '/bancada': 'bancada',
  '/bancada/[id]': 'bancada',
  
  // Caixa
  '/caixa': 'caixa',
  '/caixa/pdv': 'caixa',
  '/caixa/movimentacoes': 'caixa',
  '/fluxo-caixa': 'caixa',
  
  // Clientes
  '/clientes': 'clientes',
  '/clientes/[id]': 'clientes',
  '/clientes/[id]/editar': 'clientes',
  '/clientes/novo': 'clientes',
  
  // Fornecedores
  '/fornecedores': 'fornecedores',
  '/fornecedores/[id]': 'fornecedores',
  '/fornecedores/novo': 'fornecedores',
  
  // Equipamentos
  '/equipamentos': 'equipamentos',
  '/equipamentos/[id]': 'equipamentos',
  '/equipamentos/novo': 'equipamentos',
  '/equipamentos/categorias': 'equipamentos',
  
  // Catálogo
  '/catalogo': 'catalogo',
  '/catalogo/imprimir': 'catalogo',
  
  // Financeiro
  '/financeiro': 'financeiro',
  '/financeiro/vendas': 'vendas',
  '/financeiro/movimentacoes-caixa': 'movimentacao-caixa',
  '/financeiro/contas-a-pagar': 'contas-a-pagar',
  '/financeiro/contas-a-pagar/categorias': 'contas-a-pagar',
  '/financeiro/lucro-desempenho': 'lucro-desempenho',
  
  // Movimentações Caixa
  '/movimentacao-caixa': 'movimentacao-caixa',
  
  // Termos
  '/termos': 'termos',
  '/termos/[id]': 'termos',
  '/termos/novo': 'termos',
  
  // Comissões
  '/comissoes': 'comissoes',
  
  // Sobre a Empresa
  '/sobre': 'dashboard', // Acessível a todos os usuários logados
  
  // Políticas de Privacidade
  '/politicas-privacidade': 'dashboard', // Acessível a todos os usuários logados
  
  // Perfil (todos os usuários logados)
  '/perfil': 'dashboard', // Usuários logados sempre têm dashboard
  
  // Configurações (apenas admin)
  '/configuracoes': 'configuracoes',
  '/configuracoes/usuarios': 'usuarios',
  '/configuracoes/usuarios/[id]': 'usuarios',
  '/configuracoes/usuarios/[id]/editar': 'usuarios',
  '/configuracoes/empresa': 'empresa',
  '/configuracoes/equipamentos': 'equipamentos',
  '/configuracoes/checklist': 'checklist',
  '/configuracoes/checklist-novo': 'checklist',
  '/configuracoes/termos': 'termos',
  '/configuracoes/status': 'status',
  '/configuracoes/catalogo': 'catalogo',
  '/configuracoes/comissoes': 'comissoes',
  '/configuracoes/whatsapp': 'whatsapp',
  '/configuracoes/teste': 'configuracoes',
  
  // Relatórios
  '/relatorios': 'relatorios',
  
  // Usuários
  '/usuarios': 'usuarios',
  
  // Backup
  '/backup': 'backup',
  
  // Logs
  '/logs': 'logs',
  
  // API
  '/api': 'api',
  
  // Páginas públicas (sem proteção)
  '/login': null,
  '/cadastro': null,
  '/cadastro/sucesso': null,
  '/planos': null,
  '/planos/pagar/[plano]': null,
  '/pagamentos/sucesso': null,
  '/pagamentos/pendente': null,
  '/pagamentos/falha': null,
  
  // Páginas de administração SaaS (apenas super admin)
  '/admin-saas': 'admin-saas',
  '/admin-saas/empresas': 'admin-saas',
  '/admin-saas/usuarios': 'admin-saas',
  '/admin-saas/assinaturas': 'admin-saas',
  '/admin-saas/config': 'admin-saas',
  '/admin-saas/pagamentos': 'admin-saas',
  '/admin/criar-assinaturas': 'admin-saas',
  
  // Páginas de debug/desenvolvimento (sem proteção em desenvolvimento)
  '/debug-auth-empresa': null,
  '/test-qr': null,
  '/test-nova-os-n8n': null,
  '/test-n8n': null,
  '/setup-contas-pagar': null,
  '/migrate-contas-pagar': null,
  '/instrucoes-verificacao': null,
  '/generate-curl': null,
  '/fix-historico-inicial': null,
  '/debug-whatsapp-tecnico': null,
  '/debug-tecnico': null,
  '/debug-produtos': null,
  '/debug-os-notification-detailed': null,
  '/debug-os-990': null,
  '/clear-cache': null,
  '/clear-auth': null,
  '/check-whatsapp-status': null,
  '/check-whatsapp-config': null,
} as const;

// Função para obter a permissão necessária para uma rota
export function getRequiredPermission(pathname: string): string | null {
  // Remove query parameters
  const cleanPath = pathname.split('?')[0];
  
  // Procura por correspondência exata primeiro
  if (PAGE_PERMISSIONS[cleanPath as keyof typeof PAGE_PERMISSIONS]) {
    return PAGE_PERMISSIONS[cleanPath as keyof typeof PAGE_PERMISSIONS];
  }
  
  // Procura por correspondência com parâmetros dinâmicos
  for (const [route, permission] of Object.entries(PAGE_PERMISSIONS)) {
    if (route.includes('[') && route.includes(']')) {
      // Converte rota com parâmetros em regex
      const routeRegex = route
        .replace(/\[.*?\]/g, '[^/]+') // [id] -> [^/]+
        .replace(/\//g, '\\/'); // / -> \/
      
      if (new RegExp(`^${routeRegex}$`).test(cleanPath)) {
        return permission;
      }
    }
  }
  
  // Se não encontrar, retorna null (sem proteção)
  return null;
}

// Função para verificar se uma rota precisa de proteção
export function needsProtection(pathname: string): boolean {
  return getRequiredPermission(pathname) !== null;
}
