#!/bin/bash

echo "🚀 DEPLOY MANUAL PARA VPS"
echo "=========================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -eq 0 ]; then
    error "Não execute este script como root!"
    exit 1
fi

# Diretório do projeto
PROJECT_DIR="/opt/gestaoconsert"
REPO_URL="https://github.com/agenciabaepi/AgilizaOS.git"

log "Iniciando deploy manual..."

# 1. Verificar/criar diretório
log "Verificando diretório do projeto..."
if [ ! -d "$PROJECT_DIR" ]; then
    warning "Diretório $PROJECT_DIR não existe. Criando..."
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    success "Diretório criado com sucesso!"
else
    success "Diretório encontrado!"
fi

# 2. Navegar para o diretório
cd "$PROJECT_DIR" || {
    error "Não foi possível acessar o diretório $PROJECT_DIR"
    exit 1
}

# 3. Clonar ou atualizar repositório
log "Atualizando código do repositório..."
if [ -d ".git" ]; then
    git pull origin main || {
        error "Falha ao fazer git pull. Tentando git fetch..."
        git fetch origin
        git reset --hard origin/main
    }
    success "Código atualizado!"
else
    warning "Repositório não encontrado. Clonando..."
    git clone "$REPO_URL" . || {
        error "Falha ao clonar repositório"
        exit 1
    }
    success "Repositório clonado!"
fi

# 4. Verificar Node.js
log "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado!"
    warning "Instale Node.js 18+ primeiro:"
    echo "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node --version)
success "Node.js encontrado: $NODE_VERSION"

# 5. Verificar Yarn
log "Verificando Yarn..."
if ! command -v yarn &> /dev/null; then
    warning "Yarn não está instalado. Instalando..."
    npm install -g yarn || {
        error "Falha ao instalar Yarn"
        exit 1
    }
fi

YARN_VERSION=$(yarn --version)
success "Yarn encontrado: $YARN_VERSION"

# 6. Instalar dependências
log "Instalando dependências..."
yarn install --frozen-lockfile || {
    error "Falha ao instalar dependências"
    exit 1
}
success "Dependências instaladas!"

# 7. Build da aplicação
log "Fazendo build da aplicação..."
yarn build || {
    error "Falha no build da aplicação"
    exit 1
}
success "Build concluído!"

# 8. Verificar PM2
log "Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    warning "PM2 não está instalado. Instalando..."
    npm install -g pm2 || {
        error "Falha ao instalar PM2"
        exit 1
    }
fi

PM2_VERSION=$(pm2 --version)
success "PM2 encontrado: $PM2_VERSION"

# 9. Parar aplicação anterior
log "Parando aplicação anterior..."
pm2 stop gestaoconsert 2>/dev/null || warning "Aplicação não estava rodando"
pm2 delete gestaoconsert 2>/dev/null || warning "Aplicação não existia"

# 10. Iniciar nova aplicação
log "Iniciando nova aplicação..."
pm2 start yarn --name "gestaoconsert" -- start || {
    error "Falha ao iniciar aplicação"
    exit 1
}

# 11. Salvar configuração PM2
log "Salvando configuração PM2..."
pm2 save || warning "Falha ao salvar configuração PM2"

# 12. Configurar startup automático
log "Configurando startup automático..."
pm2 startup | grep -E "sudo.*pm2" | bash || warning "Falha ao configurar startup automático"

# 13. Verificar status
log "Verificando status da aplicação..."
sleep 5
pm2 status

# 14. Testar aplicação
log "Testando aplicação..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    success "Aplicação está respondendo na porta 3000!"
else
    warning "Aplicação pode não estar respondendo ainda. Aguarde alguns segundos."
fi

echo ""
success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "📋 Informações úteis:"
echo "  • Aplicação: http://localhost:3000"
echo "  • PM2 Status: pm2 status"
echo "  • PM2 Logs: pm2 logs gestaoconsert"
echo "  • PM2 Restart: pm2 restart gestaoconsert"
echo "  • PM2 Stop: pm2 stop gestaoconsert"
echo ""
