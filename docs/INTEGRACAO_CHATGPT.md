# Integração ChatGPT no WhatsApp

## 📋 Visão Geral

O sistema agora possui integração com ChatGPT para responder automaticamente perguntas dos usuários via WhatsApp. Quando uma mensagem não é um comando conhecido (como `/comissoes`), o sistema tenta usar o ChatGPT para gerar uma resposta inteligente.

## 🔧 Configuração

### 1. Obter API Key da OpenAI

1. Acesse [https://platform.openai.com/](https://platform.openai.com/)
2. Crie uma conta ou faça login
3. Vá em **API Keys** no menu lateral
4. Clique em **Create new secret key**
5. Copie a chave gerada (ela só aparece uma vez!)

### 2. Configurar Variável de Ambiente

Adicione a seguinte variável de ambiente no seu projeto:

```bash
OPENAI_API_KEY=sk-...
```

**Onde configurar:**
- **Desenvolvimento local**: Adicione no arquivo `.env.local`
- **Vercel/Produção**: Adicione nas variáveis de ambiente do painel da Vercel

### 3. Verificar Instalação

O pacote `openai` já foi instalado. Se precisar reinstalar:

```bash
npm install openai
```

## 🎯 Como Funciona

### Fluxo de Processamento

1. **Mensagem recebida** via webhook do WhatsApp
2. **Verifica se é comando**: Se for `/comissoes`, processa normalmente
3. **Se não for comando**: Tenta usar ChatGPT para responder
4. **Resposta enviada** de volta via WhatsApp

### Comportamento

- ✅ **Com comandos**: Funciona normalmente (ex: `/comissoes`)
- ✅ **Com perguntas**: ChatGPT tenta responder de forma inteligente
- ⚠️ **Sem API Key**: Sistema funciona normalmente, mas ChatGPT fica desabilitado (mostra mensagem de comando não reconhecido)

## 💡 Exemplos de Uso

### Perguntas que o ChatGPT pode responder:

- "Como funciona o sistema de comissões?"
- "O que é uma ordem de serviço?"
- "Como posso ver minhas comissões?"
- "Qual o status da minha OS?"
- Dúvidas gerais sobre o sistema

### Comandos que continuam funcionando:

- `/comissoes` - Ver comissões do técnico

## ⚙️ Configurações Avançadas

### Modelo usado

O sistema usa o modelo `gpt-4o-mini` que é:
- ✅ Mais econômico
- ✅ Mais rápido
- ✅ Adequado para conversas simples

### Limites

- **Max tokens**: 300 (respostas concisas)
- **Temperature**: 0.7 (criatividade moderada)

### Personalização

Para modificar o comportamento do ChatGPT, edite o arquivo:
```
src/lib/chatgpt.ts
```

Você pode ajustar:
- Mensagem do sistema (contexto)
- Modelo usado
- Limites de tokens
- Temperature

## 🔍 Troubleshooting

### ChatGPT não está respondendo

1. **Verifique a API Key**: Confirme que `OPENAI_API_KEY` está configurada
2. **Verifique logs**: Procure por mensagens de erro no console
3. **Verifique créditos**: Confirme que há créditos na conta OpenAI
4. **Teste a API Key**: Tente fazer uma chamada manual à API

### Respostas muito longas

Ajuste o `max_tokens` no arquivo `src/lib/chatgpt.ts`:

```typescript
max_tokens: 200, // Reduzir para respostas mais curtas
```

### Respostas não estão adequadas

Modifique a `systemMessage` no arquivo `src/lib/chatgpt.ts` para dar mais contexto sobre o sistema.

## 📊 Custos

O modelo `gpt-4o-mini` é muito econômico:
- **Input**: ~$0.15 por 1M tokens
- **Output**: ~$0.60 por 1M tokens

Para uma conversa típica:
- Mensagem do usuário: ~50 tokens
- Resposta do ChatGPT: ~100 tokens
- **Custo aproximado**: $0.0001 por conversa

## 🔒 Segurança

- ✅ API Key nunca é exposta ao cliente
- ✅ Todas as chamadas são feitas no servidor
- ✅ Logs não incluem a API Key completa
- ⚠️ Mantenha a API Key segura e nunca a commite no Git

## 📝 Notas

- O ChatGPT funciona como fallback quando não há comandos reconhecidos
- Comandos específicos (como `/comissoes`) têm prioridade
- O sistema funciona normalmente mesmo sem a API Key configurada

