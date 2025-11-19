/**
 * Busca dados específicos para atendentes
 */
import { createAdminClient } from '../supabaseClient';
import { DadosAtendente } from './types';

export async function getAtendenteData(empresaId: string): Promise<DadosAtendente | null> {
  try {
    const supabase = createAdminClient();
    
    // Buscar OS abertas (não finalizadas/canceladas)
    const { data: osAbertas, error: osError } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        status,
        clientes!cliente_id(nome),
        usuarios!tecnico_id(nome)
      `)
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(FINALIZADA,CANCELADA)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (osError) {
      console.error('❌ Erro ao buscar OS abertas:', osError);
    }
    
    const total = osAbertas?.length || 0;
    const aguardandoAprovacao = osAbertas?.filter(
      os => os.status === 'AGUARDANDO APROVAÇÃO'
    ).length || 0;
    const emAndamento = osAbertas?.filter(
      os => os.status === 'EM ANDAMENTO'
    ).length || 0;
    
    const ultimas = osAbertas?.slice(0, 5).map((os: any) => ({
      numero_os: os.numero_os,
      cliente: os.clientes?.nome || 'N/A',
      status: os.status,
      tecnico: os.usuarios?.nome || undefined
    })) || [];
    
    // Buscar clientes recentes (últimos 30 dias)
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
    
    const { data: clientesRecentes } = await supabase
      .from('clientes')
      .select(`
        id,
        nome,
        telefone,
        ordens_servico(numero_os)
      `)
      .eq('empresa_id', empresaId)
      .gte('created_at', trintaDiasAtras.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);
    
    const clientes = clientesRecentes?.map((c: any) => ({
      nome: c.nome,
      telefone: c.telefone || undefined,
      ultimaOS: c.ordens_servico?.[0]?.numero_os || undefined
    })) || [];
    
    return {
      osAbertas: {
        total,
        aguardandoAprovacao,
        emAndamento,
        ultimas
      },
      clientesRecentes: clientes
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar dados do atendente:', error);
    return null;
  }
}

