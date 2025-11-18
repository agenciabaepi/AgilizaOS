# 🔧 Como Configurar o Webhook do WhatsApp

## ⚠️ Problema Identificado

Se você está enviando mensagens no WhatsApp mas **não está recebendo respostas** e **não aparecem logs no Vercel**, o problema é que o **webhook não está configurado corretamente** no Meta/Facebook.

## 📋 Passo a Passo para Configurar

### 1. Acesse o Meta for Developers

1. Acesse: [https://developers.facebook.com/](https://developers.facebook.com/)
2. Faça login com sua conta
3. Vá em **Meus Apps** e selecione seu app do WhatsApp

### 2. Configure o Webhook

1. No menu lateral, vá em **WhatsApp** → **Configuração**
2. Role até a seção **Webhook**
3. Clique em **Configurar Webhooks** ou **Editar**

### 3. Preencha os Dados do Webhook

**URL do Callback:**
```
https://gestaoconsert.com.br/api/webhook
```
ou se estiver usando Vercel:
```
https://seu-app.vercel.app/api/webhook
```

**Token de Verificação:**
```
093718
```
(ou o valor que você configurou em `WHATSAPP_VERIFY_TOKEN`)

### 4. Selecione os Eventos

Marque os eventos que você quer receber:
- ✅ **messages** - Mensagens recebidas
- ✅ **message_status** - Status das mensagens (opcional)

### 5. Verifique o Webhook

1. Clique em **Verificar e Salvar**
2. O Meta vai fazer uma requisição `GET` para validar
3. Se aparecer ✅, está configurado corretamente

## 🔍 Como Verificar se Está Funcionando

### Opção 1: Verificar Logs no Vercel

1. Acesse o painel do Vercel
2. Vá em **Logs**
3. Filtre por `/api/webhook`
4. Envie uma mensagem no WhatsApp
5. Você deve ver logs como:
   - `📨 Webhook POST - Mensagem recebida`
   - `📨 Mensagem detectada`
   - `💬 Texto recebido`

### Opção 2: Testar o Webhook Manualmente

Acesse: `https://gestaoconsert.com.br/api/webhook/debug`

Você verá:
- ✅ Se as variáveis estão configuradas
- ✅ URL do webhook
- ✅ Status do ChatGPT

### Opção 3: Testar Processamento

Faça uma requisição POST para testar:

```bash
curl -X POST https://gestaoconsert.com.br/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "Olá, como você pode me ajudar?"
  }'
```

## ❌ Problemas Comuns

### 1. Webhook não recebe mensagens

**Causa:** Webhook não está configurado ou URL está incorreta

**Solução:**
- Verifique se a URL está correta no Meta
- Verifique se o webhook está ativo (deve aparecer como "Conectado")
- Teste a URL manualmente no navegador (deve retornar erro 400, mas não 404)

### 2. Erro 400 no GET

**Causa:** Token de verificação incorreto

**Solução:**
- Verifique se `WHATSAPP_VERIFY_TOKEN` no Vercel está igual ao configurado no Meta
- O token padrão é: `093718`

### 3. Mensagens chegam mas não respondem

**Causa:** Erro no processamento ou envio

**Solução:**
- Verifique os logs no Vercel
- Verifique se `WHATSAPP_ACCESS_TOKEN` está válido
- Verifique se `WHATSAPP_PHONE_NUMBER_ID` está correto

### 4. ChatGPT não responde

**Causa:** API Key não configurada ou inválida

**Solução:**
- Verifique se `OPENAI_API_KEY` está configurada no Vercel
- Teste a API Key em: `/api/test-chatgpt?message=teste`

## 📝 Checklist de Configuração

- [ ] Webhook configurado no Meta for Developers
- [ ] URL do webhook está correta e acessível
- [ ] Token de verificação configurado (mesmo valor no Meta e Vercel)
- [ ] Eventos selecionados (messages)
- [ ] Webhook aparece como "Conectado" no Meta
- [ ] `WHATSAPP_VERIFY_TOKEN` configurado no Vercel
- [ ] `WHATSAPP_ACCESS_TOKEN` configurado no Vercel
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configurado no Vercel
- [ ] `OPENAI_API_KEY` configurado no Vercel (para ChatGPT)

## 🧪 Teste Completo

1. **Configure o webhook** seguindo os passos acima
2. **Envie uma mensagem** no WhatsApp para o número configurado
3. **Verifique os logs** no Vercel
4. **Aguarde a resposta** (pode levar alguns segundos)

## 📞 Suporte

Se ainda não funcionar:
1. Verifique os logs no Vercel
2. Verifique o status do webhook no Meta
3. Teste a URL do webhook manualmente
4. Verifique todas as variáveis de ambiente

