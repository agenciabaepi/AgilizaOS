# 🚨 CORREÇÃO CRÍTICA: VAZAMENTO DE TERMOS ENTRE EMPRESAS

## ⚠️ PROBLEMA IDENTIFICADO

**VAZAMENTO CRÍTICO CONFIRMADO**: Termos de garantia de diferentes empresas estão sendo expostos uns aos outros.

### Evidências do Vazamento:
- ✅ Teste executado confirmou 4 termos de 3 empresas diferentes
- ❌ TODOS os termos são retornados sem filtro de empresa
- ❌ Usuários podem ver termos de outras empresas nas O.S.
- ❌ Políticas RLS inadequadas (permissivas demais)

## 🔧 CORREÇÕES APLICADAS NO CÓDIGO

### 1. Arquivo: `src/app/ordens/[id]/page.tsx`
**ANTES (INSEGURO):**
```typescript
const { data, error } = await supabase
  .from('termos_garantia')
  .select('*')
  .order('nome');
```

**DEPOIS (SEGURO):**
```typescript
const { data, error } = await supabase
  .from('termos_garantia')
  .select('*')
  .eq('empresa_id', empresaData.id)  // ← FILTRO POR EMPRESA ADICIONADO
  .order('nome');
```

### 2. Arquivo: `src/app/api/ordens/[id]/route.ts`
**ANTES (INSEGURO):**
```typescript
supabase.from('termos_garantia').select('*').eq('id', ordemData.termo_garantia_id).single()
```

**DEPOIS (SEGURO):**
```typescript
supabase.from('termos_garantia')
  .select('*')
  .eq('id', ordemData.termo_garantia_id)
  .eq('empresa_id', ordemData.empresa_id)  // ← VALIDAÇÃO DE EMPRESA ADICIONADA
  .single()
```

## 🛡️ POLÍTICAS RLS NECESSÁRIAS (APLICAR MANUALMENTE)

**URGENTE**: Execute os comandos SQL abaixo no Supabase Dashboard → SQL Editor:

```sql
-- =====================================================
-- REMOVER POLÍTICAS INSEGURAS EXISTENTES
-- =====================================================
DROP POLICY IF EXISTS "termos_garantia_select_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_insert_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_update_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_delete_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "termos_garantia_all_policy" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir select de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir insert de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir update de termos_garantia para usuários autenticados" ON public.termos_garantia;
DROP POLICY IF EXISTS "Permitir delete de termos_garantia para usuários autenticados" ON public.termos_garantia;

-- =====================================================
-- HABILITAR RLS
-- =====================================================
ALTER TABLE public.termos_garantia ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CRIAR POLÍTICAS SEGURAS POR EMPRESA
-- =====================================================

-- SELECT: Usuários só podem ver termos da própria empresa
CREATE POLICY "termos_garantia_select_empresa_policy" ON public.termos_garantia
    FOR SELECT 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- INSERT: Usuários só podem criar termos para a própria empresa
CREATE POLICY "termos_garantia_insert_empresa_policy" ON public.termos_garantia
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- UPDATE: Usuários só podem atualizar termos da própria empresa
CREATE POLICY "termos_garantia_update_empresa_policy" ON public.termos_garantia
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );

-- DELETE: Usuários só podem deletar termos da própria empresa
CREATE POLICY "termos_garantia_delete_empresa_policy" ON public.termos_garantia
    FOR DELETE 
    USING (
        auth.role() = 'authenticated' AND 
        empresa_id = (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE auth_user_id = auth.uid()
            LIMIT 1
        )
    );
```

## 📋 VERIFICAÇÃO APÓS APLICAR

Execute o teste para confirmar que o vazamento foi corrigido:

```bash
node fix-termos-rls-direct.js
```

**Resultado esperado após correção:**
- ❌ Erro ao buscar termos sem filtro (RLS funcionando)
- ✅ Sucesso ao buscar termos por empresa específica

## 🎯 ARQUIVOS VERIFICADOS (JÁ SEGUROS)

✅ `src/app/configuracoes/termos/page.tsx` - Já filtra por empresa_id
✅ `src/app/nova-os/page.tsx` - Já filtra por empresa_id e ativo=true

## 🚨 IMPACTO DA CORREÇÃO

**ANTES**: Usuários podiam ver termos de TODAS as empresas
**DEPOIS**: Usuários só veem termos da própria empresa

Esta correção é **CRÍTICA** para a segurança e conformidade LGPD do sistema.
