/**
 * Sistema centralizado de roteamento de dashboards por role
 * 
 * Este módulo fornece funções para determinar qual dashboard cada tipo de usuário
 * deve acessar, garantindo segurança e consistência em todo o sistema.
 */

export type UserRole = 'admin' | 'tecnico' | 'atendente' | 'financeiro' | 'usuarioteste';

export interface UserData {
  nivel?: UserRole | string;
  id?: string;
  empresa_id?: string;
}

/**
 * Mapeamento de roles para suas respectivas dashboards
 */
const DASHBOARD_ROUTES: Record<UserRole, string> = {
  admin: '/dashboard',
  tecnico: '/dashboard-tecnico',
  atendente: '/dashboard-atendente',
  financeiro: '/financeiro',
  usuarioteste: '/dashboard',
};

/**
 * Retorna a rota da dashboard apropriada para o role do usuário
 */
export function getDashboardPath(userData: UserData | null | undefined): string {
  return getDashboardPathForNivel(userData?.nivel);
}

/** Home padrão por nível (login, bloqueio de rota, redirect pós-erro). */
export function getDashboardPathForNivel(nivel: UserRole | string | null | undefined): string {
  const n = nivel?.toLowerCase();
  if (n === 'tecnico') return '/dashboard-tecnico';
  if (n === 'atendente') return '/dashboard-atendente';
  if (n === 'financeiro') return '/financeiro';
  return '/dashboard';
}

/** Rotas de dashboard exclusivas por nível */
const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  admin: '/dashboard',
  usuarioteste: '/dashboard',
  tecnico: '/dashboard-tecnico',
  atendente: '/dashboard-atendente',
};

/** Verifica se o usuário pode acessar esta rota de dashboard (isolamento por nível). */
export function isAllowedDashboardPath(
  pathname: string,
  nivel: UserRole | string | null | undefined
): boolean {
  const clean = pathname.split('?')[0];
  const n = nivel?.toLowerCase();

  if (clean === '/dashboard') return n === 'admin' || n === 'usuarioteste';
  if (clean === '/dashboard-tecnico') return n === 'tecnico';
  if (clean === '/dashboard-atendente') return n === 'atendente';

  return true;
}

/** Retorna true se a rota é uma dashboard de outro nível (deve bloquear). */
export function isWrongRoleDashboard(pathname: string, nivel: UserRole | string | null | undefined): boolean {
  const clean = pathname.split('?')[0];
  if (!['/dashboard', '/dashboard-tecnico', '/dashboard-atendente'].includes(clean)) return false;
  return !isAllowedDashboardPath(clean, nivel);
}

/** Verifica se pathname é a home/dashboard do usuário */
export function isUserHomePath(pathname: string, nivel: UserRole | string | null | undefined): boolean {
  const home = getDashboardPathForNivel(nivel);
  const clean = pathname.split('?')[0];
  return clean === home || (home === '/financeiro' && clean.startsWith('/financeiro'));
}

/**
 * Verifica se o usuário pode acessar a rota (dashboards isoladas por nível).
 */
export function canAccessRoute(userData: UserData | null | undefined, route: string): boolean {
  if (!userData?.nivel) return false;
  const clean = route.split('?')[0];
  if (['/dashboard', '/dashboard-tecnico', '/dashboard-atendente'].includes(clean)) {
    return isAllowedDashboardPath(clean, userData.nivel);
  }
  return true;
}

/**
 * Retorna todas as rotas de dashboard disponíveis
 */
export function getAllDashboardRoutes(): string[] {
  return Object.values(DASHBOARD_ROUTES);
}

/**
 * Verifica se uma rota é uma dashboard específica
 */
export function isDashboardRoute(route: string): boolean {
  return getAllDashboardRoutes().includes(route);
}



