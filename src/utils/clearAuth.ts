/**
 * Utilitário para limpar completamente dados de autenticação corrompidos
 */

let recoveringFromInvalidSession = false;

export const isInvalidRefreshTokenError = (error: unknown): boolean => {
  const message =
    (error as { message?: string })?.message ??
    (error as { error_description?: string })?.error_description ??
    String(error ?? '');

  return (
    message.includes('Refresh Token Not Found') ||
    message.includes('Invalid Refresh Token') ||
    message.includes('refresh_token_not_found') ||
    message.includes('Refresh Token')
  );
};

export const clearAllAuthData = () => {
  if (typeof window === 'undefined') return;

  try {
    // 1. Limpar localStorage
    localStorage.clear();
    
    // 2. Limpar sessionStorage
    sessionStorage.clear();
    
    // 3. Limpar cookies relacionados ao Supabase
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      if (name.includes('supabase') || name.includes('sb-')) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
    });
    
    // 4. Limpar IndexedDB (se existir)
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('supabase');
    }
    
    console.log('✅ Dados de autenticação limpos completamente');
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados de autenticação:', error);
  }
};

export const forceLogoutAndRedirect = async (redirectPath?: string) => {
  if (typeof window === 'undefined' || recoveringFromInvalidSession) return;
  recoveringFromInvalidSession = true;

  try {
    const { supabase } = await import('@/lib/supabaseClient');
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignorar — sessão já inválida
  }

  clearAllAuthData();

  const path = redirectPath ?? (() => {
    const current = window.location.pathname;
    if (!current || current === '/login') return '/login';
    return `/login?redirect=${encodeURIComponent(current)}`;
  })();

  window.location.replace(path);
};

export const handleAuthError = (error: unknown): boolean => {
  if (!isInvalidRefreshTokenError(error)) return false;

  console.warn('Sessão expirada ou inválida — redirecionando para login');
  void forceLogoutAndRedirect();
  return true;
};

export const setupAuthErrorRecovery = () => {
  if (typeof window === 'undefined') return () => {};

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isInvalidRefreshTokenError(event.reason)) {
      event.preventDefault();
      handleAuthError(event.reason);
    }
  };

  window.addEventListener('unhandledrejection', onUnhandledRejection);
  return () => window.removeEventListener('unhandledrejection', onUnhandledRejection);
};
