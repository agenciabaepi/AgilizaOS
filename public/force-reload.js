// Script para forçar reload e limpar cache
if (typeof window !== 'undefined') {
  // Limpar todos os caches
  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
      }
    });
  }
  
  // Limpar localStorage e sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Forçar reload
  window.location.reload(true);
}
