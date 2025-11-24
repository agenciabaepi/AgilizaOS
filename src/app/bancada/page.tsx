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
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando...</p>
              </div>
            </div>
          </div>
        </MenuLayout>
      
    );
  }

  return (
    
      <MenuLayout>
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FiCpu className="text-blue-600" />
              Minha Bancada
            </h1>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Notificações */}
              {osAprovadas.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4 relative">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiBell className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-medium">Orçamentos Aprovados!</p>
                      <p className="text-sm font-bold text-green-800">
                        {osAprovadas.length} OS{osAprovadas.length > 1 ? 's' : ''} aprovada{osAprovadas.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}
              
              {/* Card de resumo */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FiCpu className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Hoje</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900">{contadores.pendentes} OSs pendentes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Abas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
            <div className="flex border-b border-gray-200 min-w-max">
              <button
                onClick={() => handleTabChange('pendentes')}
                className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors ${
                  activeTab === 'pendentes'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Pendentes
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'pendentes' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.pendentes}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('aprovadas')}
                className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors relative ${
                  activeTab === 'aprovadas'
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4" />
                  Aprovadas
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'aprovadas' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.aprovadas}
                  </span>
                  {osAprovadas.length > 0 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('em_andamento')}
                className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors ${
                  activeTab === 'em_andamento'
                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiTool className="w-4 h-4" />
                  Em Andamento
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'em_andamento' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.emAndamento}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('concluidas')}
                className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors ${
                  activeTab === 'concluidas'
                    ? 'border-green-500 text-green-600 bg-green-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4" />
                  Concluídas
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'concluidas' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.concluidas}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('sem_reparo')}
                className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors ${
                  activeTab === 'sem_reparo'
                    ? 'border-red-500 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4" />
                  Sem Reparo
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'sem_reparo' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.semReparo}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleTabChange('todas')}
                className={`px-3 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm border-b-2 transition-colors ${
                  activeTab === 'todas'
                    ? 'border-gray-500 text-gray-600 bg-gray-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiPackage className="w-4 h-4" />
                  Todas
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === 'todas' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contadores.todas}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por cliente ou número da OS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-wrap gap-1 sm:gap-2">
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
                    className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      filtroStatus === status.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {status.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de OSs */}
          <div className="space-y-3 sm:space-y-4">
            {filteredOrdens.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiCpu size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ordem encontrada</h3>
                <p className="text-gray-500">
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
                      className={`bg-white p-4 sm:p-6 rounded-xl shadow-sm transition-all duration-200 ${
                        isNovaAprovacao 
                          ? 'border-2 border-green-400 shadow-lg bg-gradient-to-r from-green-50 to-white animate-pulse'
                          : isAprovada
                          ? 'border border-green-200 bg-green-50'
                          : 'border border-gray-100 hover:shadow-md'
                      }`}
                      onClick={() => isNovaAprovacao && marcarNotificacaoLida(os.id)}
                    >
                      {/* Banner para OS aprovadas */}
                      {isAprovada && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-green-800">
                                ✅ Orçamento Aprovado pelo Cliente!
                              </p>
                              <p className="text-xs text-green-600">
                                Você pode iniciar o reparo agora.
                              </p>
                            </div>
                            {isNovaAprovacao && (
                              <div className="ml-auto">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800 animate-bounce">
                                  NOVO!
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-gray-900">
                              #{os.numero_os || os.id} - {os.cliente?.nome || 'Cliente não informado'}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(os.status, os.status_tecnico)}`}>
                              {getStatusLabel(os.status, os.status_tecnico)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-sm text-gray-600">
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Aparelho</p>
                              <p>{aparelho || 'Não informado'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Cliente</p>
                              <p>{os.cliente?.nome || 'Não informado'}</p>
                              {os.cliente?.telefone && (
                                <p className="text-xs text-gray-500">{os.cliente.telefone}</p>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Entrada</p>
                              <p>{entrada}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Valor</p>
                              <p className="font-semibold text-blue-600">{valorFormatado}</p>
                            </div>
                          </div>

                          {os.relato && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-1">Relato do Cliente</p>
                              <p className="text-sm text-gray-600 line-clamp-3 sm:line-clamp-2">{os.relato}</p>
                            </div>
                          )}
                        </div>

                        <div className="sm:ml-6 flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                          {os.status === 'ABERTA' ? (
                            <button
                              onClick={() => abrirModal(os)}
                              className="inline-flex justify-center items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors shadow-sm w-full sm:w-auto"
                            >
                              <FiEye size={16} /> 
                              Visualizar
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/bancada/${os.id}`)}
                              className="inline-flex justify-center items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                            >
                              <FiCpu size={16} /> 
                              Continuar
                            </button>
                          )}

                          {/* Botão para visualizar anexos (imagens de entrada/técnico) */}
                          {((os.imagens && os.imagens.trim() !== '') || (os.imagens_tecnico && os.imagens_tecnico.trim() !== '')) && (
                            <button
                              onClick={() => router.push(`/bancada/${os.id}#anexos`)}
                              className="inline-flex justify-center items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors w-full sm:w-auto"
                            >
                              <FiPaperclip size={14} />
                              Ver anexos
                            </button>
                          )}
                          
                          {os.status !== 'ABERTA' && (
                            <p className="text-xs text-gray-500 sm:mt-2 text-center sm:text-right">
                              Entrada: {entrada}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
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