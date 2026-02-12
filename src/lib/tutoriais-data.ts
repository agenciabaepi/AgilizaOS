/**
 * Módulos e vídeos de tutorial do sistema - área de membros / curso
 * Substitua as URLs vazias pelos links do YouTube/Vimeo quando tiver os vídeos.
 * YouTube: use o ID do vídeo (ex: dQw4w9WgXcQ) ou URL completa.
 */

export type VideoTutorial = {
  id: string;
  titulo: string;
  /** URL do YouTube (watch ou embed), Vimeo, ou qualquer URL de vídeo */
  url: string;
  duracao?: string;
};

export type ModuloTutorial = {
  id: string;
  titulo: string;
  descricao?: string;
  ordem: number;
  videos: VideoTutorial[];
};

export const MODULOS_TUTORIAL: ModuloTutorial[] = [
  {
    id: 'intro',
    titulo: 'Introdução ao Sistema',
    descricao: 'Conheça o painel e os primeiros passos',
    ordem: 1,
    videos: [
      { id: 'intro-1', titulo: 'Boas-vindas e visão geral do sistema', url: '', duracao: '' },
      { id: 'intro-2', titulo: 'Navegação no menu e acessos rápidos', url: '', duracao: '' },
    ],
  },
  {
    id: 'os',
    titulo: 'Ordens de Serviço (O.S.)',
    descricao: 'Criar, editar e acompanhar ordens de serviço',
    ordem: 2,
    videos: [
      { id: 'os-1', titulo: 'Como criar uma nova O.S.', url: '', duracao: '' },
      { id: 'os-2', titulo: 'Preenchendo dados do cliente e equipamento', url: '', duracao: '' },
      { id: 'os-3', titulo: 'Editando e atualizando status da O.S.', url: '', duracao: '' },
      { id: 'os-4', titulo: 'Imprimindo O.S. e cupom', url: '', duracao: '' },
      { id: 'os-5', titulo: 'Bancada do técnico e conclusão', url: '', duracao: '' },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Cadastro de Clientes',
    descricao: 'Clientes, contatos e histórico',
    ordem: 3,
    videos: [
      { id: 'clientes-1', titulo: 'Cadastrando um novo cliente', url: '', duracao: '' },
      { id: 'clientes-2', titulo: 'Editando dados e endereço', url: '', duracao: '' },
      { id: 'clientes-3', titulo: 'Consultando histórico de O.S. do cliente', url: '', duracao: '' },
    ],
  },
  {
    id: 'produtos',
    titulo: 'Produtos e Serviços',
    descricao: 'Catálogo, preços e uso na O.S.',
    ordem: 4,
    videos: [
      { id: 'produtos-1', titulo: 'Cadastrando produtos e serviços', url: '', duracao: '' },
      { id: 'produtos-2', titulo: 'Categorias e preços', url: '', duracao: '' },
      { id: 'produtos-3', titulo: 'Usando produtos na O.S. e no orçamento', url: '', duracao: '' },
      { id: 'produtos-4', titulo: 'Catálogo para impressão', url: '', duracao: '' },
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    descricao: 'Caixa, vendas, contas a pagar e comissões',
    ordem: 5,
    videos: [
      { id: 'fin-1', titulo: 'Movimentações de caixa', url: '', duracao: '' },
      { id: 'fin-2', titulo: 'Vendas e fluxo de caixa', url: '', duracao: '' },
      { id: 'fin-3', titulo: 'Contas a pagar', url: '', duracao: '' },
      { id: 'fin-4', titulo: 'Comissões de técnicos', url: '', duracao: '' },
      { id: 'fin-5', titulo: 'Lucro e desempenho', url: '', duracao: '' },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    descricao: 'Empresa, usuários, status e integrações',
    ordem: 6,
    videos: [
      { id: 'config-1', titulo: 'Dados da empresa e logo', url: '', duracao: '' },
      { id: 'config-2', titulo: 'Usuários e níveis de acesso', url: '', duracao: '' },
      { id: 'config-3', titulo: 'Status personalizados da O.S.', url: '', duracao: '' },
      { id: 'config-4', titulo: 'Checklist e equipamentos', url: '', duracao: '' },
      { id: 'config-5', titulo: 'WhatsApp e link público', url: '', duracao: '' },
    ],
  },
  {
    id: 'outros',
    titulo: 'Outros Módulos',
    descricao: 'Fornecedores, equipamentos, dashboard',
    ordem: 7,
    videos: [
      { id: 'outros-1', titulo: 'Fornecedores', url: '', duracao: '' },
      { id: 'outros-2', titulo: 'Equipamentos e categorias', url: '', duracao: '' },
      { id: 'outros-3', titulo: 'Dashboard e relatórios', url: '', duracao: '' },
      { id: 'outros-4', titulo: 'Avisos e lembretes', url: '', duracao: '' },
    ],
  },
];

/** Converte URL do YouTube (watch) em embed */
export function getEmbedUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Já é embed
  if (trimmed.includes('/embed/')) return trimmed;
  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}?rel=0`;
  // vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return trimmed;
}
