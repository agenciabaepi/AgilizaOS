# Análise da Página Lucro & Desempenho

## Resumo Executivo

Esta análise identificou **inconsistências em cálculos**, **problemas de lógica financeira** e **oportunidades de otimização de performance** na página `/financeiro/lucro-desempenho`.

---

## 1. PROBLEMAS DE CÁLCULO E LÓGICA

### 1.1 Inconsistência DRE - Custos vs Lucro Bruto
- **Lucro Bruto** usa `metricas.lucroTotal = receita - custosTotais` onde `custosTotais` = **peças PAGAS**
- **Linha "Custos dos Produtos/Serviços"** na DRE mostra `custosEmpresa.custosPecas` = **todas as peças** (pagas + pendentes)
- **Resultado**: Os números não fecham. Receita - custosPecas ≠ Lucro Bruto exibido.

### 1.2 Fluxo de Caixa - Saídas incorretas
- As **saídas** somam TODAS as contas que **vencem** no mês (por `data_vencimento`)
- Para fluxo de caixa real: deveria considerar **contas PAGAS** no mês (por `data_pagamento`)
- Contas pendentes não representam saída de dinheiro efetiva

### 1.3 Fluxo de Caixa - Saldo Final acumulado
- O cálculo de `saldo_final` no loop itera sobre `fluxoCaixa[i]` que pode não existir ainda na primeira iteração do mês 0
- Na prática funciona, mas a lógica está confusa: usa `saldoPeriodo` do mês atual + meses anteriores

### 1.4 Ordem de execução / Race condition
- `calcularMetricas` depende de `custosEmpresa`, mas é chamado quando `ordens` e `vendasFiltradas` mudam
- `fetchCustosEmpresa` roda em paralelo com `loadData` - métricas podem ser calculadas com `custosEmpresa` zerado inicialmente

---

## 2. PROBLEMAS DE PERFORMANCE

### 2.1 Chamadas sequenciais que poderiam ser paralelas
- No `useEffect` principal: `loadData()`, `fetchFluxoCaixaMensal()`, `fetchCustosEmpresa()`, `fetchInvestimentosMes()` são chamados em sequência
- Dentro do `loadData`: ordens → clientes → vendas → custos → todasContasParaPrevistos (nova query!)

### 2.2 Queries desnecessárias
- **todasContasParaPrevistos**: Busca TODAS as contas novamente quando já temos `todosCustos` (contas de peças). Poderia reutilizar ou fazer uma única query completa
- **Query de debug**: Quando não há vendas, faz `supabase.from('vendas')` em TODAS as empresas - deve ser removida em produção

### 2.3 Excesso de dados carregados
- `loadData` busca 200 ordens SEM filtro de período, depois filtra em memória
- Busca TODAS as vendas e TODAS as contas da empresa

### 2.4 Cadeia de useEffects
- Múltiplos useEffects em cascata: loadData → vendas → filtrarVendas → vendasFiltradas → calcularMetricas
- Re-renders desnecessários

---

## 3. CORREÇÕES APLICADAS ✅

1. **DRE**: Ajustado para usar `custosTotais` (peças pagas) em todas as linhas, alinhando com o cálculo do Lucro Bruto
2. **Fluxo de Caixa**: Saídas corrigidas - meses realizados usam `data_pagamento`; meses previstos usam `data_vencimento`
3. **Performance**: 
   - `loadData`, `fetchFluxoCaixaMensal`, `fetchCustosEmpresa`, `fetchInvestimentosMes` agora rodam em paralelo com `Promise.all`
   - Dentro do `loadData`: clientes, vendas e contas são buscados em paralelo
4. **Queries**: Removida query de debug em todas as empresas; consolidada em uma única query de contas (elimina `todasContasParaPrevistos` duplicada)
