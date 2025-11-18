# 🔑 Como Configurar OPENAI_API_KEY no Vercel

## ⚠️ Problema Identificado

O debug mostra que `OPENAI_API_KEY` não está configurada:
```json
"chatgpt": {
  "configured": false,
  "apiKey": "❌ Não configurado"
}
```

## ✅ Solução: Configurar no Vercel

### Passo 1: Acessar o Painel do Vercel

1. Acesse: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto: **gestaoconsert** (ou o nome do seu projeto)

### Passo 2: Ir em Settings → Environment Variables

1. No menu lateral, clique em **Settings**
2. Clique em **Environment Variables**

### Passo 3: Adicionar a Variável

1. Clique em **Add New**
2. Preencha:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `sk-...` (sua chave da OpenAI)
   - **Environments**: Marque todas as opções:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development

3. Clique em **Save**

### Passo 4: Fazer Redeploy

**IMPORTANTE**: Após adicionar a variável, você precisa fazer um redeploy:

1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Clique em **Redeploy**
4. Ou faça um commit vazio para acionar deploy automático

## 🔍 Verificar se Funcionou

Após o redeploy, acesse:
```
https://gestaoconsert.com.br/api/webhook/debug
```

Deve mostrar:
```json
"chatgpt": {
  "configured": true,
  "apiKey": "✅ Configurado (...)"
}
```

## 📝 Onde Obter a API Key

1. Acesse: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Faça login
3. Clique em **Create new secret key**
4. Copie a chave (ela só aparece uma vez!)

## ⚠️ Importante

- A chave começa com `sk-`
- Não compartilhe a chave publicamente
- A chave só aparece uma vez ao criar
- Se perder, crie uma nova

## ✅ Após Configurar

Depois de configurar e fazer redeploy:
1. Envie uma mensagem no WhatsApp
2. O ChatGPT deve responder automaticamente
3. Teste perguntas como:
   - "Quantas OS pendentes tenho?"
   - "Quanto tenho de comissão?"
   - "Qual meu nome?"

