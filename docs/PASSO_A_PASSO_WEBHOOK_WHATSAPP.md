# 📱 Passo a Passo: Configurar Webhook do WhatsApp no Meta

## ⚠️ IMPORTANTE: Não é na seção "Webhooks" geral!

Você precisa configurar na seção específica do **WhatsApp**, não na seção geral de Webhooks do app.

## ✅ Passos Corretos:

### 1. No menu lateral esquerdo, procure por "WhatsApp"
   - Não clique em "Webhooks" (que está em "Produtos")
   - Procure por "WhatsApp" que também está em "Produtos"

### 2. Clique em "WhatsApp" no menu lateral

### 3. Dentro de "WhatsApp", procure por "Configuração" ou "Configuration"
   - Pode estar como uma aba no topo
   - Ou como um item no menu lateral dentro de WhatsApp

### 4. Role a página até encontrar a seção "Webhook"
   - Deve ter campos para:
     - **URL de callback**
     - **Token de verificação**

### 5. Preencha os campos:

**URL de callback:**
```
https://gestaoconsert.com.br/api/webhook
```

**Token de verificação:**
```
093718
```
(ou o valor que você configurou em `WHATSAPP_VERIFY_TOKEN`)

### 6. Clique em "Verificar e salvar"

### 7. Selecione os eventos (abaixo ou em outra seção):
   - ✅ **messages** - Para receber mensagens
   - ✅ **message_status** - Para receber status (opcional)

## 🔍 Se não encontrar a seção WhatsApp:

1. Verifique se o produto WhatsApp está ativado no seu app
2. Pode estar em: **Produtos** → **WhatsApp** → **Configuração**
3. Ou em: **WhatsApp** → **Getting Started** → **Webhook**

## 📸 Onde deve estar:

A configuração do webhook do WhatsApp geralmente está em:
- **Menu lateral:** WhatsApp → Configuração
- **Ou:** WhatsApp → Webhooks
- **Ou:** WhatsApp → API Setup

**NÃO está em:** Webhooks (seção geral do app)

## ✅ Confirmação:

Depois de configurar, quando você enviar uma mensagem no WhatsApp:
- Deve aparecer logs no Vercel
- O webhook deve aparecer como "Conectado" ou "Ativo"

