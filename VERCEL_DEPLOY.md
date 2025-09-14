# 🚀 Deploy no Vercel - AgilizaOS

Este documento contém as instruções para fazer deploy do projeto AgilizaOS no Vercel.

## 📋 Pré-requisitos

1. **Conta no Vercel**: [vercel.com](https://vercel.com)
2. **Conta no Supabase**: [supabase.com](https://supabase.com)
3. **Conta no Mercado Pago**: [mercadopago.com.br](https://mercadopago.com.br)

## 🔧 Configuração do Projeto

### 1. Clone o Repositório
```bash
git clone https://github.com/agenciabaepi/AgilizaOS.git
cd AgilizaOS
npm install
```

### 2. Configuração das Variáveis de Ambiente

No painel do Vercel, adicione as seguintes variáveis de ambiente:

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Mercado Pago
```
MERCADOPAGO_ACCESS_TOKEN=your-access-token
MERCADOPAGO_PUBLIC_KEY=your-public-key
MERCADOPAGO_CLIENT_ID=your-client-id
MERCADOPAGO_CLIENT_SECRET=your-client-secret
MERCADOPAGO_ENVIRONMENT=production
```

#### URLs da Aplicação
```
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_SUCCESS_URL=https://your-app.vercel.app/pagamentos/sucesso
NEXT_PUBLIC_FAILURE_URL=https://your-app.vercel.app/pagamentos/falha
NEXT_PUBLIC_PENDING_URL=https://your-app.vercel.app/pagamentos/pendente
```

#### Configurações Gerais
```
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🚀 Deploy

### Opção 1: Deploy Automático (Recomendado)
1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no painel do Vercel
3. Faça push para a branch `main`
4. O deploy será automático

### Opção 2: Deploy Manual
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

## 📊 Monitoramento

### Logs
- Acesse os logs no painel do Vercel
- Use `vercel logs` para logs via CLI

### Performance
- O Vercel automaticamente otimiza imagens
- CDN global incluído
- Edge Functions para APIs

## 🔄 Cron Jobs

O projeto inclui um cron job configurado no `vercel.json`:
- **Reconciliação de pagamentos**: Executa diariamente às 3h da manhã
- **Endpoint**: `/api/pagamentos/reconciliar`

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build local
npm run build

# Teste de build
npm run test:build

# Lint
npm run lint

# Preview no Vercel
npm run preview
```

## 📁 Estrutura Otimizada

O projeto foi otimizado para Vercel com:
- ✅ Configurações de build otimizadas
- ✅ Imagens otimizadas (WebP/AVIF)
- ✅ Compressão habilitada
- ✅ Headers de segurança
- ✅ Cache otimizado
- ✅ Edge Functions

## 🚨 Troubleshooting

### Problemas Comuns

1. **Build falha**: Verifique as variáveis de ambiente
2. **APIs não funcionam**: Confirme as URLs do Supabase
3. **Pagamentos falham**: Verifique as credenciais do Mercado Pago

### Logs de Debug
```bash
# Ver logs em tempo real
vercel logs --follow

# Ver logs de uma função específica
vercel logs --function=api/pagamentos/webhook
```

## 📞 Suporte

Para problemas específicos do Vercel:
- [Documentação Vercel](https://vercel.com/docs)
- [Suporte Vercel](https://vercel.com/support)

---

**🎉 Seu projeto está pronto para produção no Vercel!**
