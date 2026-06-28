// Configuração de permissões para cada página do sistema
export const PAGE_PERMISSIONS = {
  // Dashboard
  '/dashboard': 'dashboard',
  '/dashboard-atendente': 'dashboard',
  '/dashboard-tecnico': 'dashboard',

  // Lembretes
  '/lembretes': 'lembretes',

  // Ordens de Serviço e orçamentos
  '/ordens': 'ordens',
  '/ordens/[id]': 'ordens',
  '/ordens/[id]/editar': 'ordens',
  '/ordens/[id]/imprimir': 'ordens',
  '/ordens/[id]/imprimir/cupom': 'ordens',
  '/ordens/[id]/imprimir/2vias': 'ordens',
  '/ordens/[id]/imprimir/teste': 'ordens',
  '/nova-os': 'ordens',
  '/orcamentos': 'ordens',
  '/orcamentos/novo': 'ordens',
  '/orcamentos/[id]': 'ordens',
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
  '/fluxo-caixa': 'movimentacao-caixa',

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
  '/financeiro/comissoes-tecnicos': 'lucro-desempenho',
  '/financeiro/comissoes-tecnicos/[id]': 'lucro-desempenho',

  // Movimentações Caixa
  '/movimentacao-caixa': 'movimentacao-caixa',

  // Termos operacionais
  '/termos': 'termos',
  '/termos/[id]': 'termos',
  '/termos/novo': 'termos',

  // Comissões do técnico
  '/comissoes': 'comissoes',

  // Suporte
  '/suporte': 'suporte',

  // Assinatura e planos
  '/assinatura': 'assinatura',
  '/planos/renovar': 'assinatura',
  '/teste-expirado': 'dashboard',

  // Sobre / políticas
  '/sobre': 'dashboard',
  '/politicas-privacidade': 'dashboard',

  // Perfil
  '/perfil': 'dashboard',

  // Configurações
  '/configuracoes': 'configuracoes',
  '/configuracoes/usuarios': 'usuarios',
  '/configuracoes/usuarios/[id]': 'usuarios',
  '/configuracoes/usuarios/[id]/editar': 'usuarios',
  '/configuracoes/empresa': 'empresa',
  '/configuracoes/equipamentos': 'equipamentos-config',
  '/configuracoes/aparelhos': 'aparelhos',
  '/configuracoes/checklist': 'checklist',
  '/configuracoes/checklist-novo': 'checklist',
  '/configuracoes/termos': 'termos-config',
  '/configuracoes/status': 'status',
  '/configuracoes/catalogo': 'catalogo-config',
  '/configuracoes/comissoes': 'regras-comissoes',
  '/configuracoes/precificacao': 'precificacao',
  '/configuracoes/link-publico': 'link-publico',
  '/configuracoes/avisos': 'avisos',
  '/configuracoes/whatsapp': 'whatsapp',
  '/whatsapp': 'whatsapp',
  '/configuracoes/teste': 'configuracoes',

  // Usuários (legado)
  '/usuarios': 'usuarios',

  // Páginas públicas (sem proteção)
  '/login': null,
  '/fale-conosco': null,
  '/cadastro': null,
  '/cadastro/sucesso': null,
  '/planos': null,
  '/planos/pagar/[plano]': null,
  '/pagamentos/pendente': null,
  '/pagamentos/falha': null,
  '/empresa-desativada': null,

  // Administração SaaS (auth separada)
  '/admin-saas': 'admin-saas',
  '/admin-saas/empresas': 'admin-saas',
  '/admin-saas/usuarios': 'admin-saas',
  '/admin-saas/assinaturas': 'admin-saas',
  '/admin-saas/config': 'admin-saas',
  '/admin-saas/pagamentos': 'admin-saas',
  '/admin-saas/notificacoes': 'admin-saas',
  '/admin-saas/tickets': 'admin-saas',
  '/admin-saas/checklist': 'admin-saas',
  '/admin-saas/aparelhos': 'admin-saas',
  '/admin-saas/cores': 'admin-saas',
  '/admin-saas/tipos-equipamento': 'admin-saas',
  '/admin/criar-assinaturas': 'admin-saas',

  // Debug/desenvolvimento
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

export function getRequiredPermission(pathname: string): string | null {
  const cleanPath = pathname.split('?')[0];

  if (PAGE_PERMISSIONS[cleanPath as keyof typeof PAGE_PERMISSIONS]) {
    return PAGE_PERMISSIONS[cleanPath as keyof typeof PAGE_PERMISSIONS];
  }

  for (const [route, permission] of Object.entries(PAGE_PERMISSIONS)) {
    if (route.includes('[') && route.includes(']')) {
      const routeRegex = route
        .replace(/\[.*?\]/g, '[^/]+')
        .replace(/\//g, '\\/');

      if (new RegExp(`^${routeRegex}$`).test(cleanPath)) {
        return permission;
      }
    }
  }

  return null;
}

export function needsProtection(pathname: string): boolean {
  return getRequiredPermission(pathname) !== null;
}
