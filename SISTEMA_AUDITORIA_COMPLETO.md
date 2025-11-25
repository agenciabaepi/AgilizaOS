# 🔍 SISTEMA COMPLETO DE AUDITORIA PARA ORDENS DE SERVIÇO

## 📋 VISÃO GERAL

O sistema de auditoria foi completamente reformulado para registrar **TODAS** as ações realizadas em uma ordem de serviço, não apenas mudanças de status. Agora temos rastreabilidade completa para segurança e conformidade.

## 🎯 O QUE É REGISTRADO

### ✅ Ações Automáticas (via Triggers)
- **Mudanças de Status**: Status principal e técnico
- **Alterações de Valores**: Preços, descontos, valores faturados
- **Modificações de Dados**: Observações, laudo, técnico responsável
- **Datas Importantes**: Entrega, prazo, vencimento garantia
- **Upload de Imagens**: Imagens do cliente e do técnico

### ✅ Ações Manuais (via API/Frontend)
- **Criação de OS**: Registro inicial
- **Edições Manuais**: Qualquer campo alterado
- **Upload de Anexos**: Imagens, documentos
- **Entregas**: Confirmação de entrega
- **Recusas**: Cliente recusou orçamento

## 🏗️ ARQUITETURA DO SISTEMA

### 1. Tabela Principal: `os_auditoria`

```sql
CREATE TABLE os_auditoria (
  id UUID PRIMARY KEY,
  os_id UUID NOT NULL,
  numero_os VARCHAR(50),
  
  -- Classificação da ação
  acao VARCHAR(100) NOT NULL,     -- 'STATUS_CHANGE', 'FIELD_UPDATE', etc.
  categoria VARCHAR(50) NOT NULL, -- 'STATUS', 'DADOS', 'ANEXOS', etc.
  
  -- Descrição e detalhes
  descricao TEXT NOT NULL,
  detalhes JSONB,                 -- Dados estruturados
  
  -- Valores alterados
  valor_anterior TEXT,
  valor_novo TEXT,
  campo_alterado VARCHAR(100),
  
  -- Usuário responsável
  usuario_id UUID,
  usuario_nome VARCHAR(255),
  usuario_tipo VARCHAR(50),
  
  -- Contexto
  motivo TEXT,
  observacoes TEXT,
  
  -- Metadados técnicos
  ip_address INET,
  user_agent TEXT,
  origem VARCHAR(50),             -- 'WEB', 'API', 'TRIGGER'
  
  -- Segurança
  empresa_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Função Principal: `registrar_auditoria_os()`

```sql
SELECT registrar_auditoria_os(
  p_os_id := 'uuid-da-os',
  p_acao := 'STATUS_CHANGE',
  p_categoria := 'STATUS',
  p_descricao := 'Status alterado de "AGUARDANDO" para "EM ANDAMENTO"',
  p_detalhes := '{"status": {"anterior": "AGUARDANDO", "novo": "EM ANDAMENTO"}}',
  p_usuario_id := 'uuid-do-usuario'
);
```

### 3. Triggers Automáticos

- **`trigger_auditoria_os()`**: Detecta automaticamente mudanças na tabela `ordens_servico`
- **Campos Monitorados**: Status, valores, datas, técnico, observações, imagens
- **Execução**: Após cada UPDATE na tabela

## 🔧 IMPLEMENTAÇÃO NO FRONTEND

### Hook Principal: `useAuditoriaOS`

```typescript
import { useAuditoriaOS } from '@/hooks/useAuditoriaOS';

const { 
  registrarAuditoria,
  buscarAuditoriaOS,
  registrarMudancaStatus,
  registrarUploadImagem,
  registrarMudancaValor 
} = useAuditoriaOS();

// Registrar mudança de status
await registrarMudancaStatus(osId, 'AGUARDANDO', 'EM ANDAMENTO', 'Técnico iniciou reparo');

// Registrar upload de imagem
await registrarUploadImagem(osId, 'tecnico', 'foto-reparo.jpg');

// Registrar mudança de valor
await registrarMudancaValor(osId, 'valor_servico', 100.00, 150.00);
```

### Componente de Visualização: `AuditoriaOSTimeline`

```tsx
import AuditoriaOSTimeline from '@/components/AuditoriaOSTimeline';

<AuditoriaOSTimeline 
  auditoria={auditoria}
  loading={loading}
  compact={true}
  showMetrics={true}
/>
```

## 📊 CATEGORIAS DE AÇÕES

| Categoria | Descrição | Exemplos |
|-----------|-----------|----------|
| **STATUS** | Mudanças de status | Aguardando → Em Andamento |
| **DADOS** | Alterações de campos | Observações, laudo, técnico |
| **ANEXOS** | Upload/remoção de arquivos | Imagens, documentos |
| **FINANCEIRO** | Mudanças de valores | Preços, descontos, faturamento |
| **ENTREGA** | Ações de entrega | Confirmação, data entrega |
| **SISTEMA** | Ações automáticas | Criação de OS, triggers |

## 🔒 SEGURANÇA E RLS

### Políticas Implementadas:

```sql
-- Usuários só veem auditoria da própria empresa
CREATE POLICY "os_auditoria_select_empresa_policy" ON os_auditoria
FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
);

