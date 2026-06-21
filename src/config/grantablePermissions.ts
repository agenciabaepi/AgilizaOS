/**
 * Catálogo único de permissões concedíveis pelo admin.
 * Alinhado a pagePermissions.ts, middleware e menu lateral.
 */

export type PermissaoItem = {
  key: string;
  label: string;
  description: string;
};

export type PermissionModule = {
  type: 'module';
  principal: PermissaoItem;
  sub: PermissaoItem[];
};

export type PermissionStandalone = {
  type: 'standalone';
  item: PermissaoItem;
};

export type PermissionGroupEntry = PermissionModule | PermissionStandalone;

export type PermissionGroup = {
  id: string;
  label: string;
  description: string;
  color: 'gray' | 'blue' | 'green' | 'purple' | 'amber' | 'teal' | 'rose';
  entries: PermissionGroupEntry[];
};

/** Módulos principais de operação */
export const PERMISSOES_PRINCIPAIS: PermissaoItem[] = [
  { key: 'dashboard', label: 'Dashboard e perfil', description: 'Visão geral, perfil e páginas institucionais' },
  { key: 'lembretes', label: 'Lembretes', description: 'Lembretes e notificações internas' },
  { key: 'ordens', label: 'Ordens e orçamentos', description: 'OS, orçamentos e acompanhamento' },
  { key: 'bancada', label: 'Bancada', description: 'Controle de bancada técnica' },
  { key: 'caixa', label: 'Caixa e PDV', description: 'Caixa, PDV e fluxo de caixa operacional' },
  { key: 'termos', label: 'Termos de garantia', description: 'Termos operacionais e impressão' },
  { key: 'comissoes', label: 'Minhas comissões', description: 'Painel de comissões do técnico' },
  { key: 'suporte', label: 'Suporte e tutoriais', description: 'Central de ajuda e tickets' },
  { key: 'assinatura', label: 'Assinatura e plano', description: 'Gestão da assinatura SaaS da empresa' },
];

/** Financeiro */
export const PERMISSOES_FINANCEIRO: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: {
    key: 'financeiro',
    label: 'Financeiro',
    description: 'Acesso ao hub financeiro',
  },
  sub: [
    { key: 'vendas', label: 'Vendas', description: 'Relatório de vendas' },
    { key: 'movimentacao-caixa', label: 'Movimentações de caixa', description: 'Movimentações financeiras' },
    { key: 'contas-a-pagar', label: 'Contas a pagar', description: 'Contas, categorias e pagamentos' },
    { key: 'lucro-desempenho', label: 'Lucro e comissões', description: 'Lucro, desempenho e comissões de técnicos' },
  ],
};

/** Contatos */
export const PERMISSOES_CONTATOS: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: { key: 'clientes', label: 'Clientes', description: 'Cadastro e listagem de clientes' },
  sub: [{ key: 'fornecedores', label: 'Fornecedores', description: 'Cadastro de fornecedores' }],
};

/** Produtos e serviços */
export const PERMISSOES_PRODUTOS: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: { key: 'equipamentos', label: 'Produtos e serviços', description: 'Cadastro, categorias e listagem' },
  sub: [{ key: 'catalogo', label: 'Catálogo', description: 'Catálogo público de produtos' }],
};

/** Configurações — cada subárea corresponde a uma aba em /configuracoes */
export const PERMISSOES_CONFIGURACOES: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: {
    key: 'configuracoes',
    label: 'Configurações',
    description: 'Acesso à área de configurações do sistema',
  },
  sub: [
    { key: 'usuarios', label: 'Usuários', description: 'Equipe e permissões de acesso' },
    { key: 'empresa', label: 'Empresa', description: 'Dados e identidade da loja' },
    { key: 'regras-comissoes', label: 'Regras de comissão', description: 'Configuração de comissões dos técnicos' },
    { key: 'precificacao', label: 'Precificação', description: 'Calculadora de preços de peças' },
    { key: 'equipamentos-config', label: 'Tipos de equipamento', description: 'Tipos cadastrados na configuração' },
    { key: 'aparelhos', label: 'Aparelhos', description: 'Catálogo de aparelhos (marcas/modelos)' },
    { key: 'checklist', label: 'Checklist', description: 'Itens de entrada na OS' },
    { key: 'termos-config', label: 'Termos (config)', description: 'Modelos de termos de garantia' },
    { key: 'status', label: 'Status de OS', description: 'Fluxo e cores dos status' },
    { key: 'link-publico', label: 'Link público', description: 'Página de acompanhamento da OS' },
    { key: 'catalogo-config', label: 'Catálogo (config)', description: 'Configuração do catálogo' },
    { key: 'avisos', label: 'Avisos internos', description: 'Comunicados para a equipe' },
    { key: 'whatsapp', label: 'WhatsApp', description: 'Integração com WhatsApp' },
  ],
};

