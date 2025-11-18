import { createAdminClient } from './supabaseClient';
import { getComissoesTecnico } from './whatsapp-commands';

/**
 * Busca dados completos do técnico para contexto do ChatGPT
 * @param tecnicoId - ID do técnico na tabela usuarios (não auth_user_id)
 */
export async function getTecnicoDataForContext(tecnicoId: string) {
  try {
    const supabase = createAdminClient();
    
    // Primeiro, buscar o auth_user_id do técnico
    const { data: tecnicoInfo, error: tecnicoError } = await supabase
      .from('usuarios')
      .select('auth_user_id')
      .eq('id', tecnicoId)
      .single();
    
    if (tecnicoError || !tecnicoInfo?.auth_user_id) {
      console.error('❌ Erro ao buscar auth_user_id do técnico:', tecnicoError);
      return null;
    }
    
    const authUserId = tecnicoInfo.auth_user_id;
    
    // Buscar comissões
    const { comissoes, total, totalPago, totalPendente } = await getComissoesTecnico(tecnicoId, 10);
    
    // Buscar OS pendentes (usando auth_user_id como tecnico_id)
    const { data: osPendentes, error: osError } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        status,
        status_tecnico,
        servico,
        problema_relatado,
        clientes!cliente_id(nome, telefone)
      `)
      .eq('tecnico_id', authUserId)
      .in('status', ['ORÇAMENTO', 'AGUARDANDO APROVAÇÃO', 'EM ANDAMENTO', 'AGUARDANDO PEÇAS'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (osError) {
      console.error('❌ Erro ao buscar OS pendentes:', osError);
    }
    
    // Buscar OS recentes (últimas 5)
    const { data: osRecentes } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        status,
        status_tecnico,
        servico,
        clientes!cliente_id(nome)
      `)
      .eq('tecnico_id', authUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Contar OS por status
    const { data: osPorStatus } = await supabase
      .from('ordens_servico')
      .select('status')
      .eq('tecnico_id', authUserId);
    
    const contagemStatus: Record<string, number> = {};
    (osPorStatus || []).forEach((os: any) => {
      const status = os.status || 'SEM STATUS';
      contagemStatus[status] = (contagemStatus[status] || 0) + 1;
    });
    
    return {
      comissoes: {
        total: total,
        totalPago: totalPago,
        totalPendente: totalPendente,
        ultimas: comissoes.slice(0, 5).map(c => ({
          numero_os: c.numero_os,
          cliente: c.cliente_nome,
          valor: c.valor_comissao,
          status: c.status,
          data: c.data_entrega
        }))
      },
      osPendentes: (osPendentes || []).map((os: any) => ({
        numero_os: os.numero_os,
        cliente: os.clientes?.nome || 'N/A',
        servico: os.servico || 'N/A',
        status: os.status,
        status_tecnico: os.status_tecnico
      })),
      osRecentes: (osRecentes || []).map((os: any) => ({
        numero_os: os.numero_os,
        cliente: os.clientes?.nome || 'N/A',
        status: os.status,
        status_tecnico: os.status_tecnico
      })),
      contagemStatus,
      totalOSPendentes: (osPendentes || []).length,
      totalOS: (osPorStatus || []).length
    };
  } catch (error) {
    console.error('❌ Erro ao buscar dados do técnico:', error);
    return null;
  }
}

