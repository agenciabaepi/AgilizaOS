#!/bin/bash

echo "🧹 Limpando cache do Next.js..."

# Remover cache do Next.js
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Limpar cache do npm
npm cache clean --force

# Finalizar processos na porta 3002
echo "🔪 Finalizando processos na porta 3002..."
lsof -ti:3002 | xargs kill -9 2>/dev/null || echo "Nenhum processo rodando"

echo "✅ Limpeza concluída!"
echo ""
echo "Agora execute: npm run dev"

