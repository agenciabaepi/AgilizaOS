#!/bin/bash

# Script para sincronizar correções da branch main para beta
# Uso: ./scripts/sync-main-to-beta.sh

echo "🔄 Sincronizando branch main para beta..."

# Verificar se estamos na branch main
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "❌ Erro: Este script deve ser executado na branch main"
    echo "Branch atual: $current_branch"
    exit 1
fi

# Fazer backup das alterações locais
echo "💾 Fazendo backup das alterações locais..."
git stash push -m "backup-$(date +%Y%m%d-%H%M%S)"

# Atualizar main
echo "📥 Atualizando branch main..."
git pull origin main

# Fazer checkout para beta
echo "🔄 Mudando para branch beta..."
git checkout beta

# Atualizar beta
echo "📥 Atualizando branch beta..."
git pull origin beta

# Fazer merge de main para beta
echo "🔀 Fazendo merge de main para beta..."
git merge main --no-edit

# Verificar se há conflitos
if [ $? -ne 0 ]; then
    echo "❌ Conflitos detectados no merge!"
    echo "Resolva os conflitos e execute:"
    echo "  git add ."
    echo "  git commit"
    echo "  git push origin beta"
    exit 1
fi

# Push para beta
echo "📤 Enviando alterações para beta..."
git push origin beta

# Voltar para main
echo "🔄 Voltando para branch main..."
git checkout main

# Restaurar alterações locais
echo "💾 Restaurando alterações locais..."
git stash pop

echo "✅ Sincronização concluída!"
echo ""
echo "📋 Resumo:"
echo "  - Correções da main foram aplicadas na beta"
echo "  - Beta está atualizada com as últimas correções"
echo "  - Deploy automático do beta será acionado"
echo ""
echo "🌐 URLs:"
echo "  - Produção: https://gestaoconsert.com.br (main)"
echo "  - Beta: https://beta.gestaoconsert.com.br (beta)"
