
'use client';



interface OrdemTransformada {
  id: string;
  numero: number;
  cliente: string;
  clienteTelefone: string;
  clienteEmail: string;
  aparelho: string;
  aparelhoCategoria: string;
  aparelhoMarca: string;
  servico: string;
  statusOS: string;
  statusTecnico: string;
  entrada: string;
  tecnico: string;
  atendente: string;
  entrega: string;
  prazoEntrega: string;
  garantia: string;
  valorPeca: number;
  valorServico: number;
  desconto: number;
  valorTotal: number;
  valorComDesconto: number;
  valorFaturado: number;
  tipo: string;
  foiFaturada: boolean;
  formaPagamento: string;
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiRefreshCw, FiPlus, FiSearch, FiFilter, FiCalendar, FiUser, FiSmartphone, FiDollarSign, FiClock, FiAlertCircle, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import ProtectedArea from '@/components/ProtectedArea';
import DashboardCard from '@/components/ui/DashboardCard';
import MenuLayout from '@/components/MenuLayout';
import { useToast } from '@/components/Toast';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';
import LaudoProntoAlert from '@/components/LaudoProntoAlert';
import StatusQuickChange from '@/components/StatusQuickChange';

export default function ListaOrdensPage() {
  const router = useRouter();
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;
  const { addToast } = useToast();

  // Estados dos cards principais
  const [totalOS, setTotalOS] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [retornosMes, setRetornosMes] = useState(0);

  const [percentualRetornos, setPercentualRetornos] = useState(0);
  const [crescimentoSemana, setCrescimentoSemana] = useState(0);
  const [crescimentoMes, setCrescimentoMes] = useState(0);
  const [faturamentoMes, setFaturamentoMes] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);

