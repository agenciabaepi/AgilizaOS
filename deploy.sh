#!/bin/bash

echo "🚀 Iniciando deploy do Gestão Consert..."

# Parar containers existentes
echo "📦 Parando containers..."
docker-compose down

# Fazer pull das últimas alterações
echo "📥 Fazendo pull das últimas alterações..."
git pull origin main

# Criar arquivo .env para produção se não existir
if [ ! -f .env ]; then
    echo "🔧 Criando arquivo .env para produção..."
    cat > .env << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://nxamrvfusyrtkcshehfm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW1ydmZ1c3lydGtjc2hlZmYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0Nzg2MTMxMCwiZXhwIjoyMDYzNDM3MzEwfQ.CWTKEVlWcMeRTv8kHgsPkk-WzoHxypFDb_QSf-DLPAQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54YW1ydmZ1c3lydGtjc2hlZmYiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ3ODYxMzEwLCJleHAiOjIwNjM0MzczMTB9.ax2dDACyrsila_Z97fjupFITA7DplPOTXoqyp-bezKc

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3752420980879882-080316-e6ea366b73ee5fcbcd2f4aeb8049886e-2502171526
MERCADOPAGO_ENVIRONMENT=sandbox

# Site URL para produção
NEXT_PUBLIC_SITE_URL=https://gestaoconsert.com.br

# Admin
PLATFORM_ADMIN_EMAILS=lucas@hotmail.com
ADMIN_SAAS_ACCESS_CODE=093718
ADMIN_SAAS_OPEN=1
EOF
fi

# Construir e iniciar containers
echo "🔨 Construindo containers..."
docker-compose build --no-cache

echo "🚀 Iniciando containers..."
docker-compose up -d

# Aguardar aplicação inicializar
echo "⏳ Aguardando aplicação inicializar..."
sleep 30

# Verificar status
echo "📊 Verificando status dos containers..."
docker-compose ps

# Verificar logs
echo "📋 Últimos logs da aplicação:"
docker-compose logs --tail=20 app

echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://gestaoconsert.com.br"
