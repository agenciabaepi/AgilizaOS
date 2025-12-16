# 🔍 DEBUG: Catálogo não aparece no menu

## Problema
O catálogo está habilitado na empresa e o usuário tem permissão, mas não aparece no menu.

## Verificações Necessárias

### 1. Verificar Permissões do Usuário no Banco
Execute no Supabase SQL Editor:

```sql
SELECT 
  id,
  nome,
  email,
  nivel,
  permissoes,
  array_length(permissoes, 1) as total_permissoes
FROM usuarios
WHERE email = 'EMAIL_DO_USUARIO_AQUI';
```

**Procure por:**
- A permissão `'catalogo'` deve estar no array `permissoes`
- Exemplo correto: `{dashboard,ordens,equipamentos,catalogo}`

### 2. Verificar Configuração da Empresa
```sql
SELECT 
  empresa_id,
  catalogo_habilitado
FROM configuracoes_empresa
WHERE empresa_id = 'ID_DA_EMPRESA_AQUI';
```

**Deve retornar:** `catalogo_habilitado = true`

### 3. Verificar no Console do Navegador
1. Abra o console (F12)
2. Procure por logs que começam com `🔍 Debug Catálogo`
3. Verifique:
   - `catalogoHabilitado` = true?
   - `temPermissaoCatalogo` = true?
   - `permissoes` contém 'catalogo'?

## Solução Rápida

### Opção 1: Fazer Logout/Login
O usuário precisa fazer **logout e login novamente** para recarregar as permissões do banco.

### Opção 2: Recarregar a Página
Às vezes um F5 ou Ctrl+R resolve problemas de cache.

### Opção 3: Verificar se Permissão foi Salva
1. Vá em: Configurações → Usuários → Editar o usuário
2. Verifique se "Catálogo" está marcado na seção "Módulo Produtos/Serviços"
3. Se não estiver, marque e salve
4. Peça ao usuário para fazer logout/login

## Correções Implementadas

1. ✅ Menu agora verifica permissão do usuário (não só configuração da empresa)
2. ✅ Sub-permissões aparecem sempre (não precisa marcar "Equipamentos" primeiro)
3. ✅ Logs de debug adicionados para identificar problemas
4. ✅ Catálogo aparece independente se usuário não tem permissão de equipamentos

## Próximos Passos

Se ainda não funcionar após logout/login:
1. Verifique os logs no console
2. Verifique as permissões no banco de dados
3. Verifique a configuração da empresa

