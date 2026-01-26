'use client';

import MenuLayout from '@/components/MenuLayout';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import { useRouter } from 'next/navigation';
import { FiCpu, FiEye, FiBell, FiCheckCircle, FiClock, FiTool, FiPackage, FiPaperclip, FiAlertCircle } from 'react-icons/fi';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import VisualizarOSModal from '@/components/VisualizarOSModal';
import { useToast } from '@/components/Toast';

export default function BancadaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);
  
  // Estados para abas e notificações
  const [activeTab, setActiveTab] = useState('pendentes');
  const [notificacoesLidas, setNotificacoesLidas] = useState<string[]>([]);

  interface OrdemServico {
    id: string;
    empresa_id: string;
    cliente_id: string;
    tecnico_id: string;
    status: string;
    created_at: string;
    atendente: string;
    tecnico: string;
    categoria: string;
    marca: string;
    modelo: string;
    cor: string;
    numero_serie: string;
    servico: string;
    qtd_servico: string;
    peca: string;
    qtd_peca: string;
    termo_garantia: string | null;
    relato: string;
    observacao: string;
    data_cadastro: string;
    numero_os: string;
    data_entrega: string | null;
    vencimento_garantia: string | null;
    valor_peca: string;
    valor_servico: string;
    desconto: string | null;
    valor_faturado: string;
    status_tecnico: string;
    acessorios: string;
    condicoes_equipamento: string;
    imagens?: string | null;
    imagens_tecnico?: string | null;
    cliente?: {
      nome: string;
      telefone?: string;
    };
    [key: string]: unknown;
  }

  interface StatusFixo {
    id: string;
    nome: string;
    tipo: string;
    [key: string]: unknown;
  }

  useEffect(() => {
    let isMounted = true;
    
    const fetchOrdens = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // ✅ SEGURANÇA: Buscar empresa_id do usuário primeiro
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('auth_user_id', user.id)
          .single();

        if (usuarioError || !usuarioData?.empresa_id) {
          console.error('Erro ao buscar dados do usuário:', usuarioError);
          addToast('error', 'Erro ao carregar dados do usuário');
          return;
        }

        // ✅ TIMEOUT: Evitar loading infinito na bancada
        const { data: ordensData, error: ordensError } = await Promise.race([
          supabase
            .from('ordens_servico')
            .select(`
              *,
              cliente:cliente_id(nome, telefone),
              status,
              status_tecnico
            `)
            .eq('empresa_id', usuarioData.empresa_id) // ✅ SEGURANÇA: Filtrar por empresa
            .or(`tecnico_id.eq.${user.id},tecnico_id.is.null`)
            .order('created_at', { ascending: false }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Bancada timeout')), 10000) // 10 segundos
          )
        ]) as any;

        if (!isMounted) return;

        if (ordensError) {
          console.error('Erro ao buscar ordens:', ordensError);
        } else {
          setOrdens(ordensData || []);
          }

      } catch (error) {
        if (isMounted) {
          console.error('Erro ao carregar dados:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    if (user && !authLoading) fetchOrdens();
    
    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);
  
  // ✅ TIMEOUT: Loading timeout para bancada
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Loading timeout na bancada - resetando após 15 segundos');
        setLoading(false);
      }
    }, 15000); // 15 segundos

    return () => clearTimeout(loadingTimeout);
  }, [loading]);
  
  // Filtros e contadores por aba
  const filteredOrdens = useMemo(() => {
    const search = searchTerm.toLowerCase();
    
    return ordens.filter((os: OrdemServico) => {
      const clienteNome = (os.cliente?.nome || '').toString().toLowerCase();
      const numeroOsStr = (os.numero_os ?? os.id ?? '').toString().toLowerCase();

      const matchesSearch =
        search === '' ||
        clienteNome.includes(search) ||
        numeroOsStr.includes(search);
        
      const matchesStatus = filtroStatus === 'Todos' || os.status === filtroStatus;
      
      // Filtro por aba - normalizar status para comparação
      const statusNormalizado = (os.status || '').toUpperCase().trim();
      let matchesTab = true;
      
      if (activeTab === 'pendentes') {
        // OS pendentes/aguardando - status de início
        // Excluir OS sem reparo, pois já foram avaliadas
        const statusSemReparo = ['SEM REPARO', 'SEM_REPARO'];
        const temSemReparo = statusSemReparo.some(s => statusNormalizado === s.toUpperCase()) ||
                             (os.status_tecnico && ['SEM REPARO', 'SEM_REPARO'].some(s => os.status_tecnico.toUpperCase().includes(s.toUpperCase())));
        
        if (temSemReparo) {
          matchesTab = false; // Não mostrar OS sem reparo na aba pendentes
        } else {
          const statusPendentes = ['ABERTA', 'EM_ANALISE', 'EM ANÁLISE', 'ORCAMENTO', 'ORÇAMENTO', 'PENDENTE', 'AGUARDANDO INÍCIO'];
          matchesTab = statusPendentes.some(s => statusNormalizado === s.toUpperCase());
        }
      } else if (activeTab === 'aprovadas') {
        // OS aprovadas - que precisam de ação do técnico
        matchesTab = statusNormalizado === 'APROVADO' || statusNormalizado === 'ORÇAMENTO APROVADO';
      } else if (activeTab === 'em_andamento') {
        // OS em andamento - incluindo status técnico
        const statusAndamento = ['EM_EXECUCAO', 'EM EXECUÇÃO', 'AGUARDANDO_PECA', 'AGUARDANDO PEÇA', 'EM ANÁLISE', 'EM_ANALISE'];
        matchesTab = statusAndamento.some(s => statusNormalizado === s.toUpperCase()) || 
                     (os.status_tecnico && ['EM ANÁLISE', 'AGUARDANDO PEÇA', 'EM EXECUÇÃO'].includes(os.status_tecnico.toUpperCase()));
      } else if (activeTab === 'concluidas') {
        // OS concluídas
        const statusConcluidas = ['CONCLUIDO', 'REPARO CONCLUÍDO', 'ENTREGUE', 'FINALIZADO', 'FATURADO'];
        matchesTab = statusConcluidas.some(s => statusNormalizado === s.toUpperCase()) ||
                     (os.status_tecnico && ['REPARO CONCLUÍDO'].includes(os.status_tecnico.toUpperCase()));
      } else if (activeTab === 'sem_reparo') {
        // OS sem reparo
        const statusSemReparo = ['SEM REPARO', 'SEM_REPARO'];
        matchesTab = statusSemReparo.some(s => statusNormalizado === s.toUpperCase()) ||
                     (os.status_tecnico && ['SEM REPARO', 'SEM_REPARO'].some(s => os.status_tecnico.toUpperCase().includes(s.toUpperCase())));
      } else if (activeTab === 'todas') {
        // Todas as OSs
        matchesTab = true;
      }
      
      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [ordens, searchTerm, filtroStatus, activeTab]);
  
  // Contadores para as abas - normalizar status para comparação
  const contadores = useMemo(() => {
    const normalizarStatus = (status: string) => (status || '').toUpperCase().trim();
    
    const pendentes = ordens.filter((os: OrdemServico) => {
      const status = normalizarStatus(os.status);
      const statusTecnico = os.status_tecnico ? normalizarStatus(os.status_tecnico) : '';
      
      // Excluir OS sem reparo do contador de pendentes
      const temSemReparo = ['SEM REPARO', 'SEM_REPARO'].some(s => status === s.toUpperCase()) ||
                           ['SEM REPARO', 'SEM_REPARO'].some(s => statusTecnico.includes(s.toUpperCase()));
      
      if (temSemReparo) {
        return false; // Não contar OS sem reparo como pendente
      }
      
      return ['ABERTA', 'EM_ANALISE', 'EM ANÁLISE', 'ORCAMENTO', 'ORÇAMENTO', 'PENDENTE', 'AGUARDANDO INÍCIO'].some(s => status === s.toUpperCase());
    }).length;
    
    const aprovadas = ordens.filter((os: OrdemServico) => {
      const status = normalizarStatus(os.status);
      return status === 'APROVADO' || status === 'ORÇAMENTO APROVADO';
    }).length;
    
    const emAndamento = ordens.filter((os: OrdemServico) => {
      const status = normalizarStatus(os.status);
      const statusTecnico = os.status_tecnico ? normalizarStatus(os.status_tecnico) : '';
      return ['EM_EXECUCAO', 'EM EXECUÇÃO', 'AGUARDANDO_PECA', 'AGUARDANDO PEÇA', 'EM ANÁLISE', 'EM_ANALISE'].some(s => status === s.toUpperCase()) ||
             ['EM ANÁLISE', 'AGUARDANDO PEÇA', 'EM EXECUÇÃO'].some(s => statusTecnico === s.toUpperCase());
    }).length;
    
    const concluidas = ordens.filter((os: OrdemServico) => {
      const status = normalizarStatus(os.status);
      const statusTecnico = os.status_tecnico ? normalizarStatus(os.status_tecnico) : '';
      return ['CONCLUIDO', 'REPARO CONCLUÍDO', 'ENTREGUE', 'FINALIZADO', 'FATURADO'].some(s => status === s.toUpperCase()) ||
             ['REPARO CONCLUÍDO'].some(s => statusTecnico === s.toUpperCase());
    }).length;
    
    const semReparo = ordens.filter((os: OrdemServico) => {
      const status = normalizarStatus(os.status);
      const statusTecnico = os.status_tecnico ? normalizarStatus(os.status_tecnico) : '';
      return ['SEM REPARO', 'SEM_REPARO'].some(s => status === s.toUpperCase()) ||
             ['SEM REPARO', 'SEM_REPARO'].some(s => statusTecnico.includes(s.toUpperCase()));
    }).length;
    
    return { pendentes, aprovadas, emAndamento, concluidas, semReparo, todas: ordens.length };
  }, [ordens]);
  
  // OS aprovadas não lidas (para notificações)
  const osAprovadas = useMemo(() => {
    return ordens.filter((os: OrdemServico) => 
      os.status === 'APROVADO' && !notificacoesLidas.includes(os.id)
    );
  }, [ordens, notificacoesLidas]);
  
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);
  
  const marcarNotificacaoLida = useCallback((osId: string) => {
    setNotificacoesLidas(prev => [...prev, osId]);
  }, []);

  const iniciarOrdem = async (id: string) => {
    // Se a OS está aguardando início, mudar para "em análise" automaticamente
    const ordem = ordens.find((os: OrdemServico) => os.id === id);
    if (ordem && ordem.status === 'ABERTA') {
      try {
        // Buscar status fixos para obter os nomes corretos
        const { data: statusFixos, error: statusError } = await supabase
          .from('status_fixo')
          .select('*')
          .eq('tipo', 'os');

        if (statusError) {
          console.error('Erro ao buscar status fixos:', statusError);
          return;
        }

        // Encontrar o status "EM ANÁLISE" nos status fixos
        const statusEmAnalise = statusFixos?.find((s: StatusFixo) => s.nome === 'EM ANÁLISE');
        
        if (statusEmAnalise) {
          const { error: updateError } = await supabase
            .from('ordens_servico')
            .update({ 
              status: statusEmAnalise.nome,
              status_tecnico: 'EM ANÁLISE'
            })
            .eq('id', id);

          if (updateError) {
            console.error('Erro ao atualizar status:', updateError);
            alert('Erro ao iniciar a ordem. Tente novamente.');
            return;
          } else {
            // Atualizar a lista local
            setOrdens(prevOrdens => 
              prevOrdens.map((os: OrdemServico) => 
                os.id === id 
                  ? { ...os, status: statusEmAnalise.nome, status_tecnico: 'EM ANÁLISE' }
                  : os
              )
            );
          }
        } else {
          console.error('Status "EM ANÁLISE" não encontrado nos status fixos');
          alert('Erro: Status "EM ANÁLISE" não encontrado. Verifique a configuração do sistema.');
          return;
        }
      } catch (error) {
        console.error('Erro ao iniciar ordem:', error);
        alert('Erro ao iniciar a ordem. Tente novamente.');
        return;
      }
    }
    
    // Redirecionar para a página de edição
    router.push(`/bancada/${id}`);
  };

  const abrirModal = (ordem: OrdemServico) => {
    setOrdemSelecionada(ordem);
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setOrdemSelecionada(null);
  };

  if (loading) {
    return (
      <MenuLayout>
        <div className="w-full bg-gray-50 flex items-center justify-center p-4 min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Carregando sua bancada...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    
      <MenuLayout>
        <div className="w-full bg-gray-50 overflow-x-hidden" style={{ maxWidth: '100vw', width: '100%' }}>
          <div className="w-full mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
          {/* Header Compacto Mobile-First */}
          <div className="mb-2 sm:mb-3">
            <h1 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-2 mb-2">
              <FiCpu className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span>Minha Bancada</span>
            </h1>
            
            {/* Cards Resumo - Layout Horizontal no Mobile */}
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {/* Card de resumo - Sempre visível */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-3 flex-shrink-0 min-w-[140px] sm:min-w-0 sm:flex-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
                    <FiCpu className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-500 leading-tight">Pendentes</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900 leading-tight">{contadores.pendentes}</p>
                  </div>
                </div>
              </div>
              
              {/* Notificações - Condicional */}
              {osAprovadas.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3 relative flex-shrink-0 min-w-[160px] sm:min-w-0 sm:flex-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                      <FiBell className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-green-600 font-medium leading-tight">Aprovadas</p>
                      <p className="text-sm sm:text-base font-bold text-green-800 leading-tight">
                        {osAprovadas.length}
                      </p>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Abas - Scroll horizontal no mobile */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-2 sm:mb-4 overflow-x-auto scrollbar-hide" style={{ width: '100%', maxWidth: '100%' }}>
            <div className="flex border-b border-gray-200 min-w-max">
              <button
                onClick={() => handleTabChange('pendentes')}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-medium text-xs border-b-2 transition-colors touch-manipulation whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'pendentes'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Pendentes</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    activeTab === 'pendentes' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.pendentes}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('aprovadas')}
                className={`px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors relative touch-manipulation whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'aprovadas'
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Aprovadas</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    activeTab === 'aprovadas' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.aprovadas}
                  </span>
                  {osAprovadas.length > 0 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('em_andamento')}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-medium text-xs border-b-2 transition-colors touch-manipulation whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'em_andamento'
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiTool className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Em Andamento</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    activeTab === 'em_andamento' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.emAndamento}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('concluidas')}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-medium text-xs border-b-2 transition-colors touch-manipulation whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'concluidas'
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Concluídas</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    activeTab === 'concluidas' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.concluidas}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('sem_reparo')}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-medium text-xs border-b-2 transition-colors touch-manipulation whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'sem_reparo'
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Sem Reparo</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    activeTab === 'sem_reparo' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.semReparo}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('todas')}
                className={`px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 font-medium text-xs border-b-2 transition-colors touch-manipulation whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'todas'
                    ? 'border-gray-500 text-gray-600 bg-gray-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiPackage className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Todas</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    activeTab === 'todas' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.todas}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Filtros - Compacto Mobile */}
          <div className="flex flex-col gap-2 mb-3">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Buscar OS ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[42px]"
              />
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide" style={{ width: '100%', maxWidth: '100%' }}>
              {[
                { label: 'Abertas', value: 'ABERTA' },
                { label: 'Em Análise', value: 'EM_ANALISE' },
                { label: 'Aguardando Peça', value: 'AGUARDANDO_PECA' },
                { label: 'Concluídas', value: 'CONCLUIDO' },
                { label: 'Todas', value: 'Todos' }
              ].map((status) => {
                const count = status.value === 'Todos' 
                  ? ordens.length 
                  : ordens.filter((os: OrdemServico) => os.status === status.value).length;
                
                return (
                  <button
                    key={status.value}
                    onClick={() => setFiltroStatus(status.value)}
                    className={`px-2.5 sm:px-3 py-2 rounded-lg text-xs font-medium border transition-colors touch-manipulation min-h-[36px] whitespace-nowrap flex-shrink-0 ${
                      filtroStatus === status.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm active:bg-blue-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    {status.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de OSs - Cards Compactos */}
          <div className="space-y-2 sm:space-y-3 pb-4 w-full">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Carregando...</p>
              </div>
            ) : filteredOrdens.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-gray-300 mb-3">
                  <FiCpu size={40} className="mx-auto" />
                </div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Nenhuma ordem encontrada</h3>
                <p className="text-xs text-gray-500">
                  {activeTab === 'pendentes' && 'Não há ordens pendentes no momento.'}
                  {activeTab === 'aprovadas' && 'Não há ordens aprovadas no momento.'}
                  {activeTab === 'em_andamento' && 'Não há ordens em andamento no momento.'}
                  {activeTab === 'concluidas' && 'Não há ordens concluídas no momento.'}
                  {activeTab === 'sem_reparo' && 'Não há ordens sem reparo no momento.'}
                  {activeTab === 'todas' && 'Não há ordens de serviço atribuídas a você no momento.'}
                </p>
              </div>
            ) : (
              filteredOrdens.map((os) => {
                  const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
                  const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
                  const valor = parseFloat(os.valor_servico || '0') + parseFloat(os.valor_peca || '0');
                  const valorFormatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  
                  const getStatusColor = (status: string, statusTecnico?: string) => {
                    const statusNormalizado = (status || '').toUpperCase().trim();
                    const statusTecnicoNormalizado = statusTecnico ? statusTecnico.toUpperCase().trim() : '';
                    
                    // Priorizar status técnico se existir
                    if (statusTecnicoNormalizado) {
                      if (statusTecnicoNormalizado.includes('SEM REPARO') || statusTecnicoNormalizado.includes('SEM_REPARO')) return 'bg-red-100 text-red-800';
                      if (statusTecnicoNormalizado.includes('AGUARDANDO INÍCIO')) return 'bg-yellow-100 text-yellow-800';
                      if (statusTecnicoNormalizado.includes('EM ANÁLISE') || statusTecnicoNormalizado.includes('EM_ANALISE')) return 'bg-blue-100 text-blue-800';
                      if (statusTecnicoNormalizado.includes('AGUARDANDO PEÇA') || statusTecnicoNormalizado.includes('AGUARDANDO_PECA')) return 'bg-orange-100 text-orange-800';
                      if (statusTecnicoNormalizado.includes('EM EXECUÇÃO') || statusTecnicoNormalizado.includes('EM_EXECUCAO')) return 'bg-purple-100 text-purple-800';
                      if (statusTecnicoNormalizado.includes('REPARO CONCLUÍDO') || statusTecnicoNormalizado.includes('CONCLUIDO')) return 'bg-green-100 text-green-800';
                    }
                    
                    // Fallback para status principal
                    if (statusNormalizado.includes('SEM REPARO') || statusNormalizado.includes('SEM_REPARO')) return 'bg-red-100 text-red-800';
                    if (statusNormalizado === 'ABERTA' || statusNormalizado.includes('AGUARDANDO')) return 'bg-yellow-100 text-yellow-800';
                    if (statusNormalizado.includes('ANÁLISE') || statusNormalizado.includes('ANALISE')) return 'bg-blue-100 text-blue-800';
                    if (statusNormalizado.includes('AGUARDANDO PEÇA') || statusNormalizado.includes('AGUARDANDO_PECA')) return 'bg-orange-100 text-orange-800';
                    if (statusNormalizado === 'APROVADO' || statusNormalizado.includes('APROVADO')) return 'bg-green-100 text-green-800';
                    if (statusNormalizado.includes('EXECUÇÃO') || statusNormalizado.includes('EXECUCAO')) return 'bg-purple-100 text-purple-800';
                    if (statusNormalizado.includes('CONCLUIDO') || statusNormalizado.includes('CONCLUÍDO')) return 'bg-green-100 text-green-800';
                    if (statusNormalizado === 'ENTREGUE') return 'bg-emerald-100 text-emerald-800';
                    return 'bg-gray-100 text-gray-800';
                  };

                  const getStatusLabel = (status: string, statusTecnico?: string) => {
                    // Priorizar status técnico se existir
                    if (statusTecnico) {
                      const statusTecnicoUpper = statusTecnico.toUpperCase();
                      if (statusTecnicoUpper.includes('SEM REPARO') || statusTecnicoUpper.includes('SEM_REPARO')) return 'Sem Reparo';
                      if (statusTecnicoUpper.includes('AGUARDANDO INÍCIO')) return 'Aguardando Início';
                      if (statusTecnicoUpper.includes('EM ANÁLISE') || statusTecnicoUpper.includes('EM_ANALISE')) return 'Em Análise';
                      if (statusTecnicoUpper.includes('ORÇAMENTO ENVIADO')) return 'Orçamento Enviado';
                      if (statusTecnicoUpper.includes('AGUARDANDO PEÇA') || statusTecnicoUpper.includes('AGUARDANDO_PECA')) return 'Aguardando Peça';
                      if (statusTecnicoUpper.includes('EM EXECUÇÃO') || statusTecnicoUpper.includes('EM_EXECUCAO')) return 'Em Execução';
                      if (statusTecnicoUpper.includes('REPARO CONCLUÍDO') || statusTecnicoUpper.includes('CONCLUIDO')) return 'Reparo Concluído';
                    }
                    
                    // Fallback para status principal
                    const statusNormalizado = (status || '').toUpperCase().trim();
                    if (statusNormalizado.includes('SEM REPARO') || statusNormalizado.includes('SEM_REPARO')) return 'Sem Reparo';
                    if (statusNormalizado === 'ABERTA') return 'Aguardando Início';
                    if (statusNormalizado.includes('ANÁLISE') || statusNormalizado.includes('ANALISE')) return 'Em Análise';
                    if (statusNormalizado.includes('AGUARDANDO PEÇA') || statusNormalizado.includes('AGUARDANDO_PECA')) return 'Aguardando Peça';
                    if (statusNormalizado === 'APROVADO' || statusNormalizado.includes('APROVADO')) return 'Aprovado';
                    if (statusNormalizado.includes('EXECUÇÃO') || statusNormalizado.includes('EXECUCAO')) return 'Em Execução';
                    if (statusNormalizado.includes('CONCLUIDO') || statusNormalizado.includes('CONCLUÍDO')) return 'Reparo Concluído';
                    if (statusNormalizado === 'ENTREGUE') return 'Entregue';
                    return status || 'Sem Status';
                  };

                  const isAprovada = os.status === 'APROVADO';
                  const isNovaAprovacao = isAprovada && !notificacoesLidas.includes(os.id);
                  
                  return (
                    <div
                      key={os.id}
                      className={`bg-white p-3 sm:p-4 rounded-lg shadow-sm transition-all duration-200 border ${
                        isNovaAprovacao 
                          ? 'border-2 border-green-400 shadow-md bg-green-50/50'
                          : isAprovada
                          ? 'border border-green-200 bg-green-50/30'
                          : 'border border-gray-200'
                      }`}
                      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                      onClick={() => isNovaAprovacao && marcarNotificacaoLida(os.id)}
                    >
                      {/* Header do Card - Estilo App */}
                      <div className="mb-3">
                        <h3 className="font-bold text-sm text-gray-900 mb-1 break-words">
                          OS #{os.numero_os || os.id}
                        </h3>
                        <p className="text-xs text-gray-600 font-medium uppercase break-words overflow-wrap-anywhere">
                          {os.cliente?.nome || 'Cliente não informado'}
                        </p>
                      </div>
                      
                      {/* Banner Aprovada - Compacto */}
                      {isAprovada && (
                        <div className="mb-3 p-2 bg-green-100 border border-green-300 rounded text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <FiCheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <span className="font-semibold text-green-800">Aprovada!</span>
                            {isNovaAprovacao && (
                              <span className="ml-auto text-[9px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-medium">NOVO</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Informações Principais - Layout Vertical Simples */}
                      <div className="space-y-2.5 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Aparelho</p>
                          <p className="text-xs font-bold text-gray-900 uppercase break-words overflow-wrap-anywhere leading-tight">
                            {aparelho || '---'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Entrada</p>
                          <p className="text-xs text-gray-700 break-words leading-tight">{entrada}</p>
                        </div>
                        {os.cliente?.telefone && (
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5">Telefone</p>
                            <p className="text-xs text-gray-700 break-all overflow-wrap-anywhere leading-tight">{os.cliente.telefone}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Valor</p>
                          <p className="text-xs font-bold text-blue-600 break-words leading-tight">{valorFormatado}</p>
                        </div>
                      </div>

                      {/* Relato - Se existir */}
                      {os.relato && (
                        <div className="mb-3 p-2 bg-gray-50 rounded">
                          <p className="text-[10px] font-medium text-gray-600 mb-1">Relato:</p>
                          <p className="text-xs text-gray-700 break-words overflow-wrap-anywhere leading-relaxed">{os.relato}</p>
                        </div>
                      )}

                      {/* Botão de Ação - Full Width Estilo App */}
                      <div className="pt-3">
                        {os.status === 'ABERTA' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModal(os);
                            }}
                            className="w-full inline-flex justify-center items-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors min-h-[48px] touch-manipulation shadow-sm"
                          >
                            <FiEye size={16} /> 
                            Visualizar
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/bancada/${os.id}`);
                            }}
                            className="w-full inline-flex justify-center items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[48px] touch-manipulation shadow-sm relative"
                          >
                            <span className="flex-1 text-left">Continuar</span>
                            <FiCpu size={18} className="ml-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
          </div>
        </div>

        {/* Modal */}
        <VisualizarOSModal
          isOpen={modalOpen}
          onClose={fecharModal}
          ordem={ordemSelecionada}
          onIniciar={iniciarOrdem}
        />
      </MenuLayout>
    
  );
}