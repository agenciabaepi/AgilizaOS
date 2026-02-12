import { getRequiredPermission } from '@/config/pagePermissions';

/**
 * Permissões padrão do técnico (só Dashboard, Bancada, Comissões, Perfil).
 * Corresponde às permissões em PAGE_PERMISSIONS: dashboard, bancada, comissoes.
 */
export const TECNICO_DEFAULT_PERMISSIONS: string[] = ['dashboard', 'bancada', 'comissoes'];

/**
 * Verifica se o técnico pode acessar o pathname com base no array de permissões (sistema existente).
 * Usa getRequiredPermission(pathname) e verifica se essa permissão está em permissoes.
 */
export function canTecnicoAccessPath(
  pathname: string,
  permissoes: string[] | null | undefined
): boolean {
  const clean = pathname.split('?')[0];
  if (clean === '#logout' || clean.startsWith('#')) return true;

  const required = getRequiredPermission(clean);
  if (required === null) return true; // rota sem proteção (ex: públicas)
  const list = permissoes || [];
  return list.includes(required);
}

/**
 * Opções de permissão que o admin pode marcar para o técnico (mesmo nome usado em pagePermissions).
 */
export const TECNICO_OPCOES_PERMISSOES: { permissao: string; label: string }[] = [
  { permissao: 'dashboard', label: 'Dashboard e Meu perfil' },
  { permissao: 'bancada', label: 'Bancada' },
  { permissao: 'comissoes', label: 'Comissões' },
  { permissao: 'ordens', label: 'Ordens de Serviço' },
  { permissao: 'lembretes', label: 'Lembretes' },
  { permissao: 'clientes', label: 'Clientes' },
  { permissao: 'equipamentos', label: 'Produtos/Serviços' },
  { permissao: 'caixa', label: 'Caixa / Fluxo de Caixa' },
  { permissao: 'financeiro', label: 'Financeiro' },
  { permissao: 'catalogo', label: 'Catálogo' },
];
