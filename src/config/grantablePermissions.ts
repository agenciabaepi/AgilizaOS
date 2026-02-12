/**
 * Lista única de permissões que o admin pode conceder aos usuários.
 * Alinhada a pagePermissions.ts e ao middleware (canTecnicoAccessPath).
 * Cada "key" deve corresponder ao valor usado em PAGE_PERMISSIONS e no menu (podeVer).
 */

export type PermissaoItem = { key: string; label: string; description: string };

/** Módulos principais (independentes) */
export const PERMISSOES_PRINCIPAIS: PermissaoItem[] = [
  { key: 'dashboard', label: 'Dashboard e perfil', description: 'Visão geral e acesso ao perfil' },
  { key: 'lembretes', label: 'Lembretes', description: 'Lembretes e notificações' },
  { key: 'ordens', label: 'Ordens de Serviço', description: 'Criar, editar e listar OS' },
  { key: 'bancada', label: 'Bancada', description: 'Controle de bancada técnica' },
  { key: 'caixa', label: 'Caixa e Fluxo de Caixa', description: 'PDV, caixa e movimentações' },
  { key: 'termos', label: 'Termos de garantia', description: 'Termos e impressão' },
  { key: 'comissoes', label: 'Comissões (técnico)', description: 'Minhas comissões (técnicos)' },
];

/** Módulo Financeiro e sub-permissões (cada uma protege rotas específicas) */
export const PERMISSOES_FINANCEIRO: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: {
    key: 'financeiro',
    label: 'Financeiro',
    description: 'Acesso ao módulo financeiro',
  },
  sub: [
    { key: 'vendas', label: 'Vendas', description: 'Relatório de vendas' },
    { key: 'movimentacao-caixa', label: 'Movimentações de caixa', description: 'Movimentações financeiras' },
    { key: 'contas-a-pagar', label: 'Contas a pagar', description: 'Contas e categorias' },
    { key: 'lucro-desempenho', label: 'Lucro e desempenho / Comissões técnicos', description: 'Lucro e comissões dos técnicos' },
  ],
};

/** Contatos: clientes e fornecedores */
export const PERMISSOES_CONTATOS: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: { key: 'clientes', label: 'Clientes', description: 'Cadastro e listagem de clientes' },
  sub: [
    { key: 'fornecedores', label: 'Fornecedores', description: 'Cadastro de fornecedores' },
  ],
};

/** Produtos/Serviços: equipamentos e catálogo (categorias usa mesma permissão equipamentos) */
export const PERMISSOES_PRODUTOS: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: { key: 'equipamentos', label: 'Produtos e serviços', description: 'Cadastro, categorias e listagem' },
  sub: [
    { key: 'catalogo', label: 'Catálogo', description: 'Catálogo público' },
  ],
};

/** Configurações: acesso geral e subáreas (cada subárea protege uma aba em /configuracoes) */
export const PERMISSOES_CONFIGURACOES: { principal: PermissaoItem; sub: PermissaoItem[] } = {
  principal: { key: 'configuracoes', label: 'Configurações', description: 'Acesso à área de configurações' },
  sub: [
    { key: 'usuarios', label: 'Usuários e permissões', description: 'Aba Usuários em Configurações' },
    { key: 'empresa', label: 'Empresa', description: 'Aba Dados da empresa' },
    { key: 'checklist', label: 'Checklist', description: 'Aba Checklist' },
    { key: 'status', label: 'Status', description: 'Aba Status de OS' },
    { key: 'whatsapp', label: 'WhatsApp', description: 'Aba Integração WhatsApp' },
  ],
};

/** Módulos avançados */
export const PERMISSOES_AVANCADAS: PermissaoItem[] = [
  { key: 'relatorios', label: 'Relatórios', description: 'Relatórios e análises' },
  { key: 'backup', label: 'Backup', description: 'Backup e restauração' },
  { key: 'logs', label: 'Logs do sistema', description: 'Registros de atividades' },
  { key: 'api', label: 'API', description: 'Configurações de API' },
];

/** Lista plana de todas as keys grantables (para defaults e validação) */
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
    ...PERMISSOES_AVANCADAS.map((p) => p.key),
  ];
  return [...new Set(keys)];
}