-- Inserção apenas para usuários da mesma empresa
CREATE POLICY "os_auditoria_insert_empresa_policy" ON os_auditoria
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  empresa_id = (SELECT empresa_id FROM usuarios WHERE auth_user_id = auth.uid())
);
```

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### 🆕 Novos Arquivos:
- `create-audit-system-complete.sql` - Script completo do sistema
- `src/hooks/useAuditoriaOS.ts` - Hook React para auditoria
- `src/components/AuditoriaOSTimeline.tsx` - Componente de visualização
- `migrate-status-to-audit.sql` - Migração de dados existentes

### 🔄 Arquivos Modificados:
- `src/app/api/ordens/update-status/route.ts` - Adicionado registro de auditoria
- `src/app/ordens/[id]/page.tsx` - Interface com abas Status/Auditoria

## 🚀 INSTALAÇÃO E CONFIGURAÇÃO

### 1. Executar Scripts SQL (Ordem Importante):

```bash
# 1. Criar sistema completo de auditoria
psql -f create-audit-system-complete.sql

# 2. Migrar dados existentes (opcional)
psql -f migrate-status-to-audit.sql
```

### 2. Verificar Instalação:

```sql
-- Verificar se tabela foi criada
SELECT COUNT(*) FROM os_auditoria;

-- Verificar se função existe
SELECT proname FROM pg_proc WHERE proname = 'registrar_auditoria_os';

-- Verificar se trigger está ativo
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_auditoria_os';
```

### 3. Testar Sistema:

```sql
-- Fazer uma mudança em uma OS para testar o trigger
UPDATE ordens_servico 
SET status = 'EM ANDAMENTO' 
WHERE id = 'algum-uuid';

-- Verificar se auditoria foi registrada
SELECT * FROM os_auditoria WHERE os_id = 'algum-uuid' ORDER BY created_at DESC;
```

## 📈 MÉTRICAS E RELATÓRIOS

### View Simplificada: `vw_auditoria_os`

```sql
SELECT * FROM vw_auditoria_os 
WHERE os_id = 'uuid-da-os' 
ORDER BY created_at DESC;
```

### Métricas Disponíveis:
- **Total de ações** por OS
- **Ações realizadas hoje**
- **Usuário mais ativo**
- **Categoria de ação mais comum**
- **Tempo entre mudanças**

## 🔍 EXEMPLOS DE USO

### 1. Rastrear Mudanças de Status:
```sql
SELECT descricao, usuario_nome, created_at 
FROM os_auditoria 
WHERE categoria = 'STATUS' AND os_id = 'uuid-da-os';
```

### 2. Verificar Uploads de Imagens:
```sql
SELECT descricao, detalhes, created_at 
FROM os_auditoria 
WHERE categoria = 'ANEXOS' AND os_id = 'uuid-da-os';
```

### 3. Auditoria Financeira:
```sql
SELECT campo_alterado, valor_anterior, valor_novo, usuario_nome, created_at
FROM os_auditoria 
WHERE categoria = 'FINANCEIRO' AND os_id = 'uuid-da-os';
```

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### Performance:
- ✅ Índices otimizados para consultas frequentes
- ✅ Particionamento por empresa via RLS
- ✅ Triggers eficientes que só registram mudanças reais

### Armazenamento:
- 📊 Estimativa: ~500 bytes por registro de auditoria
- 📊 Para 10.000 OS com 20 ações cada = ~100MB
- 🔄 Considerar arquivamento de dados antigos (>2 anos)

### Backup:
- 🔒 Tabela crítica para conformidade
- 🔒 Incluir em backups regulares
- 🔒 Testar restauração periodicamente

## 🎯 BENEFÍCIOS ALCANÇADOS

### ✅ Segurança:
- Rastreabilidade completa de todas as ações
- Identificação de usuários responsáveis
- Detecção de alterações não autorizadas

### ✅ Conformidade:
- Auditoria para LGPD
- Histórico para fiscalizações
- Evidências para disputas

### ✅ Operacional:
- Identificação de gargalos no processo
- Métricas de produtividade
- Análise de padrões de uso

### ✅ Técnico:
- Debug de problemas
- Monitoramento de sistema
- Análise de performance

---

## 🚀 PRÓXIMOS PASSOS

1. **Testar** o sistema em ambiente de produção
2. **Treinar** usuários no novo sistema
3. **Monitorar** performance e ajustar se necessário
4. **Expandir** para outras entidades (clientes, produtos, etc.)
5. **Implementar** alertas para ações críticas

O sistema está pronto para uso e fornece auditoria completa e segura para todas as operações das ordens de serviço! 🎉