/** Módulos avançados — mantidos para compatibilidade com registros antigos */
export const PERMISSOES_AVANCADAS: PermissaoItem[] = [];

/** Grupos visuais para o editor de permissões */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'operacao',
    label: 'Operação',
    description: 'Fluxo diário da assistência técnica',
    color: 'gray',
    entries: PERMISSOES_PRINCIPAIS.filter((p) => p.key !== 'assinatura').map((item) => ({
      type: 'standalone' as const,
      item,
    })),
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Gestão financeira e relatórios',
    color: 'blue',
    entries: [{ type: 'module' as const, principal: PERMISSOES_FINANCEIRO.principal, sub: PERMISSOES_FINANCEIRO.sub }],
  },
  {
    id: 'contatos',
    label: 'Contatos',
    description: 'Clientes e fornecedores',
    color: 'green',
    entries: [{ type: 'module' as const, principal: PERMISSOES_CONTATOS.principal, sub: PERMISSOES_CONTATOS.sub }],
  },
  {
    id: 'produtos',
    label: 'Produtos',
    description: 'Produtos, serviços e catálogo',
    color: 'purple',
    entries: [{ type: 'module' as const, principal: PERMISSOES_PRODUTOS.principal, sub: PERMISSOES_PRODUTOS.sub }],
  },
  {
    id: 'conta',
    label: 'Conta',
    description: 'Assinatura e suporte',
    color: 'teal',
    entries: [
      { type: 'standalone' as const, item: PERMISSOES_PRINCIPAIS.find((p) => p.key === 'suporte')! },
      { type: 'standalone' as const, item: PERMISSOES_PRINCIPAIS.find((p) => p.key === 'assinatura')! },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    description: 'Administração e personalização do sistema',
    color: 'amber',
    entries: [
      { type: 'module' as const, principal: PERMISSOES_CONFIGURACOES.principal, sub: PERMISSOES_CONFIGURACOES.sub },
    ],
  },
];

/** Chaves legadas mantidas para compatibilidade com registros existentes */
export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'regras-comissoes': ['comissoes'],
  'equipamentos-config': ['equipamentos'],
  'termos-config': ['termos'],
  'catalogo-config': ['catalogo'],
};

export function expandPermissionKey(key: string): string[] {
  return [key, ...(LEGACY_PERMISSION_ALIASES[key] ?? [])];
}

export function hasGrantableKey(permissoes: string[], key: string): boolean {
  return expandPermissionKey(key).some((k) => permissoes.includes(k));
}

/** Lista plana de todas as keys grantables */
export function getAllGrantableKeys(): string[] {
  const keys: string[] = [
    ...PERMISSOES_PRINCIPAIS.map((p) => p.key),
    PERMISSOES_FINANCEIRO.principal.key,
    ...PERMISSOES_FINANCEIRO.sub.map((p) => p.key),
    PERMISSOES_CONTATOS.principal.key,
    ...PERMISSOES_CONTATOS.sub.map((p) => p.key),
    PERMISSOES_PRODUTOS.principal.key,
    ...PERMISSOES_PRODUTOS.sub.map((p) => p.key),
    PERMISSOES_CONFIGURACOES.principal.key,
    ...PERMISSOES_CONFIGURACOES.sub.map((p) => p.key),
  ];
  return [...new Set(keys)];
}

/** Resolve permissão exigida pela rota, considerando aliases legados */
export function matchesPermission(permissoes: string[], requiredKey: string): boolean {
  if (permissoes.includes(requiredKey)) return true;
  for (const [canonical, aliases] of Object.entries(LEGACY_PERMISSION_ALIASES)) {
    if (canonical === requiredKey) {
      return aliases.some((alias) => permissoes.includes(alias));
    }
  }
  return false;
}
