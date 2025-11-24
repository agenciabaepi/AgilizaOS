# 📊 Análise: Separação de Empresas por Modelos de Investimento

## 🎯 Objetivo

Implementar separação de funcionalidades por modelos de investimento:
- **Básico**: Sistema de ordens de serviço completo (clientes, produtos, etc)
- **Pro**: Tudo do Básico + Módulo financeiro completo
- **Ultra**: Sistema completo + Automações WhatsApp com ChatGPT + Editor de foto

---

## ✅ Situação Atual

### 1. Infraestrutura Existente

O sistema **JÁ POSSUI** a base necessária:

#### ✅ Tabela de Planos (`planos`)
- Campo `recursos_disponiveis` (JSONB) que armazena quais recursos estão disponíveis
- Exemplo atual:
```sql
'recursos_disponiveis': {
  "financeiro": false,
  "whatsapp": false,
  "editor_foto": false,
  ...
}
```

#### ✅ Tabela de Assinaturas (`assinaturas`)
- Relaciona empresa → plano
- Status: trial, active, cancelled, expired, suspended

#### ✅ Hook `useSubscription`
- Função `temRecurso(recurso: string)` que verifica se um recurso está disponível
- Já busca os dados do plano da empresa

#### ✅ Sistema de Permissões
- `pagePermissions.ts` mapeia rotas → permissões necessárias
- `MenuLayout.tsx` usa `podeVer()` para mostrar/esconder itens do menu
- `AuthGuard` protege rotas baseado em permissões de usuário

---

## 🔍 O Que Precisa Ser Implementado

### 1. Atualizar Planos no Banco de Dados

Atualizar os planos conforme os novos modelos:

```sql
-- Plano Básico
{
  "ordens_servico": true,
  "clientes": true,
  "produtos": true,
  "servicos": true,
  "equipamentos": true,
  "financeiro": false,        -- ❌ NÃO tem
  "whatsapp": false,           -- ❌ NÃO tem
  "editor_foto": false,        -- ❌ NÃO tem
  "chatgpt": false             -- ❌ NÃO tem
}

-- Plano Pro
{
  "ordens_servico": true,
  "clientes": true,
  "produtos": true,
  "servicos": true,
  "equipamentos": true,
  "financeiro": true,          -- ✅ TEM
  "vendas": true,
  "contas_pagar": true,
  "movimentacao_caixa": true,
  "lucro_desempenho": true,
  "whatsapp": false,           -- ❌ NÃO tem
  "editor_foto": false,        -- ❌ NÃO tem
  "chatgpt": false             -- ❌ NÃO tem
}

-- Plano Ultra
{
  "ordens_servico": true,
  "clientes": true,
  "produtos": true,
  "servicos": true,
  "equipamentos": true,
  "financeiro": true,          -- ✅ TEM
  "vendas": true,
  "contas_pagar": true,
  "movimentacao_caixa": true,
  "lucro_desempenho": true,
  "whatsapp": true,            -- ✅ TEM
  "editor_foto": true,         -- ✅ TEM
  "chatgpt": true              -- ✅ TEM
}
```

### 2. Integrar Verificação de Recursos no Menu

Atualmente o `MenuLayout.tsx` usa apenas `podeVer()` (permissões de usuário). Precisamos adicionar verificação de recursos do plano:

```typescript
// Exemplo de como ficaria:
const { temRecurso } = useSubscription();

// No menu:
{temRecurso('financeiro') && podeVer('financeiro') && (
  <MenuItem path="/financeiro" />
)}
```

### 3. Proteger Rotas por Recursos do Plano

Atualmente as rotas são protegidas apenas por permissões de usuário. Precisamos adicionar verificação de recursos:

```typescript
// Em AuthGuard ou useRouteProtection
const { temRecurso } = useSubscription();
const requiredResource = getRequiredResource(pathname);

if (requiredResource && !temRecurso(requiredResource)) {
  // Redirecionar ou mostrar mensagem de upgrade
}
```

### 4. Mapear Rotas → Recursos Necessários

Criar um mapeamento similar ao `pagePermissions.ts`:

```typescript
export const PAGE_RESOURCES = {
  '/financeiro': 'financeiro',
  '/financeiro/vendas': 'financeiro',
  '/financeiro/contas-a-pagar': 'financeiro',
  '/configuracoes/whatsapp': 'whatsapp',
  // ... etc
};
```

### 5. Componente de Upgrade/Blur

