/**
 * Busca dados específicos para administradores
 */
import { createAdminClient } from '../supabaseClient';
import { DadosAdmin } from './types';

export async function getAdminData(empresaId: string): Promise<DadosAdmin | null> {
  try {
    const supabase = createAdminClient();
    
    // Resumo geral de OS
    const { data: todasOS } = await supabase
      .from('ordens_servico')
      .select('id, status, created_at')
      .eq('empresa_id', empresaId);
    
    const totalOS = todasOS?.length || 0;
    const osAbertas = todasOS?.filter(
      os => !['FINALIZADA', 'CANCELADA'].includes(os.status)
    ).length || 0;
    const osFechadas = todasOS?.filter(
      os => ['FINALIZADA', 'CANCELADA'].includes(os.status)
    ).length || 0;
    
    // Total de técnicos
    const { data: tecnicos } = await supabase
      .from('usuarios')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('nivel', 'tecnico');
    
    const totalTecnicos = tecnicos?.length || 0;
    
    // Total de clientes
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', empresaId);
    
    const totalClientes = clientes?.length || 0;
    
    // Dados financeiros do mês atual
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
    const hoje = new Date().toISOString().split('T')[0];
    
    // Receita do mês (vendas finalizadas)
    const { data: vendasMes } = await supabase
      .from('vendas')
      .select('total')
      .eq('empresa_id', empresaId)
      .eq('status', 'finalizada')
      .gte('created_at', `${mesAtual}-01`)
      .lt('created_at', `${mesAtual}-32`);
    
    const receitaMes = vendasMes?.reduce((sum, v) => sum + parseFloat(v.total || 0), 0) || 0;
    
    // Despesas do mês
    const { data: despesasMes } = await supabase
      .from('contas_pagar')
      .select('valor')
      .eq('empresa_id', empresaId)
      .gte('data_vencimento', `${mesAtual}-01`)
      .lt('data_vencimento', `${mesAtual}-32`);
    
    const totalDespesasMes = despesasMes?.reduce((sum, d) => sum + parseFloat(d.valor || 0), 0) || 0;
    const lucroMes = receitaMes - totalDespesasMes;
    
    // Contas vencidas
    const { data: contasVencidas } = await supabase
      .from('contas_pagar')
      .select('valor')
      .eq('empresa_id', empresaId)
      .neq('status', 'pago')
      .lt('data_vencimento', hoje);
    
    const totalContasVencidas = contasVencidas?.length || 0;
    const valorVencido = contasVencidas?.reduce((sum, c) => sum + parseFloat(c.valor || 0), 0) || 0;
    
    // OS urgentes (abertas há mais de 15 dias)
    const quinzeDiasAtras = new Date();
    quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
    
    const { data: osUrgentes } = await supabase
      .from('ordens_servico')
      .select(`
        numero_os,
        status,
        created_at,
        clientes!cliente_id(nome)
      `)
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(FINALIZADA,CANCELADA)')
      .lt('created_at', quinzeDiasAtras.toISOString())
      .order('created_at', { ascending: true })
      .limit(5);
    
    const urgentes = osUrgentes?.map((os: any) => {
      const diasAberta = Math.floor(
        (new Date().getTime() - new Date(os.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      return {
        numero_os: os.numero_os,
        cliente: os.clientes?.nome || 'N/A',
        status: os.status,
        diasAberta
      };
    }) || [];
    
    return {
      resumoGeral: {
        totalOS,
        osAbertas,
        osFechadas,
        totalTecnicos,
        totalClientes
      },
      financeiro: {
        receitaMes,
        despesasMes: totalDespesasMes,
        lucroMes,
        contasVencidas: totalContasVencidas,
        valorVencido
      },
      osUrgentes: urgentes
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do admin:', error);
    return null;
  }
}