  // Estados da lista
  const [ordens, setOrdens] = useState<OrdemTransformada[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [aparelhoFilter, setAparelhoFilter] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [tecnicos, setTecnicos] = useState<string[]>([]);

  
  // Estado para abas
  const [activeTab, setActiveTab] = useState('todas');

  function formatDate(date: string) {
    if (!date) return '';
    // Trata YYYY-MM-DD como data local (evita -1 dia por timezone)
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, y, mm, dd] = m;
      return `${dd}/${mm}/${y}`;
    }
    return new Date(date).toLocaleDateString('pt-BR');
  }

  const toDateOnlyString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addDaysDateOnly = (dateOnly: string, days: number): string => {
    const m = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return dateOnly;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const d = new Date(y, mm - 1, dd + days);
    return toDateOnlyString(d);
  };

  function formatPhoneNumber(phone: string) {
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  }

  function formatFormaPagamento(forma: string) {
    const formas: Record<string, string> = {
      'dinheiro': 'Dinheiro',
      'pix': 'PIX',
      'cartao_debito': 'Cartão Débito',
      'cartao_credito': 'Cartão Crédito',
      'transferencia': 'Transferência',
      'boleto': 'Boleto',
      'cheque': 'Cheque'
    };
    return formas[forma] || forma;
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border border-gray-200';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'concluido':
      case 'finalizado':
      case 'reparo concluído':
      case 'entregue':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'orcamento':
      case 'orçamento':
      case 'orçamento enviado':
      case 'aprovado':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'analise':
      case 'em analise':
      case 'em análise':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'aguardando inicio':
      case 'aguardando início':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'aguardando peca':
      case 'aguardando peça':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'em execucao':
      case 'em execução':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'sem reparo':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'nao aprovado':
      case 'não aprovado':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusTecnicoColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border border-gray-200';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'aguardando início':
      case 'aguardando inicio':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'em análise':
      case 'em analise':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'orçamento enviado':
      case 'orcamento enviado':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'aguardando peça':
      case 'aguardando peca':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'em execução':
      case 'em execucao':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'sem reparo':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'reparo concluído':
      case 'reparo concluido':
      case 'finalizada':
      case 'finalizado':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const fetchOrdens = async () => {
    if (!empresaId) return;

      setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          cliente_id,
          categoria,
          marca,
          modelo,
          cor,
          servico,
          status,
          status_tecnico,
          created_at,
          tecnico_id,
          atendente,
          data_entrega,
          prazo_entrega,
          valor_peca,
          valor_servico,
          desconto,
          valor_faturado,
          qtd_peca,
          qtd_servico,
          tipo,
          vencimento_garantia,
          clientes:cliente_id(nome, telefone, email),
          tecnico:usuarios!tecnico_id(nome)
        `)
        .eq("empresa_id", empresaId);

      if (error) {
        console.error('Erro ao carregar OS:', error);
      } else if (data) {

        data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        // Buscar nomes dos técnicos se necessário
        const tecnicoIds = [...new Set(data.filter((item: any) => item.tecnico_id).map((item: any) => item.tecnico_id))];
        let tecnicosDict: Record<string, string> = {};
        
        if (tecnicoIds.length > 0) {
          const { data: tecnicosData } = await supabase
            .from('usuarios')
            .select('id, nome')
            .in('id', tecnicoIds);
          
          if (tecnicosData) {
            tecnicosDict = tecnicosData.reduce((acc: Record<string, string>, tecnico: any) => {
              acc[tecnico.id] = tecnico.nome;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        // IMPORTANTE: Uma O.S. só deve aparecer como "faturada" se ela própria foi entregue
        // Não por vendas anteriores do mesmo cliente
        let vendasDict: Record<string, any> = {};
        
        // SOLUÇÃO SIMPLES: Buscar vendas igual à página de vendas
        const { data: todasVendas, error: errorVendas } = await supabase
          .from('vendas')
          .select('id, cliente_id, forma_pagamento, total, status, data_venda')
          .order('data_venda', { ascending: false });
        
        if (errorVendas) {
          console.log('❌ Erro ao buscar vendas:', errorVendas);
        } else if (todasVendas) {
          console.log('✅ Vendas encontradas:', todasVendas.length);
          
          // Para cada O.S. entregue, buscar a venda correspondente
          data.forEach((os: any) => {
            if (os.valor_faturado > 0 && 
                (os.status === 'ENTREGUE' || os.status_tecnico === 'FINALIZADA')) {
              
              // Buscar a venda mais recente deste cliente
              const vendaCliente = todasVendas
                .filter((v: any) => v.cliente_id === os.cliente_id)
                .sort((a: any, b: any) => new Date(b.data_venda || 0).getTime() - new Date(a.data_venda || 0).getTime())[0];
              
              if (vendaCliente) {
                console.log(`✅ Venda encontrada para O.S. ${os.id}:`, vendaCliente);
                vendasDict[os.id] = {
                  id: vendaCliente.id,
                  cliente_id: vendaCliente.cliente_id,
                  forma_pagamento: vendaCliente.forma_pagamento,
                  total: vendaCliente.total,
                  status: vendaCliente.status
                };
              } else {
                console.log(`❌ Nenhuma venda encontrada para cliente ${os.cliente_id}`);
              }
            }
          });
        }
        
        console.log('📊 vendasDict final:', vendasDict);

        const mapped = data.map((item: any) => {
          // manter datas como YYYY-MM-DD para evitar timezone
          const entregaCalc = item.data_entrega
            ? item.data_entrega
            : (item.vencimento_garantia
              ? addDaysDateOnly(item.vencimento_garantia, -90)
              : '');
          const garantiaCalc = item.vencimento_garantia
            ? item.vencimento_garantia
            : (item.data_entrega
              ? addDaysDateOnly(item.data_entrega, 90)
              : '');
          
          const valorFaturado = item.valor_faturado || 0;
          const vendaCliente = vendasDict[item.id];
          
          return {
          id: item.id,
            numero: item.numero_os,
            cliente: item.clientes?.nome || 'Sem nome',
            clienteTelefone: item.clientes?.telefone ? formatPhoneNumber(item.clientes.telefone) : '',
            clienteEmail: item.clientes?.email || '',
            aparelho: item.modelo || item.marca || item.categoria || '',
            aparelhoCategoria: item.categoria || '',
            aparelhoMarca: item.marca || '',
            servico: item.servico || '',
            statusOS: item.status || '',
            statusTecnico: item.status_tecnico || '',
            entrada: item.created_at || '',
            tecnico: item.tecnico?.nome || tecnicosDict[item.tecnico_id] || item.tecnico_id || '',
            atendente: item.atendente || '',
            entrega: entregaCalc,
            prazoEntrega: item.prazo_entrega || '',
            garantia: garantiaCalc,
          valorPeca: item.valor_peca || 0,
          valorServico: item.valor_servico || 0,
          desconto: item.desconto || 0,
            valorTotal: ((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1)),
            valorComDesconto: (((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1))) - (item.desconto || 0),
          valorFaturado: valorFaturado,
            tipo: item.tipo || 'Nova',
            foiFaturada: valorFaturado > 0 && (item.status === 'ENTREGUE' || item.status_tecnico === 'FINALIZADA'),
            formaPagamento: vendasDict[item.id]?.forma_pagamento || 'N/A',
          };
        });


        setOrdens(mapped);

        // Calcular métricas dos cards
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
        const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

        const totalOS = mapped.length;
        const totalMes = mapped.filter((o: any) => new Date(o.entrada) >= inicioMes).length;
        const retornosMes = mapped.filter((o: any) => o.tipo === 'Retorno' && new Date(o.entrada) >= inicioMes).length;
        const percentualRetornos = totalOS > 0 ? Math.round((retornosMes / totalOS) * 100) : 0;

        // Calcular crescimento
        const ordensSemana = mapped.filter((o: any) => new Date(o.entrada) >= inicioSemana).length;
        const ordensSemanaAnterior = mapped.filter((o: any) => {
          const data = new Date(o.entrada);
          const semanaAnterior = new Date(inicioSemana);
          semanaAnterior.setDate(semanaAnterior.getDate() - 7);
          return data >= semanaAnterior && data < inicioSemana;
        }).length;

        const ordensMesAnterior = mapped.filter((o: any) => {
          const data = new Date(o.entrada);
          return data >= mesAnterior && data < inicioMes;
        }).length;
    
    const calcPercent = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return Math.round(((atual - anterior) / anterior) * 100);
    };

        setTotalOS(totalOS);
        setTotalMes(totalMes);
        setRetornosMes(retornosMes);
        setPercentualRetornos(percentualRetornos);
        setCrescimentoSemana(calcPercent(ordensSemana, ordensSemanaAnterior));
        setCrescimentoMes(calcPercent(totalMes, ordensMesAnterior));

        // Calcular faturamento e ticket médio
        const faturamentoMes = mapped
          .filter((o: any) => new Date(o.entrada) >= inicioMes)
          .reduce((sum: number, o: any) => sum + o.valorTotal, 0);
        
        const ticketMedio = mapped.length > 0 
          ? mapped.reduce((sum: number, o: any) => sum + o.valorTotal, 0) / mapped.length 
          : 0;

        setFaturamentoMes(faturamentoMes);
        setTicketMedio(ticketMedio);
      }
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (ordemId: string, newStatus: string, newStatusTecnico: string) => {
    setOrdens(prevOrdens => 
      prevOrdens.map(os => 
        os.id === ordemId 
          ? { ...os, statusOS: newStatus, statusTecnico: newStatusTecnico }
          : os
      )
    );
  };

  const fetchTecnicos = async () => {
    if (!empresaId) return;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('empresa_id', empresaId)
        .eq('nivel', 'tecnico');

      if (!error && data) {
        setTecnicos(data.map((u: any) => u.nome).filter(Boolean));
      }
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
    }
  };

  useEffect(() => {
      fetchOrdens();
    fetchTecnicos();
  }, [empresaId]);

  // Filtros e busca
  const filteredOrdens = useMemo(() => {
    // Debug: mostrar dados de filtro
    
    
    return ordens.filter(os => {
      const matchesSearch = searchTerm === '' || 
        os.numero.toString().includes(searchTerm) ||
        os.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.aparelho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.servico.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === '' || os.statusOS.toLowerCase() === statusFilter.toLowerCase();
      const matchesAparelho = aparelhoFilter === '' || os.aparelho.toLowerCase().includes(aparelhoFilter.toLowerCase());
      const matchesTecnico = tecnicoFilter === '' || os.tecnico.toLowerCase().includes(tecnicoFilter.toLowerCase());
      const matchesTipo = tipoFilter === '' || os.tipo === tipoFilter;
      
      // Filtro por aba - Garantir consistência visual entre todas as abas
      let matchesTab = true;
      if (activeTab === 'reparo_concluido') {
        // OS com reparo concluído pelo técnico (status_tecnico)
        const statusTecnico = (os.statusTecnico || '').toLowerCase();
        matchesTab = statusTecnico.includes('reparo concluído') || statusTecnico.includes('reparo concluido');
      } else if (activeTab === 'concluidas') {
        // OS concluídas: entregues, finalizadas (status da OS)
        const statusConcluidos = ['entregue', 'finalizado', 'concluído', 'reparo concluído'];
        matchesTab = statusConcluidos.includes(os.statusOS.toLowerCase());
      } else if (activeTab === 'orcamentos') {
        // OS com orçamento (status da OS)
        const statusOrcamento = ['orçamento', 'orçamento enviado', 'aguardando aprovação'];
        matchesTab = statusOrcamento.includes(os.statusOS.toLowerCase());
      } else if (activeTab === 'aguardando_retirada') {
        // OS aguardando retirada (status da OS ou técnico)
        const stOs = (os.statusOS || '').toUpperCase();
        const stTec = (os.statusTecnico || '').toUpperCase();
        matchesTab = stOs === 'AGUARDANDO RETIRADA' || stTec === 'AGUARDANDO RETIRADA';
      } else if (activeTab === 'aprovadas') {
        // OS aprovadas (status da OS ou técnico)
        const stOs = (os.statusOS || '').toUpperCase();
        const stTec = (os.statusTecnico || '').toUpperCase();
        matchesTab = stOs === 'APROVADO' || stTec === 'APROVADO';
      } else if (activeTab === 'laudo_pronto') {
        // OS com laudo pronto (status técnico)
        const stTec = (os.statusTecnico || '').toUpperCase();
        matchesTab = stTec === 'ORÇAMENTO ENVIADO' || stTec === 'ORCAMENTO ENVIADO' || stTec === 'AGUARDANDO APROVAÇÃO' || stTec === 'AGUARDANDO APROVACAO';
      }
      // activeTab === 'todas' não filtra nada - mostra todas as OSs

      return matchesSearch && matchesStatus && matchesAparelho && matchesTecnico && matchesTipo && matchesTab;
    });
    
    
    
  }, [ordens, searchTerm, statusFilter, aparelhoFilter, tecnicoFilter, tipoFilter, activeTab]);

  const totalPages = Math.ceil(filteredOrdens.length / itemsPerPage);
  const paginated = filteredOrdens.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);



  const handleTecnicoFilterChange = useCallback((value: string) => {
    setTecnicoFilter(value);
    setCurrentPage(1);
  }, []);

  const handleTipoFilterChange = useCallback((value: string) => {
    setTipoFilter(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);


  
  // Contadores para as abas
  const contadores = useMemo(() => {
    const reparoConcluido = ordens.filter(os => {
      const statusTecnico = (os.statusTecnico || '').toLowerCase();
      return statusTecnico.includes('reparo concluído') || statusTecnico.includes('reparo concluido');
    }).length;
    
    const concluidas = ordens.filter(os => {
      const statusConcluidos = ['entregue', 'finalizado', 'concluído', 'reparo concluído'];
      return statusConcluidos.includes(os.statusOS.toLowerCase());
    }).length;
    
    const orcamentos = ordens.filter(os => {
      const statusOrcamento = ['orçamento', 'orçamento enviado', 'aguardando aprovação'];
      return statusOrcamento.includes(os.statusOS.toLowerCase());
    }).length;
    const aguardandoRetirada = ordens.filter(os => {
      const stOs = (os.statusOS || '').toUpperCase();
      const stTec = (os.statusTecnico || '').toUpperCase();
      return stOs === 'AGUARDANDO RETIRADA' || stTec === 'AGUARDANDO RETIRADA';
    }).length;
    const aprovadas = ordens.filter(os => {
      const stOs = (os.statusOS || '').toUpperCase();
      const stTec = (os.statusTecnico || '').toUpperCase();
      return stOs === 'APROVADO' || stTec === 'APROVADO';
    }).length;
    const laudoPronto = ordens.filter(os => {
      const stTec = (os.statusTecnico || '').toUpperCase();
      return stTec === 'ORÇAMENTO ENVIADO' || stTec === 'ORCAMENTO ENVIADO' || stTec === 'AGUARDANDO APROVAÇÃO' || stTec === 'AGUARDANDO APROVACAO';
    }).length;
    
    return { reparoConcluido, concluidas, orcamentos, aguardandoRetirada, aprovadas, laudoPronto, todas: ordens.length };
  }, [ordens]);

  if (!empresaId) {
    return (
      <div className="p-6 text-center text-gray-500 animate-pulse">
        Carregando ordens de serviço...
      </div>
    );
  }

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  // Corrigir cálculo das métricas diárias
  const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

  const osHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia;
  }).length;

  const faturamentoHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia && os.valorFaturado;
  }).reduce((sum: number, o: any) => sum + (o.valorFaturado || 0), 0);

  const ticketMedioHoje = osHoje > 0 ? faturamentoHoje / osHoje : 0;

  const retornosHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia && os.tipo === 'Retorno';
  }).length;

  const aprovadosHoje = ordens.filter(os => {
    const dataOS = new Date(os.entrada);
    return dataOS >= inicioDia && dataOS < fimDia && 
           (os.statusOS?.toLowerCase() === 'aprovado' || 
            os.statusTecnico?.toLowerCase() === 'aprovado');
  }).length;

  return (
    <ProtectedArea area="ordens">
      <MenuLayout>
        <div className="p-4 md:p-8">
          {/* Header com título e botão */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Ordens de Serviço</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                Gerencie todas as ordens de serviço da sua empresa
              </p>
            </div>
            <Button
              onClick={() => router.push("/nova-os")}
              size="lg"
              className="bg-black text-white hover:bg-neutral-800 px-6 md:px-8 py-3 text-sm md:text-base font-semibold shadow-lg w-full md:w-auto"
            >
              <FiPlus className="w-5 h-5 mr-2" />
              Nova OS
            </Button>
          </div>

          {/* Cards principais - Dados Diários */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <DashboardCard
              title="OS do Dia"
              value={osHoje}
              description={`Total: ${totalOS}`}
              descriptionColorClass="text-gray-600"
              icon={<FiFileText className="w-5 h-5" />}
              svgPolyline={{ color: '#84cc16', points: '0,20 10,15 20,17 30,10 40,12 50,8 60,10 70,6' }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
            <DashboardCard
              title="Faturamento do Dia"
              value={formatCurrency(faturamentoHoje)}
              description={`Ticket médio: ${formatCurrency(ticketMedioHoje)}`}
              descriptionColorClass="text-green-600"
              icon={<FiDollarSign className="w-5 h-5" />}
              svgPolyline={{ color: '#4ade80', points: '0,18 10,16 20,14 30,10 40,11 50,9 60,10 70,6' }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
            <DashboardCard
              title="Retornos do Dia"
              value={retornosHoje}
              description={`${percentualRetornos}% do total`}
              descriptionColorClass="text-red-500"
              icon={<FiRefreshCw className="w-5 h-5" />}
              svgPolyline={{ color: '#f87171', points: '0,12 10,14 20,16 30,18 40,20 50,17 60,15 70,16' }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
            <DashboardCard
              title="Aprovados do Dia"
              value={aprovadosHoje}
              description={`OS aprovadas hoje`}
              descriptionColorClass="text-purple-600"
              icon={<FiCheckCircle className="w-5 h-5" />}
              svgPolyline={{ color: '#a855f7', points: '0,15 10,18 20,16 30,19 40,17 50,20 60,18 70,20' }}
            >
              <div className="mt-2">
                <button 
                  onClick={() => router.push('/financeiro/detalhamento-mes')}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  Ver mês completo →
                </button>
              </div>
            </DashboardCard>
          </div>

          {/* Abas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row border-b md:border-b-0 border-gray-200">
              <button
                onClick={() => handleTabChange('todas')}
                className={`px-4 md:px-6 py-3 md:py-4 font-medium text-sm border-b-2 md:border-b-2 border-r-0 md:border-r-0 transition-colors ${
                  activeTab === 'todas'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Todas
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'todas' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.todas}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('reparo_concluido')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'reparo_concluido'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Reparo Concluído
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'reparo_concluido' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.reparoConcluido}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('orcamentos')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'orcamentos'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Orçamentos
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'orcamentos' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.orcamentos}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('aprovadas')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'aprovadas'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Aprovadas
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'aprovadas' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.aprovadas}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('laudo_pronto')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'laudo_pronto'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Laudo Pronto
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'laudo_pronto' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.laudoPronto}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('aguardando_retirada')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'aguardando_retirada'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                                 Aguardando Retirada
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'aguardando_retirada' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.aguardandoRetirada}
                </span>
              </button>
              <button
                onClick={() => handleTabChange('concluidas')}
                className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'concluidas'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                                 Concluídas
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  activeTab === 'concluidas' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {contadores.concluidas}
                </span>
              </button>
          </div>
        </div>

          {/* Filtros e busca */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              {/* Busca */}
              <div className="flex-1 relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                  placeholder="Buscar por OS, cliente, aparelho ou serviço..."
                    value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-full"
                  />
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3">
                <Select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="w-48"
                >
                  <option value="">Todos os Status</option>
                                     <option value="concluido">Concluído</option>
                   <option value="pendente">Pendente</option>
                   <option value="orcamento">Orçamento</option>
                   <option value="analise">Análise</option>
                   <option value="nao aprovado">Não Aprovado</option>
                </Select>

                <Select
                  value={tipoFilter}
                  onChange={(e) => handleTipoFilterChange(e.target.value)}
                  className="w-40"
                >
                  <option value="">Todos os Tipos</option>
                                     <option value="Nova">Nova</option>
                   <option value="Retorno">Retorno</option>
                </Select>

                <Select
                  value={tecnicoFilter}
                  onChange={(e) => handleTecnicoFilterChange(e.target.value)}
                  className="w-48"
                >
                  <option value="">Todos os Técnicos</option>
                  {tecnicos.map(tecnico => (
                    <option key={tecnico} value={tecnico}>{tecnico}</option>
                  ))}
                </Select>

                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setTipoFilter('');
                    setTecnicoFilter('');
                    setAparelhoFilter('');
                    setActiveTab('reparo_concluido');
                    setCurrentPage(1);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FiFilter className="w-4 h-4" />
                  Limpar
                </Button>
              </div>
            </div>

            {/* Resultados */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                {filteredOrdens.length} de {ordens.length} ordens encontradas
              </span>
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span>Carregando...</span>
                </div>
              )}
          </div>
        </div>

        {/* Tabela - Desktop */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="w-full">
            <table className="w-full table-fixed divide-y divide-gray-200">
                <colgroup>
                  <col className="w-20" />
                  <col className="w-16" />
                  <col className="w-24" />
                  <col className="w-20" />
                  <col className="w-16" />
                  <col className="w-20" />
                  <col className="w-16" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-16" />
                </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiFileText className="w-3 h-3" />
                      <span className="hidden sm:inline">OS</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiRefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">Tipo</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiSmartphone className="w-3 h-3" />
                      <span className="hidden sm:inline">Aparelho</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Serviço</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                      <span className="hidden sm:inline">Prazo</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">Garantia</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FiDollarSign className="w-3 h-3" />
                        <span className="hidden sm:inline">Total</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FiUser className="w-3 h-3" />
                      <span className="hidden sm:inline">Técnico</span>
                    </div>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="hidden sm:inline">Status</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="hidden sm:inline">Status Técnico</span>
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <FiDollarSign className="w-3 h-3" />
                      <span className="hidden sm:inline">Faturado</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginated.map((os) => (
                  <tr 
                    key={os.id} 
                    className={`hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer group ${
                      os.tipo === 'Retorno' ? 'border-l-4 border-l-red-400 bg-red-50/30' : ''
                    }`}
                    onClick={() => router.push(`/ordens/${os.id}`)}
                  >
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-900 text-xs group-hover:text-blue-600 transition-colors">#{os.numero}</span>
                        {os.tipo === 'Retorno' && (
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 font-medium truncate min-w-0 group-hover:text-gray-900 transition-colors">{os.cliente || 'N/A'}</div>
                      <div className="text-xs text-gray-500 truncate">{os.clienteTelefone || 'N/A'}</div>
                      <div className="text-xs text-gray-400 truncate">{formatDate(os.entrada) || 'N/A'}</div>
                    </td>
                    <td className="px-1 py-2">
                      {os.tipo === 'Retorno' ? (
                        <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <FiRefreshCw className="w-3 h-3 mr-0.5" />
                          <span className="hidden sm:inline">Retorno</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <FiPlus className="w-3 h-3 mr-0.5" />
                          <span className="hidden sm:inline">Nova</span>
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs font-medium text-gray-900 truncate min-w-0">{os.aparelho || 'N/A'}</div>
                      {(os.aparelhoCategoria || os.aparelhoMarca) && (
                        <div className="text-xs text-gray-500 truncate">
                          {[os.aparelhoCategoria, os.aparelhoMarca].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs text-gray-900 min-w-0">
                        <div className="font-medium truncate">{os.servico || 'N/A'}</div>
                        <div className="text-gray-600 font-semibold">{formatCurrency(os.valorTotal)}</div>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs text-gray-600 min-w-0">
                        <div className="mb-1">
                          <span className="font-medium text-gray-700">
                            {formatDate(os.prazoEntrega) || 'Não definido'}
                          </span>
                        </div>
                        <div className={`text-xs ${
                          os.entrega && os.entrega !== 'Aguardando retirada' 
                            ? 'text-green-600' 
                            : 'text-gray-500'
                        }`}>
                          {formatDate(os.entrega) || 'Aguardando'}
                        </div>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className={`text-xs font-medium min-w-0 ${
                        os.garantia && new Date(os.garantia) < new Date()
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        <div className="whitespace-nowrap">{formatDate(os.garantia) || 'Aguardando'}</div>
                        {os.garantia && (
                          <div className="text-xs text-gray-500 truncate">
                            {new Date(os.garantia).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                              ? 'Expirada'
                              : `${Math.max(0, Math.ceil((new Date(os.garantia).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))} dias restantes`
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs font-bold text-green-600 whitespace-nowrap min-w-0">
                        {formatCurrency(os.valorTotal) || 'R$ 0,00'}
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs text-gray-900 truncate min-w-0">{os.tecnico || 'N/A'}</div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(os.statusOS)}`}>
                          {os.statusOS || 'N/A'}
                        </span>
                        {os.tipo === 'Retorno' && (
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusTecnicoColor(os.statusTecnico)}`}>
                            {os.statusTecnico || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-1 py-2">
                      <div className="text-xs min-w-0">
                        {os.foiFaturada ? (
                          <>
                            <div className="font-bold text-green-600">
                              Faturado
                            </div>
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              {formatFormaPagamento(os.formaPagamento)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-gray-500 font-medium">
                              Aguardando
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Cards Mobile - Layout responsivo para mobile */}
          <div className="md:hidden space-y-4">
            {paginated.map((os) => (
              <div 
                key={os.id} 
                className={`bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                  os.tipo === 'Retorno' ? 'border-l-4 border-l-red-400 bg-red-50/30' : ''
                }`}
                onClick={() => router.push(`/ordens/${os.id}`)}
              >
                {/* Header do card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">#{os.numero}</span>
                    {os.tipo === 'Retorno' && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(os.statusOS)}`}>
                    {os.statusOS}
                  </div>
                </div>

                {/* Cliente */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-900">{os.cliente || 'N/A'}</div>
                  <div className="text-xs text-gray-600">{os.clienteTelefone || 'N/A'}</div>
                </div>

                {/* Aparelho e Serviço */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-gray-800">{os.aparelho || 'N/A'}</div>
                  <div className="text-xs text-gray-600">{os.servico || 'N/A'}</div>
                </div>

                {/* Informações técnicas */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                  <div>
                    <div className="text-gray-500">Técnico</div>
                    <div className="font-medium text-gray-900">{os.tecnico || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Total</div>
                    <div className="font-medium text-gray-900">{formatCurrency(os.valorTotal)}</div>
                  </div>
                </div>

                {/* Status técnico e faturado */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-gray-500">Status Técnico</div>
                    <div className="font-medium text-gray-900">{os.statusTecnico || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">Faturado</div>
                    <div className={`font-medium ${os.foiFaturada ? 'text-green-600' : 'text-gray-500'}`}>
                      {os.foiFaturada ? 'Faturado' : 'Aguardando'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estado vazio */}
            {!loading && paginated.length === 0 && (
              <div className="text-center py-12">
                <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ordem encontrada</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter || tipoFilter || tecnicoFilter 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Comece criando sua primeira ordem de serviço'
                  }
                </p>
                {!searchTerm && !statusFilter && !tipoFilter && !tecnicoFilter && (
                  <Button
                    onClick={() => router.push("/nova-os")}
                    className="bg-black text-white hover:bg-neutral-800"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Criar Primeira OS
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                  onClick={() => handlePageChange(currentPage - 1)}
                variant="outline"
                size="sm"
                  disabled={currentPage === 1}
                >
                  Anterior
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                variant="outline"
                size="sm"
                  disabled={currentPage === totalPages}
                >
                  Próxima
              </Button>
              </div>
          )}
        
        {/* Alerta de Laudos Prontos */}
        <LaudoProntoAlert />
      </MenuLayout>


    </ProtectedArea>
  );
}