Quando usuário tentar acessar recurso não disponível:
- Mostrar modal de upgrade
- Ou mostrar página com blur e botão "Fazer upgrade"

---

## 📋 Plano de Implementação

### Fase 1: Atualização do Banco de Dados ✅
1. Criar script SQL para atualizar os planos
2. Definir recursos corretos para cada plano
3. Testar no banco

### Fase 2: Integração no Frontend
1. Criar `pageResources.ts` mapeando rotas → recursos
2. Atualizar `MenuLayout.tsx` para verificar recursos
3. Atualizar `AuthGuard` para verificar recursos
4. Criar componente de "Upgrade necessário"

### Fase 3: Proteção de APIs
1. Verificar recursos nas rotas de API também
2. Retornar erro apropriado se recurso não disponível

### Fase 4: Testes
1. Testar cada plano isoladamente
2. Verificar que menus aparecem/escondem corretamente
3. Verificar que rotas são bloqueadas corretamente

---

## 🎨 Exemplo de Implementação

### 1. Arquivo `src/config/pageResources.ts`

```typescript
export const PAGE_RESOURCES = {
  // Financeiro
  '/financeiro': 'financeiro',
  '/financeiro/vendas': 'financeiro',
  '/financeiro/contas-a-pagar': 'financeiro',
  '/financeiro/movimentacoes-caixa': 'financeiro',
  '/financeiro/lucro-desempenho': 'financeiro',
  
  // WhatsApp
  '/configuracoes/whatsapp': 'whatsapp',
  
  // Editor de foto (quando implementado)
  // '/editor-foto': 'editor_foto',
  
  // ChatGPT (quando implementado)
  // '/configuracoes/chatgpt': 'chatgpt',
} as const;

export function getRequiredResource(pathname: string): string | null {
  const cleanPath = pathname.split('?')[0];
  
  if (PAGE_RESOURCES[cleanPath as keyof typeof PAGE_RESOURCES]) {
    return PAGE_RESOURCES[cleanPath as keyof typeof PAGE_RESOURCES];
  }
  
  // Verificar rotas dinâmicas
  for (const [route, resource] of Object.entries(PAGE_RESOURCES)) {
    if (route.includes('[')) {
      const routeRegex = route
        .replace(/\[.*?\]/g, '[^/]+')
        .replace(/\//g, '\\/');
      
      if (new RegExp(`^${routeRegex}$`).test(cleanPath)) {
        return resource;
      }
    }
  }
  
  return null;
}
```

### 2. Atualização no `MenuLayout.tsx`

```typescript
import { useSubscription } from '@/hooks/useSubscription';

// Dentro do componente:
const { temRecurso } = useSubscription();

// No menu financeiro:
{temRecurso('financeiro') && podeVer('financeiro') && (
  <MenuItem path="/financeiro" />
)}
```

### 3. Atualização no `AuthGuard.tsx`

```typescript
import { getRequiredResource } from '@/config/pageResources';
import { useSubscription } from '@/hooks/useSubscription';

// Dentro do componente:
const { temRecurso } = useSubscription();
const requiredResource = getRequiredResource(pathname);

if (requiredResource && !temRecurso(requiredResource)) {
  return <UpgradeRequiredModal resource={requiredResource} />;
}
```

---

## ⚠️ Pontos de Atenção

1. **Compatibilidade com empresas existentes**: Empresas que já têm assinatura precisam ter seus planos atualizados
2. **Permissões vs Recursos**: Recursos do plano são diferentes de permissões de usuário
   - Permissão: usuário pode acessar (ex: admin vs técnico)
   - Recurso: plano permite acesso (ex: básico vs pro)
3. **Fallback**: Se não houver assinatura, decidir se libera tudo ou bloqueia tudo
4. **Performance**: Verificação de recursos não deve impactar performance

---

## ✅ Conclusão

**É TOTALMENTE POSSÍVEL** implementar a separação por modelos de investimento. O sistema já possui:
- ✅ Estrutura de planos e assinaturas
- ✅ Campo `recursos_disponiveis` no banco
- ✅ Hook `useSubscription` com `temRecurso()`
- ✅ Sistema de proteção de rotas

**O que falta:**
- Atualizar planos no banco com os recursos corretos
- Integrar verificação de recursos no menu e rotas
- Criar componente de upgrade quando necessário

**Estimativa de implementação:** 2-3 horas de desenvolvimento + testes

