/**
 * Rotas acessíveis sem autenticação.
 * Deve estar em sincronia com o middleware.
 */
const PUBLIC_PATH_LIST = [
  '/admin-login',
  '/login',
  '/cadastro',
  '/empresa-desativada',
  '/',
  '/sobre',
  '/termos',
  '/politicas-privacidade',
  '/planos',
  '/pagamentos/falha',
  '/pagamentos/pendente',
  '/instrucoes-verificacao',
  '/clear-auth',
  '/clear-cache',
  '/os',
  '/os/buscar',
] as const;

/**
 * Verifica se o pathname é uma rota pública (não exige login).
 * Usado pelo middleware e pelo guard de redirect no cliente.
 */
export function isPublicPath(pathname: string): boolean {
  const exactOrPrefix = PUBLIC_PATH_LIST.some((path) => {
    if (pathname === path) return true;
    if (path.startsWith('/os') && pathname.startsWith('/os')) {
      if (pathname.startsWith('/os/buscar')) return true;
      if (/^\/os\/[^/]+\/status$/.test(pathname)) return true;
      if (pathname === '/os') return true;
      if (/^\/os\/[^/]+\/login$/.test(pathname)) return true; // cliente acessa com número OS
      return false;
    }
    return pathname.startsWith(path + '/') || pathname === path;
  });
  return exactOrPrefix;
}
