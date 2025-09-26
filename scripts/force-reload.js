// Script para forçar reload completo e limpar cache
console.log('🔄 Forçando reload completo da página...');

// Limpar cache do localStorage
localStorage.clear();
sessionStorage.clear();

// Limpar cache do service worker se existir
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Forçar reload com cache bypass
window.location.reload(true);

// Fallback para navegadores modernos
if (window.location.reload) {
  window.location.href = window.location.href + '?t=' + Date.now();
}
