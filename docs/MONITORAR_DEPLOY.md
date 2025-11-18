# 📊 Como Monitorar o Deploy

## 🔍 Verificar Status do Deploy

### 1. No Vercel Dashboard:
- Acesse: https://vercel.com/dashboard
- Vá em seu projeto
- Clique em "Deployments"
- Veja o status do último deploy

### 2. Verificar Logs do Build:
- No Vercel Dashboard, clique no deploy
- Vá em "Build Logs"
- Procure por erros de compilação

### 3. Verificar se o Deploy Funcionou:
- Acesse: `https://gestaoconsert.com.br/api/webhook/debug`
- Deve retornar JSON com configuração

## 🐛 Problemas Comuns

### Erro de Build:
- Verifique se todas as dependências estão instaladas
- Verifique se não há erros de sintaxe
- Verifique se os imports estão corretos

### Erro de Runtime:
- Verifique os logs do Vercel
- Verifique se as variáveis de ambiente estão configuradas
- Teste a API manualmente

## ✅ Checklist de Verificação

- [ ] Build completou com sucesso
- [ ] Não há erros nos logs
- [ ] API `/api/webhook/debug` responde
- [ ] Variáveis de ambiente configuradas
- [ ] Webhook configurado no Meta

