/**
 * Rotas que o usuário pode acessar mesmo com assinatura vencida
 * (renovação, pagamento, logout, etc.)
 */
const ALLOWED_WHEN_VENCIDA = [
  '/assinatura',
  '/teste-expirado',
  '/planos',
  '/planos/renovar',
  '/pagamentos/falha',
  '/pagamentos/pendente',
  '/login',
  '/empresa-desativada',
  '/', // home pública
];

export function isAllowedWhenSubscriptionExpired(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/$/, '') || '/';
  return ALLOWED_WHEN_VENCIDA.some((allowed) => {
    if (allowed === '/') return path === '/';
    return path === allowed || path.startsWith(allowed + '/');
  });
}
