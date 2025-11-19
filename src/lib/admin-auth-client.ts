'use client';

/**
 * Função CLIENT-SIDE para verificar se o usuário está autenticado no admin
 * Verifica se existe o cookie de acesso
 */
export function checkAdminAuth(): boolean {
  if (typeof document === 'undefined') return false;
  
  // Verificar se o cookie existe
  const cookies = document.cookie.split(';');
  const hasAccess = cookies.some(cookie => 
    cookie.trim().startsWith('admin_saas_access=1')
  );
  
  return hasAccess;
}

/**
 * Redireciona para login se não autenticado
 */
export function requireAdminAuth(): void {
  if (!checkAdminAuth()) {
    window.location.href = '/admin-login';
  }
}

