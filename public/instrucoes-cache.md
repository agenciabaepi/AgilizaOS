# Instruções para Limpar Cache do Navegador

## Para resolver o erro "supabase.from(...).update(...).eq is not a function":

### Opção 1: Hard Refresh (Mais Rápido)
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R` (Mac)

### Opção 2: Limpar Cache Manualmente
1. Abra as Ferramentas do Desenvolvedor (`F12`)
2. Clique com botão direito no botão de refresh
3. Selecione "Esvaziar Cache e Recarregar"

### Opção 3: Limpar Cache via Console
1. Abra o Console do navegador (`F12` → Console)
2. Execute este comando:
```javascript
// Limpar cache e recarregar
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
  console.log('Cache limpo');
  window.location.reload(true);
});
```

### Opção 4: Modo Incógnito
- Abra uma nova aba em modo incógnito/privado
- Acesse a página novamente

## O que foi corrigido:
- ✅ Substituído `supabase.update().eq()` por API route
- ✅ Criada API `/api/produtos-servicos/atualizar`
- ✅ Código atualizado para usar fetch em vez de métodos Supabase
- ✅ Servidor reiniciado com cache limpo

O erro deve desaparecer após limpar o cache do navegador.
