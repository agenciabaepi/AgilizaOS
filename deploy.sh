#!/bin/bash

echo "🚀 Iniciando deploy do Consert..."

# Navegar para o diretório do projeto
cd /opt/gestaoconsert

echo "📥 Atualizando código do GitHub..."
git pull origin main

echo "📦 Instalando dependências..."
npm install

echo "🔨 Fazendo build de produção..."
npm run build

echo "🔄 Reiniciando aplicação..."
pm2 restart consert

echo "✅ Deploy concluído!"
echo "📊 Status da aplicação:"
pm2 status

echo "📝 Logs recentes:"
pm2 logs consert --lines 10
