export const APP_STORE_ID = '6759183136';

export const APP_STORE_URL =
  'https://apps.apple.com/br/app/gest%C3%A3o-consert/id6759183136';

export const APP_ICON_PATH = '/assets/imagens/icon.png';

export const APP_BANNER_STORAGE_KEY = 'gestao-consert-app-banner-dismissed';

/** URL scheme registrado no app iOS (Expo / React Native) */
export const APP_DEEP_LINK_SCHEME = 'gestaoconsert://';

/** Origem para Universal Links (requer apple-app-site-association no domínio) */
export const APP_UNIVERSAL_ORIGIN = 'https://gestaoconsert.com.br';

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPad em modo desktop (iOS 13+)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function isIOSSafari() {
  if (!isIOSDevice()) return false;
  const ua = navigator.userAgent;
  // Smart App Banner só funciona no Safari
  return /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
}

export function buildAppDeepLink(path?: string) {
  const route = (path ?? 'open').replace(/^\//, '');
  return `${APP_DEEP_LINK_SCHEME}${route}`;
}

export function buildAppUniversalLink(path?: string) {
  const route = path ?? '/';
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return `${APP_UNIVERSAL_ORIGIN}${normalized}`;
}

/**
 * Tenta abrir o app nativo. Se não abrir em ~2s, redireciona para a App Store.
 * Quando o app abre, a página fica hidden (Safari vai para background).
 */
export function openInNativeApp(path?: string) {
  if (typeof window === 'undefined') return;

  const route =
    path ??
    (`${window.location.pathname}${window.location.search}`.replace(/^\//, '') || 'open');

  const schemeUrl = buildAppDeepLink(route);
  const startedAt = Date.now();

  const fallbackTimer = window.setTimeout(() => {
    if (document.hidden || Date.now() - startedAt > 3500) return;
    window.location.href = APP_STORE_URL;
  }, 2000);

  const clearFallback = () => {
    window.clearTimeout(fallbackTimer);
  };

  document.addEventListener('visibilitychange', clearFallback, { once: true });
  window.addEventListener('pagehide', clearFallback, { once: true });

  window.location.href = schemeUrl;
}
