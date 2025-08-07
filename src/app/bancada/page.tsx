'use client';

import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { useRouter } from 'next/navigation';
import { FiCpu, FiEye } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import VisualizarOSModal from '@/components/VisualizarOSModal';

export default function BancadaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null);

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
    cliente?: {
      nome: string;
      telefone?: string;
    };
    [key: string]: unknown;
  }

  useEffect(() => {
    const fetchOrdens = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // Buscar ordens atribuídas ao técnico
        const { data: ordensData, error: ordensError } = await supabase
          .from('ordens_servico')
          .select(`
            *,
            cliente:cliente_id(nome, telefone)
          `)
          .eq('tecnico_id', user.id)
          .order('created_at', { ascending: false });

        if (ordensError) {
          console.error('Erro ao buscar ordens:', ordensError);
        } else {
          setOrdens(ordensData || []);
        }

      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user && !authLoading) fetchOrdens();
  }, [user, authLoading]);

  const iniciarOrdem = async (id: string) => {
    // Se a OS está aguardando início, mudar para "em análise" automaticamente
    const ordem = ordens.find(os => os.id === id);
    if (ordem && ordem.status === 'ABERTA') {
      try {
        // Buscar status fixos para obter os nomes corretos
        const { data: statusFixos } = await supabase
          .from('status_fixo')
          .select('*')
          .eq('tipo', 'os');

        // Encontrar o status "EM ANÁLISE" nos status fixos
        const statusEmAnalise = statusFixos?.find(s => s.nome === 'EM ANÁLISE');
        
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
          } else {
            // Atualizar a lista local
            setOrdens(prevOrdens => 
              prevOrdens.map(os => 
                os.id === id 
                  ? { ...os, status: statusEmAnalise.nome, status_tecnico: 'EM ANÁLISE' }
                  : os
              )
            );
          }
        }
      } catch (error) {
        console.error('Erro ao iniciar ordem:', error);
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
      <ProtectedArea area="bancada">
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
      </ProtectedArea>
    );
  }

  return (
    <ProtectedArea area="bancada">
      <MenuLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FiCpu className="text-blue-600" />
              Minha Bancada
            </h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FiCpu className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Hoje</p>
                  <p className="text-lg font-bold text-gray-900">{ordens.filter(os => os.status === 'ABERTA').length} OSs para iniciar</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Abertas', value: 'ABERTA' },
                { label: 'Em Análise', value: 'EM_ANALISE' },
                { label: 'Aguardando Peça', value: 'AGUARDANDO_PECA' },
                { label: 'Concluídas', value: 'CONCLUIDO' },
                { label: 'Todas', value: 'Todos' }
              ].map((status) => {
                const count = status.value === 'Todos' 
                  ? ordens.length 
                  : ordens.filter(os => os.status === status.value).length;
                
                return (
                  <button
                    key={status.value}
                    onClick={() => setFiltroStatus(status.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
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
          <div className="space-y-4">
            {ordens.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiCpu size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ordem encontrada</h3>
                <p className="text-gray-500">Não há ordens de serviço atribuídas a você no momento.</p>
              </div>
            ) : (
              ordens
                .filter((os) => {
                  const searchLower = searchTerm.toLowerCase();
                  return (
                    (os.cliente?.nome?.toLowerCase() || '').includes(searchLower) ||
                    (os.numero_os || os.id).toLowerCase().includes(searchLower)
                  );
                })
                .filter((os) => {
                  if (filtroStatus === 'Todos') return true;
                  return os.status === filtroStatus;
                })
                .map((os) => {
                  const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
                  const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
                  const valor = parseFloat(os.valor_servico || '0') + parseFloat(os.valor_peca || '0');
                  const valorFormatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                  
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'ABERTA': return 'bg-yellow-100 text-yellow-800';
                      case 'EM_ANALISE': return 'bg-blue-100 text-blue-800';
                      case 'AGUARDANDO_PECA': return 'bg-orange-100 text-orange-800';
                      case 'CONCLUIDO': return 'bg-green-100 text-green-800';
                      default: return 'bg-gray-100 text-gray-800';
                    }
                  };

                  const getStatusLabel = (status: string) => {
                    switch (status) {
                      case 'ABERTA': return 'Aguardando Início';
                      case 'EM_ANALISE': return 'Em Análise';
                      case 'AGUARDANDO_PECA': return 'Aguardando Peça';
                      case 'CONCLUIDO': return 'Reparo Concluído';
                      default: return status;
                    }
                  };

                  return (
                    <div
                      key={os.id}
                      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-gray-900">
                              #{os.numero_os || os.id} - {os.cliente?.nome || 'Cliente não informado'}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(os.status)}`}>
                              {getStatusLabel(os.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
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
                              <p className="text-sm text-gray-600 line-clamp-2">{os.relato}</p>
                            </div>
                          )}
                        </div>

                        <div className="ml-6 flex flex-col items-end">
                          <button
                            onClick={() => abrirModal(os)}
                            className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors shadow-sm"
                          >
                            <FiEye size={16} /> 
                            Visualizar
                          </button>
                          
                          {os.status !== 'ABERTA' && (
                            <p className="text-xs text-gray-500 mt-2">
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
    </ProtectedArea>
  );
}