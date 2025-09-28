# Configuração do Vercel - Ambiente Beta

## Visão Geral

Este documento explica como configurar o ambiente beta no Vercel para ter dois ambientes separados:

- **Produção**: `https://gestaoconsert.com.br` (branch `main`)
- **Beta**: `https://beta.gestaoconsert.com.br` (branch `beta`)

## Configuração no Vercel Dashboard

### 1. Acessar o Projeto

1. Acesse [vercel.com](https://vercel.com)
2. Vá para o projeto `consertapp`
3. Acesse **Settings** → **Git**

### 2. Configurar Branches

1. Em **Production Branch**, certifique-se que está configurado como `main`
2. Em **Ignored Build Step**, deixe vazio para permitir builds automáticos

### 3. Configurar Domínios

#### Domínio de Produção
1. Vá para **Settings** → **Domains**
2. Adicione `gestaoconsert.com.br`
3. Configure para apontar para a branch `main`

#### Domínio Beta
1. Adicione `beta.gestaoconsert.com.br`
2. Configure para apontar para a branch `beta`

### 4. Configurar Variáveis de Ambiente

#### Para Produção (main)
```bash
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

#### Para Beta (beta)
```bash
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 5. Configurar Deploy Automático

1. Vá para **Settings** → **Git**
2. Certifique-se que **Automatic deployments** está habilitado
3. Configure **Production Branch** como `main`
4. Habilite **Preview deployments** para outras branches

## Configuração via CLI

### Configurar Variáveis de Ambiente

```bash
# Produção
vercel env add NODE_ENV production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Beta
vercel env add NODE_ENV preview
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env add SUPABASE_SERVICE_ROLE_KEY preview
```

### Deploy Manual

```bash
# Deploy da main (produção)
vercel --prod

# Deploy da beta
vercel --target preview
```

## Workflow de Desenvolvimento

### 1. Desenvolvimento na Beta

```bash
# Trabalhar na branch beta
git checkout beta
git pull origin beta

# Fazer alterações...
git add .
git commit -m "feat: nova funcionalidade"
git push origin beta
```

### 2. Sincronização Main → Beta

```bash
# Na branch main
./scripts/sync-main-to-beta.sh
```

### 3. Promoção Beta → Main

```bash
# Na branch main
git checkout main
git pull origin main
git merge beta
git push origin main
```

## Monitoramento

### Deploy Status
- **Produção**: https://vercel.com/rhema-gestaos-projects/consertapp
- **Beta**: https://vercel.com/rhema-gestaos-projects/consertapp (preview deployments)

### Logs
```bash
# Ver logs da produção
vercel logs --prod

# Ver logs da beta
vercel logs --target preview
```

## Troubleshooting

### Problema: Deploy não acontece automaticamente
1. Verificar se a branch está configurada corretamente
2. Verificar se as variáveis de ambiente estão definidas
3. Verificar se o build não está falhando

### Problema: Domínio não funciona
1. Verificar DNS do domínio
2. Verificar configuração no Vercel
3. Aguardar propagação DNS (até 24h)

### Problema: Variáveis de ambiente
1. Verificar se estão definidas para o ambiente correto
2. Verificar se os valores estão corretos
3. Fazer novo deploy após alterar variáveis

## URLs Finais

Após a configuração:

- **Produção**: https://gestaoconsert.com.br
- **Beta**: https://beta.gestaoconsert.com.br

## Comandos Úteis

```bash
# Ver status dos deploys
vercel ls

# Ver variáveis de ambiente
vercel env ls

# Fazer rollback
vercel rollback

# Ver logs em tempo real
vercel logs --follow
```
