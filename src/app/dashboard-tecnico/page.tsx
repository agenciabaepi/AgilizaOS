'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import { getDashboardPath, canAccessRoute } from '@/lib/dashboardRouting';

import { 
  FiClock, 
  FiDollarSign, 
  FiTool, 
  FiTrendingUp, 
  FiFileText, 
  FiCheckCircle, 
  FiAlertCircle,
  FiUser, 
  FiPhone as FiPhoneIcon,
  FiCalendar,
  FiAward,
  FiBarChart,
  FiZap
} from 'react-icons/fi';

interface TecnicoMetrics {
  totalOS: number;
  osEmAndamento: number;
  osPendentes: number;
  osConcluidas: number;
  osAguardandoOrcamento: number;
  osAguardandoLaudo: number;
  receitaTotal: number;
  receitaMes: number;
  comissaoTotal: number;
  comissaoMes: number;
  tempoMedioConclusao: number;
  osConcluidasMes: number;
  osConcluidasSemana: number;
  rankingTecnico: number;
  satisfacaoMedia: number;
  osUrgentes: number;
  osAtrasadas: number;
}

export default function DashboardTecnicoPage() {
  const router = useRouter();
  const { user, usuarioData, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<TecnicoMetrics>({
    totalOS: 0,
    osEmAndamento: 0,
    osPendentes: 0,
    osConcluidas: 0,
    osAguardandoOrcamento: 0,
    osAguardandoLaudo: 0,
    receitaTotal: 0,
    receitaMes: 0,
    comissaoTotal: 0,
    comissaoMes: 0,
    tempoMedioConclusao: 0,
    osConcluidasMes: 0,
    osConcluidasSemana: 0,
    rankingTecnico: 0,
    satisfacaoMedia: 0,
    osUrgentes: 0,
    osAtrasadas: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentOS, setRecentOS] = useState<Record<string, unknown>[]>([]);
  const [osPendentesAcao, setOsPendentesAcao] = useState<Record<string, unknown>[]>([]);
  const [dataFetched, setDataFetched] = useState(false);

  const fetchTecnicoData = useCallback(async () => {
    if (!user || !usuarioData?.empresa_id || dataFetched) return;

    setLoading(true);
    try {
      const empresaId = usuarioData.empresa_id;
      const tecnicoId = user.id;
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      // Buscar OSs atribuídas ao técnico
      // Tentar buscar com ambos os IDs possíveis (auth_user_id e usuarios.id)
      // Usar .in() para buscar por qualquer um dos IDs
      const idsParaBuscar = [tecnicoId];
      if (usuarioData?.id && usuarioData.id !== tecnicoId) {
        idsParaBuscar.push(usuarioData.id);
      }
      
      console.log('🔍 Dashboard Técnico - Buscando OSs com IDs:', {
        tecnicoId: tecnicoId,
        usuarioDataId: usuarioData?.id,
        idsParaBuscar: idsParaBuscar,
        empresaId: empresaId
      });
      
      let { data: ordens, error: ordensError } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          status,
          status_tecnico,
          valor_faturado,
          valor_total,
          valor_peca,
          valor_servico,
          created_at,
          data_entrega,
          prazo_entrega,
          tecnico_id,
          cliente_id,
          servico,
          observacoes,
          orcamento,
          laudo,
          prioridade
        `)
        .eq('empresa_id', empresaId)
        .in('tecnico_id', idsParaBuscar)
        .order('created_at', { ascending: false });

      // Se não encontrou nada, tentar buscar todas as OSs da empresa para debug
      if ((!ordens || ordens.length === 0)) {
        console.log('⚠️ Nenhuma OS encontrada com os IDs fornecidos. Buscando todas as OSs da empresa para debug...');
        const { data: todasOS, error: todasOSError } = await supabase
          .from('ordens_servico')
          .select('id, numero_os, tecnico_id, status')
          .eq('empresa_id', empresaId)
          .limit(10);
        
        if (todasOS && todasOS.length > 0) {
          console.log('📋 Amostra de OSs da empresa (primeiras 10):', todasOS.map((os: any) => ({
            numero_os: os.numero_os,
            tecnico_id: os.tecnico_id,
            status: os.status,
            tecnico_id_tipo: typeof os.tecnico_id,
            match_auth_user: os.tecnico_id === tecnicoId,
            match_usuarios_id: os.tecnico_id === usuarioData?.id
          })));
        }
      }
      
      // Log para debug
      console.log('📊 Dashboard Técnico - Resultado da busca:', {
        totalEncontradas: ordens?.length || 0,
        tecnicoId: tecnicoId,
        usuarioDataId: usuarioData?.id,
        empresaId: empresaId,
        temErro: !!ordensError,
        erroDetalhes: ordensError ? {
          message: ordensError.message,
          code: ordensError.code,
          details: ordensError.details
        } : null,
        amostraOSs: ordens?.slice(0, 3).map((o: any) => ({
          numero_os: o.numero_os,
          status: o.status,
          tecnico_id: o.tecnico_id,
          tecnico_id_tipo: typeof o.tecnico_id
        }))
      });

      // Buscar dados dos clientes separadamente se houver OSs
      // Verificar se ordensError é um erro real (não apenas objeto vazio)
      const temErroReal = ordensError && (ordensError.message || ordensError.code || ordensError.details);
      
      if (ordens && ordens.length > 0 && !temErroReal) {
        const clienteIds = [...new Set(ordens.map((o: any) => o.cliente_id).filter(Boolean))];
        if (clienteIds.length > 0) {
          const { data: clientesData } = await supabase
            .from('clientes')
            .select('id, nome, telefone, email')
            .in('id', clienteIds);
          
          // Adicionar dados dos clientes às OSs
          if (clientesData) {
            const clientesMap = new Map(clientesData.map((c: any) => [c.id, c]));
            ordens = ordens.map((os: any) => ({
              ...os,
              clientes: clientesMap.get(os.cliente_id) || null
            }));
          }
        }
      }

      // Verificar se há erro real (não apenas objeto vazio)
      // Se ordensError existe mas está vazio, apenas continuar sem logar
      if (ordensError && (ordensError.message || ordensError.code || ordensError.details)) {
        // Log detalhado do erro apenas se houver informações reais
        const errorInfo = {
          message: ordensError?.message || 'Erro desconhecido',
          details: ordensError?.details || 'Sem detalhes',
          hint: ordensError?.hint || 'Sem dica',
          code: ordensError?.code || 'Sem código',
          tecnicoId: tecnicoId,
          empresaId: empresaId,
          usuarioDataId: usuarioData?.id
        };
        
        // Usar console.log em vez de console.error/warn para evitar supressão
        console.log('⚠️ [Dashboard Técnico] Erro ao buscar OSs (continuando com dados vazios):', JSON.stringify(errorInfo, null, 2));
      }
      
      // Garantir que ordens seja um array válido
      if (!ordens) {
        ordens = [];
      }

      const ordensData = ordens || [];
      const hojeTimestamp = hoje.getTime();

      // Função auxiliar para normalizar status
      const normalizarStatus = (status: string | null | undefined): string => {
        if (!status) return '';
        return String(status).toUpperCase().trim().replace(/_/g, ' ');
      };

      // Log para debug
      console.log('📊 Dashboard Técnico - Dados carregados:', {
        totalOS: ordensData.length,
        tecnicoId: tecnicoId,
        empresaId: empresaId,
        amostraStatus: ordensData.slice(0, 3).map((o: Record<string, unknown>) => ({
          numero_os: o.numero_os,
          status: o.status,
          status_tecnico: o.status_tecnico
        }))
      });

      // Calcular métricas com comparação flexível de status
      const totalOS = ordensData.length;
      const osEmAndamento = ordensData.filter((o: Record<string, unknown>) => {
        const status = normalizarStatus(String(o.status));
        return status.includes('ANÁLISE') || status.includes('ANALISE') || 
               status.includes('REPARO') || status.includes('EXECUÇÃO') || 
               status.includes('EXECUCAO');
      }).length;
      const osPendentes = ordensData.filter((o: Record<string, unknown>) => {
        const status = normalizarStatus(String(o.status));
        return status === 'PENDENTE' || status === 'ABERTA' || status.includes('AGUARDANDO');
      }).length;
      const osConcluidas = ordensData.filter((o: Record<string, unknown>) => {
        const status = normalizarStatus(String(o.status));
        return status.includes('CONCLUID') || status.includes('FINALIZAD') || 
               status.includes('ENTREGUE') || status === 'FATURADO';
      }).length;

      // OSs aguardando orçamento (técnico precisa criar)
      const osAguardandoOrcamento = ordensData.filter((o: Record<string, unknown>) => {
        const statusTecnico = normalizarStatus(String(o.status_tecnico || ''));
        const status = normalizarStatus(String(o.status || ''));
        const temOrcamento = o.orcamento && String(o.orcamento).trim() !== '';
        return !temOrcamento && (
          statusTecnico.includes('AGUARDANDO ORÇAMENTO') || 
          statusTecnico.includes('ORÇAMENTO') ||
          statusTecnico.includes('ANÁLISE') ||
          statusTecnico.includes('ANALISE') ||
          (status.includes('ANÁLISE') || status.includes('ANALISE'))
        );
      }).length;

      // OSs aguardando laudo (técnico precisa criar)
      const osAguardandoLaudo = ordensData.filter((o: Record<string, unknown>) => {
        const statusTecnico = normalizarStatus(String(o.status_tecnico || ''));
        const status = normalizarStatus(String(o.status || ''));
        const temOrcamento = o.orcamento && String(o.orcamento).trim() !== '';
        const temLaudo = o.laudo && String(o.laudo).trim() !== '';
        return temOrcamento && !temLaudo && (
          statusTecnico.includes('APROVADO') ||
          statusTecnico.includes('AGUARDANDO LAUDO') ||
          statusTecnico.includes('LAUDO') ||
          (status.includes('REPARO') || status.includes('EXECUÇÃO') || status.includes('EXECUCAO'))
        );
      }).length;

      // Receita
      const receitaTotal = ordensData.reduce((sum, os: Record<string, unknown>) => 
        sum + (Number(os.valor_faturado) || 0), 0
      );
      const receitaMes = ordensData
        .filter((o: Record<string, unknown>) => {
          const dataOS = new Date(String(o.created_at));
          return dataOS >= inicioMes;
        })
        .reduce((sum, os: Record<string, unknown>) => 
          sum + (Number(os.valor_faturado) || 0), 0
        );

      // Buscar configuração de comissão real
      let percentualComissao = 0.10; // Padrão se não encontrar
      try {
        const { data: configComissao } = await supabase
          .from('configuracoes_comissao')
          .select('comissao_padrao')
          .eq('empresa_id', empresaId)
          .single();
        
        if (configComissao?.comissao_padrao) {
          percentualComissao = configComissao.comissao_padrao / 100; // Converter de % para decimal
        } else {
          // Tentar buscar comissão específica do técnico usando auth_user_id
          const { data: tecnicoData } = await supabase
            .from('usuarios')
            .select('comissao_percentual')
            .eq('auth_user_id', tecnicoId) // tecnicoId é o user.id (auth_user_id)
            .single();
          
          if (tecnicoData?.comissao_percentual) {
            percentualComissao = tecnicoData.comissao_percentual / 100;
          }
        }
      } catch (error) {
        console.warn('Erro ao buscar configuração de comissão, usando padrão:', error);
      }
      
      const comissaoTotal = receitaTotal * percentualComissao;
      const comissaoMes = receitaMes * percentualComissao;

      // OSs concluídas
      const osConcluidasData = ordensData.filter((o: Record<string, unknown>) => {
        const status = normalizarStatus(String(o.status));
        return status.includes('CONCLUID') || status.includes('FINALIZAD') || 
               status.includes('ENTREGUE') || status === 'FATURADO';
      });
      const osConcluidasMes = osConcluidasData.filter((o: Record<string, unknown>) => {
        const dataOS = new Date(String(o.created_at));
        return dataOS >= inicioMes;
      }).length;
      const osConcluidasSemana = osConcluidasData.filter((o: Record<string, unknown>) => {
        const dataOS = new Date(String(o.created_at));
        return dataOS >= inicioSemana;
      }).length;

      // Tempo médio de conclusão (em dias)
      const temposConclusao = osConcluidasData
        .filter((o: Record<string, unknown>) => o.created_at && o.data_entrega)
        .map((o: Record<string, unknown>) => {
          const inicio = new Date(String(o.created_at)).getTime();
          const fim = new Date(String(o.data_entrega)).getTime();
          return (fim - inicio) / (1000 * 60 * 60 * 24); // dias
        });
      const tempoMedioConclusao = temposConclusao.length > 0
        ? temposConclusao.reduce((a, b) => a + b, 0) / temposConclusao.length
        : 0;

      // OSs urgentes e atrasadas
      const osUrgentes = ordensData.filter((o: Record<string, unknown>) => {
        const prioridade = String(o.prioridade || '').toUpperCase();
        return prioridade === 'URGENTE' || prioridade === 'ALTA';
      }).length;

      const osAtrasadas = ordensData.filter((o: Record<string, unknown>) => {
        if (!o.prazo_entrega) return false;
        const prazo = new Date(String(o.prazo_entrega)).getTime();
        const status = normalizarStatus(String(o.status));
        const estaConcluida = status.includes('CONCLUID') || status.includes('FINALIZAD') || 
                             status.includes('ENTREGUE') || status === 'FATURADO';
        return prazo < hojeTimestamp && !estaConcluida;
      }).length;

      // Ranking e satisfação - deixar como 0 se não houver dados reais
      // TODO: Implementar cálculo real de ranking baseado em performance
      // TODO: Implementar busca de satisfação se houver tabela de feedbacks
      const rankingTecnico = 0; // Será calculado quando houver dados de ranking
      const satisfacaoMedia = 0; // Será calculado quando houver dados de feedback

      setMetrics({
        totalOS,
        osEmAndamento,
        osPendentes,
        osConcluidas,
        osAguardandoOrcamento,
        osAguardandoLaudo,
        receitaTotal,
        receitaMes,
        comissaoTotal,
        comissaoMes,
        tempoMedioConclusao,
        osConcluidasMes,
        osConcluidasSemana,
        rankingTecnico,
        satisfacaoMedia,
        osUrgentes,
        osAtrasadas
      });

      // OSs recentes (últimas 5)
      setRecentOS(ordensData.slice(0, 5));

      // OSs que precisam de ação do técnico
      const osPendentesAcaoData = ordensData.filter((o: Record<string, unknown>) => {
        const statusTecnico = normalizarStatus(String(o.status_tecnico || ''));
        const status = normalizarStatus(String(o.status || ''));
        const temOrcamento = o.orcamento && String(o.orcamento).trim() !== '';
        const temLaudo = o.laudo && String(o.laudo).trim() !== '';
        
        // Precisa de orçamento
        const precisaOrcamento = !temOrcamento && (
          statusTecnico.includes('AGUARDANDO ORÇAMENTO') ||
          statusTecnico.includes('ORÇAMENTO') ||
          statusTecnico.includes('ANÁLISE') ||
          statusTecnico.includes('ANALISE') ||
          (status.includes('ANÁLISE') || status.includes('ANALISE'))
        );
        
        // Precisa de laudo
        const precisaLaudo = temOrcamento && !temLaudo && (
          statusTecnico.includes('APROVADO') ||
          statusTecnico.includes('AGUARDANDO LAUDO') ||
          statusTecnico.includes('LAUDO') ||
          (status.includes('REPARO') || status.includes('EXECUÇÃO') || status.includes('EXECUCAO'))
        );
        
        return precisaOrcamento || precisaLaudo;
      });
      setOsPendentesAcao(osPendentesAcaoData.slice(0, 6));

      setDataFetched(true);
      
    } catch (error) {
      console.error('Erro ao buscar dados do técnico:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tecnicoId: user?.id,
        empresaId: usuarioData?.empresa_id,
        usuarioDataId: usuarioData?.id
      });
      // Garantir que os estados sejam resetados mesmo em caso de erro
      setMetrics({
        totalOS: 0,
        osEmAndamento: 0,
        osPendentes: 0,
        osConcluidas: 0,
        osAguardandoOrcamento: 0,
        osAguardandoLaudo: 0,
        receitaTotal: 0,
        receitaMes: 0,
        comissaoTotal: 0,
        comissaoMes: 0,
        tempoMedioConclusao: 0,
        osConcluidasMes: 0,
        osConcluidasSemana: 0,
        rankingTecnico: 0,
        satisfacaoMedia: 0,
        osUrgentes: 0,
        osAtrasadas: 0
      });
      setRecentOS([]);
      setOsPendentesAcao([]);
    } finally {
      setLoading(false);
    }
  }, [user, usuarioData?.empresa_id, dataFetched]);

  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    // Aguardar carregamento do auth
    if (authLoading) return;
    
    // Se não tem dados do usuário ainda, aguardar
    if (!usuarioData) return;
    
    // Verificar se o usuário tem permissão para acessar esta dashboard ANTES de renderizar
    if (usuarioData.nivel) {
      if (!canAccessRoute(usuarioData, '/dashboard-tecnico')) {
        const correctPath = getDashboardPath(usuarioData);
        // Redirecionar imediatamente sem renderizar conteúdo
        router.replace(correctPath);
        return;
      }
    }
    
    // Se chegou aqui, tem permissão - marcar como verificado
    setPermissionChecked(true);
    
    // Só buscar dados se não estiver carregando e tiver os dados necessários
    if (user && usuarioData?.empresa_id && !dataFetched) {
      fetchTecnicoData();
    }
  }, [authLoading, user, usuarioData, router, fetchTecnicoData, dataFetched]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper.includes('CONCLUID') || statusUpper.includes('FINALIZAD')) {
      return 'text-green-600 bg-green-100';
    }
    if (statusUpper.includes('ANÁLISE') || statusUpper.includes('REPARO')) {
      return 'text-yellow-600 bg-yellow-100';
    }
    if (statusUpper.includes('PENDENTE')) {
      return 'text-blue-600 bg-blue-100';
    }
    if (statusUpper.includes('URGENTE')) {
      return 'text-red-600 bg-red-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  // Não renderizar nada até verificar permissão
  if (authLoading || !permissionChecked) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </MenuLayout>
    );
  }

  if (loading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="w-full min-h-screen bg-gray-50 pb-4">
        <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 pt-4 md:pt-6 space-y-4 md:space-y-6">
        {/* Header - Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard Técnico</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Bem-vindo, {usuarioData?.nome}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs md:text-sm text-gray-500">Última atualização</p>
            <p className="text-xs md:text-sm font-medium">{new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Métricas Principais - Grid Responsivo */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {/* OSs em Andamento */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Em Andamento</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{metrics.osEmAndamento}</p>
              </div>
              <div className="p-2 md:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                <FiTool className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm">
              <FiTrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500 mr-1" />
              <span className="text-green-600 truncate">{metrics.totalOS} total</span>
            </div>
          </div>

          {/* OSs Concluídas */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Concluídas</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{metrics.osConcluidas}</p>
              </div>
              <div className="p-2 md:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                <FiCheckCircle className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm">
              <FiTrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500 mr-1" />
              <span className="text-green-600 truncate">+{metrics.osConcluidasMes} este mês</span>
            </div>
          </div>

          {/* Receita Total */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Receita Total</p>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 truncate">
                  {formatCurrency(metrics.receitaTotal)}
                </p>
              </div>
              <div className="p-2 md:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                <FiDollarSign className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm">
              <FiCalendar className="w-3 h-3 md:w-4 md:h-4 text-purple-500 mr-1" />
              <span className="text-purple-600 truncate">{formatCurrency(metrics.receitaMes)} este mês</span>
            </div>
          </div>

          {/* Comissões */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-600 truncate">Comissões</p>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 truncate">
                  {formatCurrency(metrics.comissaoTotal)}
                </p>
              </div>
              <div className="p-2 md:p-3 bg-yellow-100 rounded-full flex-shrink-0 ml-2">
                <FiAward className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-2 md:mt-4 flex items-center text-xs md:text-sm">
              <FiTrendingUp className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 mr-1" />
              <span className="text-yellow-600 truncate">{formatCurrency(metrics.comissaoMes)} este mês</span>
            </div>
          </div>
        </div>

        {/* Alertas - Responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* OSs Pendentes de Ação */}
          {metrics.osAguardandoOrcamento > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg md:rounded-xl shadow-sm border border-orange-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="p-2 md:p-3 bg-orange-100 rounded-full">
                    <FiFileText className="w-4 h-4 md:w-6 md:h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-orange-900">Orçamentos Pendentes</h3>
                    <p className="text-xs md:text-sm text-orange-600">Precisam de ação</p>
                  </div>
                </div>
                <div className="bg-orange-100 px-2 md:px-3 py-1 rounded-full">
                  <span className="text-orange-800 font-semibold text-sm md:text-base">{metrics.osAguardandoOrcamento}</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/bancada')}
                className="mt-3 w-full px-3 md:px-4 py-2 bg-orange-600 text-white rounded-md text-xs md:text-sm hover:bg-orange-700 transition-colors"
              >
                Ver OSs
              </button>
            </div>
          )}

          {/* OSs Aguardando Laudo */}
          {metrics.osAguardandoLaudo > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg md:rounded-xl shadow-sm border border-blue-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="p-2 md:p-3 bg-blue-100 rounded-full">
                    <FiCheckCircle className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-blue-900">Laudos Pendentes</h3>
                    <p className="text-xs md:text-sm text-blue-600">Aguardando finalização</p>
                  </div>
                </div>
                <div className="bg-blue-100 px-2 md:px-3 py-1 rounded-full">
                  <span className="text-blue-800 font-semibold text-sm md:text-base">{metrics.osAguardandoLaudo}</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/bancada')}
                className="mt-3 w-full px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md text-xs md:text-sm hover:bg-blue-700 transition-colors"
              >
                Ver OSs
              </button>
            </div>
          )}

          {/* OSs Urgentes/Atrasadas */}
          {(metrics.osUrgentes > 0 || metrics.osAtrasadas > 0) && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg md:rounded-xl shadow-sm border border-red-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="p-2 md:p-3 bg-red-100 rounded-full">
                    <FiAlertCircle className="w-4 h-4 md:w-6 md:h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-red-900">Atenção</h3>
                    <p className="text-xs md:text-sm text-red-600">
                      {metrics.osUrgentes} urgentes, {metrics.osAtrasadas} atrasadas
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => router.push('/bancada')}
                className="mt-3 w-full px-3 md:px-4 py-2 bg-red-600 text-white rounded-md text-xs md:text-sm hover:bg-red-700 transition-colors"
              >
                Ver OSs
              </button>
            </div>
          )}
        </div>

        {/* Métricas Secundárias - Responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {/* Performance */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Performance</h3>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Tempo Médio</span>
                <span className="text-sm md:text-lg font-semibold text-gray-900">
                  {metrics.tempoMedioConclusao > 0 
                    ? `${Math.round(metrics.tempoMedioConclusao)} dias`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Ranking</span>
                <span className="text-sm md:text-lg font-semibold text-purple-600">#{metrics.rankingTecnico}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Satisfação</span>
                <span className="text-sm md:text-lg font-semibold text-yellow-600">{metrics.satisfacaoMedia.toFixed(1)}/5</span>
              </div>
            </div>
          </div>

          {/* Esta Semana */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Esta Semana</h3>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Concluídas</span>
                <span className="text-sm md:text-lg font-semibold text-green-600">{metrics.osConcluidasSemana}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Em Andamento</span>
                <span className="text-sm md:text-lg font-semibold text-blue-600">{metrics.osEmAndamento}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Pendentes</span>
                <span className="text-sm md:text-lg font-semibold text-yellow-600">{metrics.osPendentes}</span>
              </div>
            </div>
          </div>

          {/* Status das OSs */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Status das OSs</h3>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Pendentes</span>
                <span className="text-sm md:text-lg font-semibold text-blue-600">{metrics.osPendentes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Em Andamento</span>
                <span className="text-sm md:text-lg font-semibold text-yellow-600">{metrics.osEmAndamento}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-600">Concluídas</span>
                <span className="text-sm md:text-lg font-semibold text-green-600">{metrics.osConcluidas}</span>
              </div>
            </div>
          </div>
        </div>

        {/* OSs que Precisam de Ação */}
        {osPendentesAcao.length > 0 && (
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">OSs que Precisam de Ação</h3>
              <button
                onClick={() => router.push('/bancada')}
                className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todas →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {osPendentesAcao.map((os) => {
                const precisaOrcamento = !os.orcamento;
                const precisaLaudo = os.orcamento && !os.laudo;
                
                return (
                  <div
                    key={String(os.id)}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 md:p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => router.push(`/ordens/${os.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm md:text-base text-gray-900 truncate">
                          OS #{String(os.numero_os)}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600 truncate mt-1">
                          {String((os.clientes as any)?.nome || 'Cliente não informado')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                        precisaOrcamento 
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {precisaOrcamento ? 'Orçamento' : 'Laudo'}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <FiClock className="w-3 h-3 mr-1" />
                      <span>{formatDate(String(os.created_at))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* OSs Recentes */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">OSs Recentes</h3>
            <button
              onClick={() => router.push('/ordens')}
              className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas →
            </button>
          </div>
          <div className="space-y-2 md:space-y-3">
            {recentOS.map((os) => (
              <div
                key={String(os.id)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => router.push(`/ordens/${os.id}`)}
              >
                <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                  <p className="font-medium text-sm md:text-base text-gray-900 truncate">
                    OS #{String(os.numero_os)}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 truncate mt-1">
                    {String((os.clientes as any)?.nome || 'Não informado')}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(String(os.status))}`}>
                    {String(os.status)}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(String(os.created_at))}
                  </span>
                </div>
              </div>
            ))}
            {recentOS.length === 0 && (
              <p className="text-gray-500 text-center py-4 text-sm md:text-base">Nenhuma OS encontrada</p>
            )}
          </div>
        </div>
        </div>
      </div>
    </MenuLayout>
  );
}

