# Workflow de Desenvolvimento

## Visão Geral

O sistema está configurado com dois ambientes:

- **Produção**: `https://gestaoconsert.com.br` (branch `main`)
- **Beta**: `https://beta.gestaoconsert.com.br` (branch `beta`)

## Branches

### `main` (Produção)
- **Domínio**: https://gestaoconsert.com.br
- **Uso**: Sistema estável em produção
- **Deploy**: Automático via Vercel
- **Regras**: 
  - Apenas código estável e testado
  - Correções de bugs críticos
  - Funcionalidades aprovadas

### `beta` (Desenvolvimento)
- **Domínio**: https://beta.gestaoconsert.com.br
- **Uso**: Ambiente de desenvolvimento e testes
- **Deploy**: Automático via Vercel
- **Regras**:
  - Novas funcionalidades
  - Testes de integração
  - Experimentos

## Workflow

### 1. Desenvolvimento de Novas Funcionalidades

```bash
# Trabalhar na branch beta
git checkout beta
git pull origin beta

# Fazer alterações...
git add .
git commit -m "feat: nova funcionalidade"
git push origin beta
```

### 2. Sincronização de Correções (Main → Beta)

Quando há correções na main, sincronize com beta:

```bash
# Na branch main
./scripts/sync-main-to-beta.sh
```

Ou manualmente:

```bash
git checkout main
git pull origin main
git checkout beta
git pull origin beta
git merge main
git push origin beta
```

### 3. Promoção para Produção (Beta → Main)

Quando uma funcionalidade está pronta:

```bash
# Na branch main
git checkout main
git pull origin main
git merge beta
git push origin main
```

## Comandos Úteis

### Verificar Status das Branches
```bash
git branch -a
git log --oneline --graph --all
```

### Comparar Branches
```bash
git diff main..beta
git log main..beta --oneline
```

### Rollback de Deploy
```bash
# No Vercel Dashboard ou CLI
vercel rollback
```

## Configuração do Vercel

### Produção (main)
- **Branch**: `main`
- **Domínio**: `gestaoconsert.com.br`
- **Auto-deploy**: ✅

### Beta (beta)
- **Branch**: `beta`
- **Domínio**: `beta.gestaoconsert.com.br`
- **Auto-deploy**: ✅

## Boas Práticas

### Commits
- Use conventional commits:
  - `feat:` para novas funcionalidades
  - `fix:` para correções de bugs
  - `docs:` para documentação
  - `refactor:` para refatoração

### Testes
- Teste sempre no ambiente beta primeiro
- Verifique se não há regressões
- Teste em diferentes dispositivos/navegadores

### Deploy
- Monitore os logs do Vercel após deploy
- Verifique se as variáveis de ambiente estão corretas
- Teste as funcionalidades principais

## Troubleshooting

### Conflitos de Merge
```bash
git status
# Resolver conflitos manualmente
git add .
git commit
git push origin beta
```

### Rollback Rápido
```bash
git checkout main
git reset --hard HEAD~1
git push origin main --force
```

### Limpar Cache
```bash
vercel --prod --force
```

## Monitoramento

- **Vercel Dashboard**: Monitorar deploys e performance
- **Logs**: Verificar erros em produção
- **Analytics**: Acompanhar uso das funcionalidades
