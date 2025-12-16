/**
 * Sistema centralizado de roteamento de dashboards por role
 * 
 * Este módulo fornece funções para determinar qual dashboard cada tipo de usuário
 * deve acessar, garantindo segurança e consistência em todo o sistema.
 */

export type UserRole = 'admin' | 'tecnico' | 'atendente' | 'usuarioteste';

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
  usuarioteste: '/dashboard', // Usuários de teste acessam dashboard admin
};

/**
 * Retorna a rota da dashboard apropriada para o role do usuário
 * 
 * @param userData - Dados do usuário (deve conter o campo 'nivel')
 * @returns Rota da dashboard apropriada
 */
export function getDashboardPath(userData: UserData | null | undefined): string {
  if (!userData?.nivel) {
    // Se não tem nível definido, retorna dashboard padrão (admin)
    return '/dashboard';
  }

  const nivel = userData.nivel.toLowerCase() as UserRole;
  
  // Retorna a rota mapeada ou dashboard padrão se não encontrar
  return DASHBOARD_ROUTES[nivel] || '/dashboard';
}

/**
 * Verifica se o usuário tem permissão para acessar uma rota específica
 * 
 * @param userData - Dados do usuário
 * @param route - Rota que está tentando acessar
 * @returns true se o usuário pode acessar a rota
 */
export function canAccessRoute(userData: UserData | null | undefined, route: string): boolean {
  if (!userData?.nivel) {
    return false;
  }

  const nivel = userData.nivel.toLowerCase() as UserRole;
  
  // Usuários de teste têm acesso a tudo
  if (nivel === 'usuarioteste') {
    return true;
  }

  // Admin tem acesso a tudo
  if (nivel === 'admin') {
    return true;
  }

  // Verificar se a rota é a dashboard apropriada para o role
  const expectedDashboard = getDashboardPath(userData);
  
  // Permitir acesso à dashboard específica do role
  if (route === expectedDashboard) {
    return true;
  }

  // Bloquear acesso a outras dashboards específicas
  const dashboardRoutes = Object.values(DASHBOARD_ROUTES);
  if (dashboardRoutes.includes(route) && route !== expectedDashboard) {
    return false;
  }

  // Para outras rotas, retornar true (a verificação de permissão será feita pelo AuthGuard)
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

