/**
 * Busca dados específicos para usuários do financeiro
 */
import { createAdminClient } from '../supabaseClient';
import { DadosFinanceiro } from './types';

export async function getFinanceiroData(empresaId: string): Promise<DadosFinanceiro | null> {
  try {
    const supabase = createAdminClient();
    
    // Buscar todas as contas a pagar da empresa
    const { data: contas, error: contasError } = await supabase
      .from('contas_pagar')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });
    
    if (contasError) {
      console.error('❌ Erro ao buscar contas a pagar:', contasError);
      return null;
    }

    const hoje = new Date().toISOString().split('T')[0];
    
    // Calcular totais
    const total = contas?.length || 0;
    const pendentes = contas?.filter(c => c.status === 'pendente').length || 0;
    const pagas = contas?.filter(c => c.status === 'pago').length || 0;
    const vencidas = contas?.filter(c => 
      c.status !== 'pago' && c.data_vencimento < hoje
    ).length || 0;
    
    const valorTotal = contas?.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0) || 0;
    const valorPendente = contas
      ?.filter(c => c.status === 'pendente')
      .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0) || 0;
    const valorPago = contas
      ?.filter(c => c.status === 'pago')
      .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0) || 0;
    const valorVencido = contas
      ?.filter(c => c.status !== 'pago' && c.data_vencimento < hoje)
      .reduce((sum, c) => sum + parseFloat(c.valor || 0), 0) || 0;
    
    // Próximas a vencer (próximos 7 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 7);
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];
    
    const proximasVencer = contas
      ?.filter(c => 
        c.status === 'pendente' && 
        c.data_vencimento >= hoje && 
        c.data_vencimento <= dataLimiteStr
      )
      .slice(0, 5)
      .map(c => ({
        descricao: c.descricao || 'Sem descrição',
        valor: parseFloat(c.valor || 0),
        vencimento: c.data_vencimento,
        fornecedor: c.fornecedor || undefined
      })) || [];
    
    // Buscar resumo mensal (mês atual)
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const { data: despesasMes } = await supabase
      .from('contas_pagar')
      .select('valor')
      .eq('empresa_id', empresaId)
      .gte('data_vencimento', `${mesAtual}-01`)
      .lt('data_vencimento', `${mesAtual}-32`);
    
    const totalDespesasMes = despesasMes?.reduce((sum, d) => sum + parseFloat(d.valor || 0), 0) || 0;
    
    // Buscar receita do mês (vendas finalizadas)
    const { data: vendasMes } = await supabase
      .from('vendas')
      .select('total')
      .eq('empresa_id', empresaId)
      .eq('status', 'finalizada')
      .gte('created_at', `${mesAtual}-01`)
      .lt('created_at', `${mesAtual}-32`);
    
    const receitaMes = vendasMes?.reduce((sum, v) => sum + parseFloat(v.total || 0), 0) || 0;
    const lucroMes = receitaMes - totalDespesasMes;
    
    return {
      contasAPagar: {
        total,
        pendentes,
        pagas,
        vencidas,
        valorTotal,
        valorPendente,
        valorPago,
        valorVencido,
        proximasVencer
      },
      resumoMensal: {
        receita: receitaMes,
        despesas: totalDespesasMes,
        lucro: lucroMes
      }
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do financeiro:', error);
    return null;
  }
}

