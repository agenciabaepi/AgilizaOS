# Checklist Go Live - Status OS e Tecnico

Use este checklist antes de liberar alteracoes no fluxo de status.

## 1) Validacao de legado no banco

Executar:

- `database/comissoes/verificar_status_legacy.sql`

Esperado:

- todos os totais = `0`

## 2) Criacao de OS sem valores

Passos:

- criar uma OS sem preencher valores de produto/servico

Esperado:

- `status` da OS = `ORCAMENTO` (ou `ORCAMENTO` com acento na UI)
- `status_tecnico` = `AGUARDANDO INICIO`

## 3) Inicio tecnico

Passos:

- tecnico abrir a OS e iniciar atendimento
- alterar para `EM ANALISE`

Esperado:

- tecnico visualiza `EM ANALISE`
- OS sincroniza para `EM ANALISE`

## 4) Orcamento concluido pelo tecnico

Passos:

- tecnico preencher laudo/orcamento e salvar

Esperado:

- `status_tecnico` = `ORCAMENTO CONCLUIDO`
- OS espelha para `ORCAMENTO CONCLUIDO` quando aplicavel
- atendente/admin recebe notificacao de orcamento concluido

## 5) Acao do atendente/admin

Passos:

- atendente/admin definir status da OS para:
  - `AGUARDANDO APROVACAO`, ou
  - `APROVADO`, ou
  - `CLIENTE RECUSOU`

Esperado:

- tecnico apenas visualiza esses status (sem editar)
- nao aparece opcao indevida para tecnico alterar status administrativo

## 6) Encerramento final

Passos:

- concluir fluxo e marcar OS como `ENTREGUE`

Esperado:

- OS fica bloqueada para edicao
- mudancas posteriores de dados/status devem ser impedidas

## 7) Regressao rapida de dashboard

Conferir:

- Dashboard Tecnico: contadores sem `ABERTA`, `FINALIZADA`, `ORCAMENTO ENVIADO`
- Dashboard Atendente: sem status legado nos cards/filtros
- Bancada: labels e badges sem status legado

## 8) Comissao (amostra)

Passos:

- pegar uma OS entregue com tecnico valido e sem flags de recusa/sem conserto

Esperado:

- comissao registrada normalmente
- sem dependencia de status legado (`FINALIZADA`)

