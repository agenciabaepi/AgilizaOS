#!/bin/bash

echo "🚀 Configurando Environment Variables no Vercel..."

# Chaves Supabase corretas
SUPABASE_URL="https://nxamrvfusyrtkcshehfm.supabase.co"
ANON_KEY="sb_publishable_yeCVZkUfO6Rut3Vr4EDzq5Ci9h7l1lUrukCwJMITS"
SERVICE_KEY="sb_secret_3dbdcMGcAyk8vN9ruzVRmZDjHRBAZEjt20fMCt4ClIzrhlLJ8PmcdLOFRIxd29hAGGWIX7W2lTUZjNJis"

echo "📋 INSTRUÇÕES PARA CONFIGURAR NO PAINEL DO VERCEL:"
echo ""
echo "1. Acesse: https://vercel.com/[seu-time]/[seu-projeto]/settings/environment-variables"
echo "2. REMOVA as variáveis antigas (se existirem)"
echo "3. ADICIONE as seguintes variáveis:"
echo ""
echo "🔑 NEXT_PUBLIC_SUPABASE_URL (Production + Preview + Development):"
echo "$SUPABASE_URL"
echo ""
echo "🔑 NEXT_PUBLIC_SUPABASE_ANON_KEY (Production + Preview + Development):"
echo "$ANON_KEY"
echo ""
echo "🔑 SUPABASE_SERVICE_ROLE_KEY (Production + Preview + Development):"
echo "$SERVICE_KEY"
echo ""
echo "4. SALVE e faça REDEPLOY"
echo ""
echo "🎯 IMPORTANTE: Certifique-se de marcar as 3 opções: Production, Preview, Development"
echo ""
echo "✅ Após configurar, o sistema deve funcionar perfeitamente!"

# Se tiver Vercel CLI instalado, tentar configurar automaticamente
if command -v vercel &> /dev/null; then
    echo ""
    read -p "🤖 Quer tentar configurar automaticamente via CLI? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔧 Configurando via Vercel CLI..."
        
        # Remover variáveis antigas
        vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes 2>/dev/null || true
        vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes 2>/dev/null || true
        
        # Adicionar novas variáveis
        echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
        echo "$ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production  
        echo "$SERVICE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
        
        echo "✅ Variáveis configuradas! Fazendo redeploy..."
        vercel --prod --force
        
        echo "🎯 Deploy concluído! Teste o sistema em 2-3 minutos."
    fi
else
    echo "💡 Vercel CLI não encontrado. Configure manualmente pelo painel."
fi
