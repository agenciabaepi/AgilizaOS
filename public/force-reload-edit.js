// Script para forçar reload e limpar cache na edição de produtos
console.log('🔄 Forçando reload e limpando cache...');

// Limpar todos os caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
    console.log('✅ Cache limpo');
  });
}

// Limpar localStorage de dados de produtos
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('produto') || key.includes('form'))) {
    keysToRemove.push(key);
  }
}
keysToRemove.forEach(key => localStorage.removeItem(key));
console.log('✅ localStorage limpo');

// Forçar reload sem cache
setTimeout(() => {
  window.location.reload(true);
}, 1000);
