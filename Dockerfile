# Build de produção simples e funcional
FROM node:18-alpine

# Instalar dependências do sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    libc6-compat

# Definir variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código da aplicação
COPY . .

# Configurações de ambiente
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# TEMPORÁRIO: Usar dev mode para evitar problemas com prerender-manifest
# RUN npm run build
# RUN npm prune --production

# Expor porta
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# EMERGÊNCIA: Usar dev mode que funciona sem build
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
