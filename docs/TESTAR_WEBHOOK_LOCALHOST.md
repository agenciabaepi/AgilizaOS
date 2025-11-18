# 🧪 Como Testar Webhook do WhatsApp em Localhost

## ❌ Por que localhost não funciona diretamente?

O WhatsApp precisa acessar a URL do webhook pela internet. `localhost` ou `127.0.0.1` só funciona na sua máquina, então o WhatsApp não consegue acessar.

## ✅ Solução: Usar um Túnel (Tunnel)

Você precisa criar um túnel que expõe seu localhost para a internet. As melhores opções:

### Opção 1: ngrok (Recomendado) ⭐

#### 1. Instalar ngrok:
```bash
# macOS
brew install ngrok

# Ou baixe em: https://ngrok.com/download
```

#### 2. Iniciar seu servidor Next.js:
```bash
npm run dev
# Servidor rodando em http://localhost:3000
```

#### 3. Em outro terminal, criar túnel:
```bash
ngrok http 3000
```

#### 4. Copiar a URL gerada:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

#### 5. Configurar webhook no Meta:
- **URL de callback:** `https://abc123.ngrok.io/api/webhook`
- **Token de verificação:** `093718`

#### 6. Testar:
- Envie uma mensagem no WhatsApp
- Veja os logs no terminal do Next.js

### Opção 2: Cloudflare Tunnel (Gratuito)

```bash
# Instalar
npm install -g cloudflared

# Criar túnel
cloudflared tunnel --url http://localhost:3000
```

### Opção 3: localtunnel (Gratuito)

```bash
# Instalar
npm install -g localtunnel

# Criar túnel
lt --port 3000
```

## ⚠️ Importante sobre ngrok:

### Versão Gratuita:
- URL muda a cada vez que você reinicia
- Precisa atualizar o webhook no Meta toda vez
- Limite de conexões

### Versão Paga:
- URL fixa (útil para desenvolvimento)
- Mais estável

## 🔄 Workflow Recomendado:

### Para Desenvolvimento:
1. Use ngrok para testar localmente
2. Configure webhook no Meta com URL do ngrok
3. Teste e desenvolva
4. Quando terminar, configure na produção

### Para Produção:
1. Configure webhook com URL de produção:
   ```
   https://gestaoconsert.com.br/api/webhook
   ```
2. Não precisa de túnel

## 🧪 Teste Rápido sem WhatsApp:

Você pode testar o processamento sem configurar webhook:

```bash
# Testar processamento
curl -X POST http://localhost:3000/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "Olá, como você pode me ajudar?"
  }'
```

Isso testa se o código está funcionando, mas não testa o webhook real do WhatsApp.

## 📝 Resumo:

- ❌ `localhost` não funciona diretamente
- ✅ Use ngrok ou similar para expor localhost
- ✅ Configure webhook no Meta com URL do túnel
- ✅ Para produção, use URL real (sem túnel)

