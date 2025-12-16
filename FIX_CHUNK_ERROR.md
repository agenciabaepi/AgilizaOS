# 🔧 Solução para ChunkLoadError

Este erro geralmente ocorre quando há problemas com o cache do Next.js ou hot reload.

## ✅ Solução Rápida

### 1. Limpar Cache e Reiniciar

```bash
# Executar o script de limpeza
./fix-chunk-error.sh

# Ou manualmente:
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
npm cache clean --force
```

### 2. Reiniciar o Servidor

```bash
# Parar o servidor (Ctrl+C se estiver rodando)
# Depois iniciar novamente:
npm run dev
```

### 3. Limpar Cache do Navegador

No navegador:
- Pressione `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac) para hard refresh
- Ou abra DevTools (F12) → Network → marque "Disable cache"

## 🔍 Se Ainda Não Funcionar

### Opção 1: Reinstalar Dependências
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Opção 2: Verificar Porta
```bash
# Verificar se a porta 3002 está livre
lsof -i:3002

# Se estiver ocupada, finalizar o processo:
lsof -ti:3002 | xargs kill -9

# Ou usar outra porta:
PORT=3003 npm run dev
```

### Opção 3: Build Limpo
```bash
npm run build
npm run start
```

## 📝 Nota

Este erro geralmente é temporário e resolve com limpeza de cache. Se persistir, pode indicar:
- Problemas de rede (chunks não carregando)
- Conflitos de versão de dependências
- Problemas com imports dinâmicos

## 🚀 Depois de Resolver

Após resolver o erro, o sistema deve voltar a funcionar normalmente com as correções do catálogo implementadas.

