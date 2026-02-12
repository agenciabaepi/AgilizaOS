# Comissoes - Status Atual e Scripts Legados

Este diretório possui scripts antigos de diagnóstico/correção feitos em momentos diferentes.
Para evitar conflito de status no ambiente atual, considere este guia como referência oficial.

## Regra oficial de conclusão (2026)

- **OS concluída para comissão**: `ENTREGUE`
- **Status técnico de conclusão**: `REPARO CONCLUÍDO`
- **Não usar mais no fluxo atual**: `FINALIZADA`

## Scripts com regra legada (atenção)

Os arquivos abaixo ainda contêm referências legadas (`FINALIZADA`, `ABERTA` ou `ORÇAMENTO ENVIADO`):

- `corrigir-trigger-definitivo.sql`
- `diagnostico-porque-nao-registrou.sql`
- `registrar-comissoes-manualmente.sql`
- `verificar-tecnicos-os.sql`
- `trigger-com-debug-logs.sql`
- `diagnostico-trigger-execucao.sql`
- `forcar-registro-comissoes-pendentes.sql`
- `corrigir-trigger-case-insensitive.sql`
- `verificar-e-corrigir-trigger-comissao.sql`
- `registrar-comissoes-pendentes-case-insensitive.sql`
- `atualizar-trigger-comissao-ativa.sql`
- `diagnostico-completo-comissoes.sql`
- `corrigir-trigger-comissao-ativa-tecnico.sql`

## Política de uso recomendada

- **Produção:** não executar scripts legados sem revisão prévia de status.
- **Antes de rodar qualquer script antigo:** substituir `FINALIZADA` por `REPARO CONCLUÍDO` quando a intenção for status técnico.
- **Preferência:** criar novo script com sufixo de data e regra atual, em vez de reaplicar script antigo.
- **Migrações oficiais desta limpeza:**
  - `database/migrar_orcamento_enviado_para_concluido.sql`
  - `database/migrar_status_legacy_aberta_finalizada.sql`

## Validação rápida pós-script

Sempre validar com queries simples:

- Não deve existir `FINALIZADA` em `ordens_servico.status_tecnico`.
- Comissão deve ser gerada para OS `ENTREGUE` (com técnico válido e sem flags de recusa/sem conserto).

