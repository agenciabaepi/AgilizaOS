# Dockerfile para produção
FROM node:18-alpine

# Instalar dependências do sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Definir variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código da aplicação
COPY . .

# Construir a aplicação
RUN npm run build

# Remover devDependencies após o build para reduzir tamanho
RUN npm prune --production

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]
