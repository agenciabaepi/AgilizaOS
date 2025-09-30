// Script para limpar cache e forçar reload
console.log('🧹 Limpando cache e recarregando página...');

// Limpar todos os caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
    console.log('✅ Cache limpo');
  });
}

// Forçar reload sem cache
setTimeout(() => {
  window.location.reload(true);
}, 1000);
