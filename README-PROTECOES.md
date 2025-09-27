# 🛡️ SISTEMA DE PROTEÇÃO DE CONFIGURAÇÕES

## 🚨 CONFIGURAÇÕES CRÍTICAS PROTEGIDAS

Para evitar erros como usar `consert.app` ao invés de `gestaoconsert.com.br`, criamos um sistema de proteção.

## 📋 COMO USAR

### 1. Validar Configurações (SEMPRE antes de deploy)
```bash
npm run validate-config
# ou
node config-validator.js validate
```

### 2. Ver Configurações Protegidas
```bash
npm run show-config
# ou
node config-validator.js show
```

### 3. Verificar Antes de Deploy
```bash
npm run pre-deploy
```

## ⚠️ REGRAS CRÍTICAS

### ✅ SEMPRE FAZER:
- ✅ Usar `gestaoconsert.com.br` (NUNCA `consert.app`)
- ✅ Usar chaves Supabase formato `sb_publishable_` e `sb_secret_`
- ✅ Validar config antes de qualquer deploy
- ✅ Testar em localhost antes de produção

### ❌ NUNCA FAZER:
- ❌ Alterar domínio para `consert.app`
- ❌ Usar chaves JWT antigas (`eyJ...`)
- ❌ Deploy sem validar configurações
- ❌ Modificar `.protected-config.json` sem autorização

## 📁 ARQUIVOS PROTEGIDOS

- `.protected-config.json` - Configurações críticas
- `config-validator.js` - Validador automático
- `vercel.json` - Configurações de deploy
- Environment Variables no Vercel

## 🔧 CONFIGURAÇÕES CORRETAS

### Domínio
```
✅ https://gestaoconsert.com.br
❌ https://consert.app
```

### Supabase
```
✅ sb_publishable_yeCVZkUfO6Rut3Vr4EDzq5Ci9h7l1lUrukCwJMITS
✅ sb_secret_3dbdcMGcAyk8vN9ruzVRmZDjHRBAZEjt20fMCt4ClIzrhlLJ8PmcdLOFRIxd29hAGGWIX7W2lTUZjNJis
❌ eyJ... (formato antigo JWT)
```

## 🚀 FLUXO DE DEPLOY SEGURO

1. **Validar**: `npm run validate-config`
2. **Testar Local**: `npm run dev`
3. **Pre-Deploy**: `npm run pre-deploy`
4. **Deploy**: Fazer deploy apenas se validação passou
5. **Verificar**: Testar sistema online

## 💡 DICAS

- Execute `npm run validate-config` sempre que suspeitar de problemas
- Mantenha `.protected-config.json` atualizado
- Em caso de dúvida, consulte este README
- Nunca ignore os avisos do validador

## 🆘 EM CASO DE ERRO

Se o validador detectar erros:

1. **NÃO IGNORE** - corrija antes de continuar
2. **Verifique** os arquivos mencionados
3. **Corrija** usando as configurações em `.protected-config.json`
4. **Revalide** com `npm run validate-config`
5. **Só então** faça o deploy

---

**🎯 LEMBRE-SE: Este sistema existe para evitar erros amadores e manter o sistema estável!**
