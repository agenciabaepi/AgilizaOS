import { matchesPermission, getAllGrantableKeys } from '@/config/grantablePermissions';
import { getRequiredPermission } from '@/config/pagePermissions';
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';
import { getDashboardPathForNivel, isAllowedDashboardPath } from '@/lib/dashboardRouting';

export {
  getDashboardPathForNivel,
  getDashboardPath,
  isUserHomePath,
  isAllowedDashboardPath,
  isWrongRoleDashboard,
} from '@/lib/dashboardRouting';

const ISOLATED_DASHBOARD_PATHS = ['/dashboard', '/dashboard-tecnico', '/dashboard-atendente'] as const;

export const TECNICO_DEFAULT_PERMISSIONS: string[] = ['dashboard', 'bancada', 'comissoes'];

/** Rotas sempre acessíveis para usuários autenticados (independente de permissão de módulo). */
export const ALWAYS_ALLOWED_PATHS = ['/perfil', '/sobre', '/politicas-privacidade'];

export type UserNivel = 'admin' | 'usuarioteste' | 'tecnico' | 'atendente' | 'financeiro' | string;

/** Normaliza permissoes vindas do Postgres (array, JSON string ou null). */
export function normalizePermissoes(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((p): p is string => typeof p === 'string');
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === 'string');
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

export function hasFullAccess(nivel: UserNivel | null | undefined): boolean {
  const n = nivel?.toLowerCase();
  return n === 'admin' || n === 'usuarioteste';
}

/** Permissões efetivas do usuário (defaults por nível quando o array está vazio). */
export function resolveUserPermissions(
  nivel: UserNivel | null | undefined,
  rawPermissoes: string[] | null | undefined | unknown
): string[] {
  const n = nivel?.toLowerCase();
  const list = normalizePermissoes(rawPermissoes);

  if (hasFullAccess(n)) return getAllGrantableKeys();
  if (list.length > 0) return list;
  return getDefaultPermissionsForRole(n || '');
}

/** Se o middleware/guards devem aplicar restrição por permissões. */
export function shouldEnforcePermissions(
  nivel: UserNivel | null | undefined,
  _rawPermissoes?: string[] | null | undefined | unknown
): boolean {
  if (hasFullAccess(nivel)) return false;
  const n = nivel?.toLowerCase();
  return n === 'tecnico' || n === 'atendente' || n === 'financeiro';
}

export function hasPermission(
  permissoes: string[] | null | undefined,
  key: string,
  nivel?: UserNivel | null
): boolean {
  if (nivel && hasFullAccess(nivel)) return true;
  return matchesPermission(permissoes ?? [], key);
}

/**
 * Verifica se o usuário pode usar um módulo (menu, abas, guards).
 * Respeita shouldEnforcePermissions: sem array customizado, não-admin tem acesso total ao menu.
 */
export function canUseModule(
  key: string,
  nivel: UserNivel | null | undefined,
  rawPermissoes: string[] | null | undefined
): boolean {
  if (key === 'whatsapp' && !WHATSAPP_CRM_ENABLED) return false;
  if (hasFullAccess(nivel)) return true;
  if (!shouldEnforcePermissions(nivel, rawPermissoes)) return true;
  const effective = resolveUserPermissions(nivel, rawPermissoes);
  return matchesPermission(effective, key);
}

/** Custo/lucro da O.S. — uso interno; não exibir em telas ou documentos do cliente. */
export function podeVerLucroOperacionalOS(
  nivel: UserNivel | null | undefined,
  rawPermissoes: string[] | null | undefined
): boolean {
  return (
    canUseModule('lucro-desempenho', nivel, rawPermissoes) ||
    canUseModule('contas-a-pagar', nivel, rawPermissoes)
  );
}

export function canAccessPath(
  pathname: string,
  permissoes: string[] | null | undefined,
  nivel: UserNivel | null | undefined,
  rawPermissoes?: string[] | null | undefined
): boolean {
  if (hasFullAccess(nivel)) return true;

  const clean = pathname.split('?')[0];
  if (clean === '#logout' || clean.startsWith('#')) return true;

  if (ALWAYS_ALLOWED_PATHS.some((p) => clean === p || clean.startsWith(`${p}/`))) {
    return true;
  }

  const list = permissoes ?? [];
  const raw = rawPermissoes ?? permissoes;
  const required = getRequiredPermission(clean);

  if (required === null) {
    return !shouldEnforcePermissions(nivel, raw);
  }

  return matchesPermission(list, required);
}

/** Presets ao trocar o nível na edição de usuário. */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  tecnico: [...TECNICO_DEFAULT_PERMISSIONS, 'suporte'],
  atendente: [
    'dashboard',
    'lembretes',
    'clientes',
    'ordens',
    'equipamentos',
    'caixa',
    'catalogo',
    'suporte',
  ],
  financeiro: [
    'dashboard',
    'lembretes',
    'clientes',
    'ordens',
    'equipamentos',
    'financeiro',
    'vendas',
    'movimentacao-caixa',
    'contas-a-pagar',
    'lucro-desempenho',
    'caixa',
    'suporte',
    'assinatura',
  ],
  admin: getAllGrantableKeys(),
};

