# 📊 Snapshot Financeiro - Sistema de Gestão

## 🎯 Visão Geral

O Snapshot Financeiro foi implementado para fornecer uma visão rápida e detalhada da situação financeira da empresa, integrando dados de vendas e contas a pagar.

## ✅ Funcionalidades Implementadas

### Task 1 - Snapshot na Página de Vendas ✅

- **3 Cards Financeiros** no topo da página de vendas:
  - 💰 **Receita**: Somatório das vendas recebidas do período
  - 💸 **Despesas**: Contas a pagar do período
  - 📈 **Lucro**: Receita - Despesas
- **Valores em BRL** (pt-BR)
- **Respeita filtros de data** já existentes na página
- **Botão "Ver detalhes"** → redireciona para `/financeiro/dashboard`

### Task 2 - Dashboard Financeiro ✅

- **Página dedicada** em `/financeiro/dashboard`
- **Cards detalhados**:
  - Receita Bruta
  - Descontos
  - Receita Líquida
  - Custos (peças)
  - Margem Bruta
  - Despesas
  - Lucro
- **Filtros avançados**:
  - Período (hoje, semana, mês, personalizado)
  - Status das contas
  - Forma de pagamento
- **Resumo de Contas a Pagar**:
  - Contas pendentes
  - Contas vencidas
  - Contas pagas

## 🗄️ Estrutura do Banco de Dados

### Views SQL Criadas

1. **`view_snapshot_financeiro`**
   - Snapshot geral por empresa
   - Calcula receita, despesas e lucro automaticamente

2. **`get_snapshot_financeiro_periodo()`**
   - Função para calcular snapshot de período específico
   - Parâmetros: empresa_id, data_inicio, data_fim

### Tabelas Utilizadas

- **`vendas`**: Para calcular receita
- **`contas_pagar`**: Para calcular despesas
- **`categorias_contas`**: Para categorizar despesas

## 🚀 Como Configurar

### 1. Aplicar SQL no Supabase

```bash
# Execute o script de configuração
node scripts/setup-financeiro-snapshot.js
```

### 2. Aplicar no Supabase Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para o seu projeto
3. Navegue até **SQL Editor**
4. Cole o conteúdo do arquivo `src/lib/sql/snapshot_financeiro.sql`
5. Execute o script

### 3. Verificar Implementação

- ✅ Página de vendas: `/financeiro/vendas`
- ✅ Dashboard financeiro: `/financeiro/dashboard`
- ✅ Cards aparecem corretamente
- ✅ Filtros funcionam
- ✅ Navegação entre páginas

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
- `src/lib/sql/snapshot_financeiro.sql` - Queries SQL
- `src/hooks/useSnapshotFinanceiro.ts` - Hook personalizado
- `src/components/SnapshotFinanceiro.tsx` - Componente dos cards
- `src/app/financeiro/dashboard/page.tsx` - Página do dashboard
- `scripts/setup-financeiro-snapshot.js` - Script de configuração
- `docs/SNAPSHOT_FINANCEIRO.md` - Esta documentação

### Arquivos Modificados
- `src/app/financeiro/vendas/page.tsx` - Adicionado snapshot financeiro

## 🎨 Design e UX

### Padrão Visual Seguido
- ✅ **Cards** com bordas coloridas e ícones
- ✅ **Botões** com variantes consistentes
- ✅ **Filtros** com layout responsivo
- ✅ **Cores** seguindo o padrão do sistema:
  - Verde: Receita/Lucro positivo
  - Vermelho: Despesas/Lucro negativo
  - Azul: Margem/Percentuais
  - Laranja: Pendências
- ✅ **Responsivo** para mobile
- ✅ **Loading states** com skeleton
- ✅ **Estados de erro** com mensagens claras

### Componentes Utilizados
- `Card`, `CardHeader`, `CardContent`, `CardTitle`
- `Button` com variantes
- `Input` para filtros de data
- `Select` para filtros de status
- Ícones do `react-icons/fi`

## 🔧 Funcionalidades Técnicas

### Hook `useSnapshotFinanceiro`
- Busca dados do Supabase
- Suporte a filtros de período
- Estados de loading e error
- Valores zerados quando não há dados
- Função `refetch` para atualização

### Componente `SnapshotFinanceiro`
- Cards responsivos
- Formatação de moeda (pt-BR)
- Formatação de percentual
- Navegação para dashboard
- Estados de loading com skeleton

### Dashboard Financeiro
- Filtros avançados
- Cards detalhados
- Resumo de contas a pagar
- Botões de ação (atualizar, exportar)
- Layout responsivo

## 📊 Cálculos Financeiros

### Receita
```sql
SUM(valor_pago) FROM vendas 
WHERE status = 'finalizada' 
AND data_venda BETWEEN inicio AND fim
```

### Despesas
```sql
SUM(valor) FROM contas_pagar 
WHERE data_vencimento BETWEEN inicio AND fim
```

### Lucro
```sql
receita - despesas_pagas
```

### Margem Percentual
```sql
((receita - despesas_pagas) / receita) * 100
```

## 🎯 Próximos Passos (Task 3 - Opcional)

### Melhorias Futuras
- 📈 **Gráficos**: Receita x Despesa por mês
- 📊 **Comparação**: Variação % em relação ao período anterior
- 📄 **Exportação**: PDF/Excel dos relatórios
- 🏷️ **Categorias**: Gráficos de categorias de despesa
- 🔄 **Tempo Real**: Atualização automática dos dados

### Implementação Sugerida
1. **Gráficos**: Usar `recharts` ou `chart.js` (já instalados)
2. **Exportação**: Usar `@react-pdf/renderer` (já instalado)
3. **Comparação**: Criar função SQL para período anterior
4. **Tempo Real**: Implementar subscriptions do Supabase

## 🐛 Troubleshooting

### Problemas Comuns

1. **Cards não aparecem**
   - Verificar se as views SQL foram criadas
   - Verificar se há dados nas tabelas vendas/contas_pagar

2. **Valores zerados**
   - Verificar se o filtro de período está correto
   - Verificar se há vendas/contas no período selecionado

3. **Erro de permissão**
   - Verificar RLS (Row Level Security) nas tabelas
   - Verificar se o usuário tem acesso à empresa

4. **Navegação não funciona**
   - Verificar se a rota `/financeiro/dashboard` existe
   - Verificar se o componente está importado corretamente

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do console do navegador
2. Verificar logs do Supabase
3. Verificar se todas as dependências estão instaladas
4. Verificar se o SQL foi aplicado corretamente

---

**✅ Task 1 e Task 2 concluídas com sucesso!**

O sistema de snapshot financeiro está pronto para uso, seguindo todos os padrões visuais e funcionais do sistema existente.
