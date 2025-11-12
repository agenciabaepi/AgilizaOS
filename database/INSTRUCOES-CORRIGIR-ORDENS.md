# 🔧 INSTRUÇÕES PARA CORRIGIR PROBLEMA DAS ORDENS NÃO CARREGAREM

## Problema Identificado

As ordens de serviço não estão carregando porque:
1. A coluna `atendente_id` pode ter valores inválidos (UUIDs que não existem na tabela `usuarios`)
2. A foreign key constraint pode estar bloqueando a query
3. A query pode estar falhando silenciosamente

## Solução em 3 Passos

### PASSO 1: Executar Diagnóstico
Execute o arquivo `diagnostico-ordens-nao-carregam.sql` no Supabase SQL Editor para verificar o estado atual do banco.

### PASSO 2: Executar Correção
Execute o arquivo `corrigir-problema-ordens.sql` no Supabase SQL Editor. Este script:
- Remove valores inválidos de `atendente_id`
- Garante que a coluna existe
- Remove e recria a foreign key corretamente
- Tenta preencher `atendente_id` com base no nome do atendente

### PASSO 3: Testar
Após executar o SQL, recarregue a página de ordens e verifique:
1. Se as ordens aparecem
2. Se há erros no console do navegador
3. Se os dados estão corretos

## Alterações no Código

O código da página de ordens (`src/app/ordens/page.tsx`) foi atualizado para:
- Remover `atendente_id` da query principal temporariamente (para evitar erros)
- Adicionar logs detalhados de debug
- Tratar erros de forma mais robusta

Após executar o SQL de correção, você pode adicionar `atendente_id` de volta na query se necessário.

## Arquivos Criados

1. `database/diagnostico-ordens-nao-carregam.sql` - Script de diagnóstico
2. `database/corrigir-problema-ordens.sql` - Script de correção
3. `database/2025-11-12-add-atendente-id-ordens-CORRIGIDO.sql` - Versão corrigida do SQL original

## Próximos Passos

1. Execute os scripts SQL na ordem indicada
2. Teste se as ordens carregam
3. Se ainda houver problemas, envie os logs do console do navegador