export function getDefaultPermissionsForRole(nivel: string): string[] {
  const preset = ROLE_DEFAULT_PERMISSIONS[nivel];
  const keys = preset ? [...preset] : ['dashboard'];
  if (!keys.includes('dashboard')) keys.push('dashboard');
  return keys;
}

/** Módulos pai → sub-permissões (cascata ao marcar/desmarcar). */
export const PERMISSION_CASCADE: Record<string, string[]> = {
  financeiro: ['vendas', 'movimentacao-caixa', 'contas-a-pagar', 'lucro-desempenho'],
  clientes: ['fornecedores'],
  equipamentos: ['catalogo'],
  configuracoes: [
    'usuarios',
    'empresa',
    'regras-comissoes',
    'precificacao',
    'equipamentos-config',
    'aparelhos',
    'checklist',
    'termos-config',
    'status',
    'link-publico',
    'catalogo-config',
    'avisos',
    'whatsapp',
  ],
};

export function togglePermission(current: string[], key: string, enabled: boolean): string[] {
  if (key === 'dashboard') return current;

  let next = [...current];

  if (enabled) {
    if (!next.includes(key)) next.push(key);
    const subs = PERMISSION_CASCADE[key];
    if (subs) subs.forEach((sub) => { if (!next.includes(sub)) next.push(sub); });
  } else {
    next = next.filter((p) => p !== key);
    const subs = PERMISSION_CASCADE[key];
    if (subs) subs.forEach((sub) => { next = next.filter((p) => p !== sub); });
  }

  if (!next.includes('dashboard')) next.push('dashboard');
  return next;
}

/** Regras de nível (independente de permissões de módulo). */
export function isBlockedByNivel(pathname: string, nivel: UserNivel | null | undefined): boolean {
  const n = nivel?.toLowerCase();
  const clean = pathname.split('?')[0];
  if (clean === '/comissoes' && n !== 'tecnico') return true;
  if (clean === '/assinatura' && n === 'tecnico') return true;
  if (clean.startsWith('/financeiro/comissoes-tecnicos') && n === 'tecnico') return true;
  return false;
}

/** Dashboard de outro nível (ex.: atendente em /dashboard do admin). */
function blocksWrongRoleDashboard(pathname: string, nivel: UserNivel | null | undefined): boolean {
  const clean = pathname.split('?')[0];
  if (!ISOLATED_DASHBOARD_PATHS.includes(clean as (typeof ISOLATED_DASHBOARD_PATHS)[number])) {
    return false;
  }
  return !isAllowedDashboardPath(clean, nivel);
}

/** Verificação unificada de acesso a rota (middleware + guard cliente). */
export function checkRouteAccess(
  pathname: string,
  nivel: UserNivel | null | undefined,
  rawPermissoes: unknown
): boolean {
  const clean = pathname.split('?')[0];
  if (
    !WHATSAPP_CRM_ENABLED &&
    (clean === '/whatsapp' ||
      clean.startsWith('/whatsapp/') ||
      clean === '/configuracoes/whatsapp')
  ) {
    return false;
  }

  if (hasFullAccess(nivel)) return true;
  if (blocksWrongRoleDashboard(pathname, nivel)) return false;
  if (isBlockedByNivel(pathname, nivel)) return false;
  if (!shouldEnforcePermissions(nivel, rawPermissoes)) return true;

  const effective = resolveUserPermissions(nivel, rawPermissoes);
  return canAccessPath(pathname, effective, nivel, normalizePermissoes(rawPermissoes));
}

/** Primeira rota acessível como "home" (evita redirect loop). */
export function getHomePathForUser(
  nivel: UserNivel | null | undefined,
  rawPermissoes: unknown
): string {
  if (hasFullAccess(nivel)) return '/dashboard';

  const roleDashboard = getDashboardPathForNivel(nivel);
  if (checkRouteAccess(roleDashboard, nivel, rawPermissoes)) return roleDashboard;

  const effective = resolveUserPermissions(nivel, rawPermissoes);
  const candidates: { perm: string; path: string }[] = [
    { perm: 'ordens', path: '/ordens' },
    { perm: 'lembretes', path: '/lembretes' },
    { perm: 'clientes', path: '/clientes' },
    { perm: 'bancada', path: '/bancada' },
    { perm: 'caixa', path: '/caixa/pdv' },
    { perm: 'financeiro', path: '/financeiro' },
    { perm: 'vendas', path: '/financeiro/vendas' },
    { perm: 'comissoes', path: '/comissoes' },
    { perm: 'configuracoes', path: '/configuracoes' },
    { perm: 'suporte', path: '/suporte' },
  ];

  for (const { perm, path } of candidates) {
    if (matchesPermission(effective, perm) && checkRouteAccess(path, nivel, rawPermissoes)) {
      return path;
    }
  }

  return '/perfil';
}
