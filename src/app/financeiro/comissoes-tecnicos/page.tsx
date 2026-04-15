'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessTokenForApi } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import { useToast } from '@/components/Toast';
import { FiDollarSign, FiUsers, FiTrendingUp, FiCalendar, FiFilter, FiDownload, FiFileText, FiX, FiUser, FiEye, FiEdit, FiSave, FiPower, FiToggleLeft, FiToggleRight, FiChevronLeft, FiChevronRight, FiCheckCircle, FiRotateCcw } from 'react-icons/fi';
import { buildComissoesTecnicosPDFBlob } from '@/lib/pdfComissoesTecnicos';
import { useConfirm } from '@/components/ConfirmDialog';

interface ComissaoDetalhada {
  id: string;
  tecnico_id: string;
  tecnico_nome: string;
  ordem_servico_id: string;
  numero_os: string;
  cliente_nome: string;
  servico_nome: string;
  valor_servico: number;
  valor_peca: number;
  valor_total: number;
  tipo_comissao: 'porcentagem' | 'fixo';
  percentual_comissao?: number | null;
  valor_comissao_fixa?: number | null;
  valor_comissao: number;
  data_entrega: string;
  status: string;
  tipo_ordem: string;
  created_at: string;
  ativa?: boolean;
  tecnico_comissao_ativa?: boolean; // Indica se o técnico tem comissão ativa nas configurações
  observacoes?: string | null;
  status_os?: string | null;
  status_tecnico_os?: string | null;
}

interface TecnicoResumo {
  tecnico_id: string;
  nome: string;
  total_comissoes: number;
  total_comissao_valor: number;
  quantidade_os: number;
  media_comissao: number;
  status_paga: number;
  status_calculada: number;
  status_pendente: number;
  status_prevista: number;
}

interface Filtros {
  dataInicio: string;
  dataFim: string;
  tecnicoId: string;
  status: string;
  tipoOrdem: string;
}

export default function ComissoesTecnicosPage() {
  const router = useRouter();
  const { usuarioData, session, empresaData } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [comissoes, setComissoes] = useState<ComissaoDetalhada[]>([]);
  const [tecnicos, setTecnicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [comissaoEditando, setComissaoEditando] = useState<ComissaoDetalhada | null>(null);
  const [comissaoDetalhes, setComissaoDetalhes] = useState<ComissaoDetalhada | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [valorEditado, setValorEditado] = useState<number>(0);
  const [observacoesEditadas, setObservacoesEditadas] = useState<string>('');
  
  // Estado para mês selecionado (formato: YYYY-MM ou 'todos'); padrão = mês corrente (mesmo critério UTC do filtro por data_entrega)
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [pdfListaAssinatura, setPdfListaAssinatura] = useState(false);

  // Estados para filtros
  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    tecnicoId: '',
    status: '',
    tipoOrdem: ''
  });
  
  // Função para formatar mês para exibição
  const formatarMes = (mesString: string | undefined | null) => {
    // Validar se mesString existe e é uma string válida
    if (!mesString || typeof mesString !== 'string' || mesString === 'todos') {
      return 'Todos os meses';
    }
    
    // Validar formato (deve ser YYYY-MM)
    if (!mesString.includes('-') || mesString.split('-').length !== 2) {
      console.warn('⚠️ Formato de mês inválido:', mesString);
      return 'Mês inválido';
    }
    
    try {
      const [ano, mes] = mesString.split('-');
      
      // Validar se ano e mês são números válidos
      if (!ano || !mes || isNaN(parseInt(ano)) || isNaN(parseInt(mes))) {
        console.warn('⚠️ Ano ou mês inválido:', mesString);
        return 'Mês inválido';
      }
      
      const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      
      // Validar se a data é válida
      if (isNaN(data.getTime())) {
        console.warn('⚠️ Data inválida ao formatar mês:', mesString);
        return 'Mês inválido';
      }
      
      return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch (e) {
      console.error('❌ Erro ao formatar mês:', mesString, e);
      return 'Mês inválido';
    }
  };
  
  // Função para navegar entre meses
  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    try {
      // Se estiver em "todos" ou não tiver mês selecionado, usar o mês atual como base
      let mesAtualParaNavegar: string = mesSelecionado || 'todos';
      
      if (!mesSelecionado || mesSelecionado === 'todos') {
        const hoje = new Date();
        if (isNaN(hoje.getTime())) {
          console.error('❌ Data atual inválida');
          return;
        }
        mesAtualParaNavegar = hoje.toISOString().slice(0, 7);
      }
      
      // Verificar se o mês atual para navegar é válido
      if (!mesAtualParaNavegar || mesAtualParaNavegar === 'todos') {
        const hoje = new Date();
        if (isNaN(hoje.getTime())) {
          console.error('❌ Data atual inválida');
          return;
        }
        const mesAtual = hoje.toISOString().slice(0, 7);
        setMesSelecionado(mesAtual);
        return;
      }
      
      // Validar formato
      if (!mesAtualParaNavegar.includes('-') || mesAtualParaNavegar.split('-').length !== 2) {
        console.error('❌ Formato de mês inválido:', mesAtualParaNavegar);
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      const [ano, mes] = mesAtualParaNavegar.split('-');
      
      // Validar se ano e mês são números válidos
      if (!ano || !mes || isNaN(parseInt(ano)) || isNaN(parseInt(mes))) {
        console.error('❌ Ano ou mês inválido:', ano, mes);
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      const anoNum = parseInt(ano);
      const mesNum = parseInt(mes);
      
      // Validar se ano e mês estão em ranges válidos
      if (anoNum < 1900 || anoNum > 2100 || mesNum < 1 || mesNum > 12) {
        console.error('❌ Ano ou mês fora do range válido:', anoNum, mesNum);
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      const dataAtual = new Date(anoNum, mesNum - 1, 1);
      
      // Validar se a data é válida
      if (isNaN(dataAtual.getTime())) {
        console.error('❌ Data criada é inválida:', anoNum, mesNum);
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      if (direcao === 'anterior') {
        dataAtual.setMonth(dataAtual.getMonth() - 1);
      } else {
        dataAtual.setMonth(dataAtual.getMonth() + 1);
      }
      
      // Validar a nova data antes de usar
      if (isNaN(dataAtual.getTime())) {
        console.error('❌ Nova data após navegação é inválida');
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      // Validar novamente antes de chamar toISOString
      const timeValue = dataAtual.getTime();
      if (isNaN(timeValue)) {
        console.error('❌ Time value inválido');
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      const novoMesString = dataAtual.toISOString().slice(0, 7);
      
      // Validar o resultado
      if (!novoMesString || novoMesString.length !== 7 || !novoMesString.includes('-')) {
        console.error('❌ String de mês resultante inválida:', novoMesString);
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          setMesSelecionado(hoje.toISOString().slice(0, 7));
        }
        return;
      }
      
      setMesSelecionado(novoMesString);
    } catch (error) {
      console.error('❌ Erro na função navegarMes:', error);
      // Fallback seguro: usar mês atual
      try {
        const hoje = new Date();
        if (!isNaN(hoje.getTime())) {
          const mesAtual = hoje.toISOString().slice(0, 7);
          setMesSelecionado(mesAtual);
        } else {
          // Se nem mesmo a data atual funciona, usar um mês padrão conhecido
          setMesSelecionado('todos');
        }
      } catch (fallbackError) {
        console.error('❌ Erro no fallback de navegarMes:', fallbackError);
        setMesSelecionado('todos');
      }
    }
  };
  
  // Função para ir para o mês atual
  const irParaMesAtual = () => {
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7);
    setMesSelecionado(mesAtual);
  };
  
  // Detectar todos os meses que têm comissões
  const mesesComComissoes = useMemo(() => {
    const meses = new Set<string>();
    comissoes.forEach(comissao => {
      // Apenas incluir se a comissão e o técnico estiverem ativos
      if (comissao.ativa !== false && comissao.tecnico_comissao_ativa !== false) {
        try {
          const dataEntrega = new Date(comissao.data_entrega);
          if (!isNaN(dataEntrega.getTime())) {
            const mesString = dataEntrega.toISOString().slice(0, 7);
            meses.add(mesString);
          } else {
            console.warn('⚠️ Data de entrega inválida ao detectar meses:', comissao.data_entrega);
          }
        } catch (e) {
          console.error('❌ Erro ao processar data ao detectar meses:', comissao.data_entrega, e);
        }
      }
    });
    
    // Ordenar do mais recente para o mais antigo
    const mesesOrdenados = Array.from(meses).sort().reverse();
    
    console.log('📅 Meses com comissões detectados:', mesesOrdenados);
    
    return mesesOrdenados;
  }, [comissoes]);
  
  // Filtrar comissões por mês selecionado e técnicos ativos
  const comissoesDoMes = useMemo(() => {
    const filtradas = comissoes.filter(comissao => {
      // Filtrar comissões de técnicos desativados
      const comissaoAtiva = comissao.ativa !== false;
      const tecnicoComissaoAtiva = comissao.tecnico_comissao_ativa !== false;
      
      if (!comissaoAtiva || !tecnicoComissaoAtiva) {
        return false;
      }
      
      // Filtrar por mês selecionado (se houver mês selecionado e não for "todos")
      if (mesSelecionado && mesSelecionado !== 'todos') {
        try {
          const dataEntrega = new Date(comissao.data_entrega);
          if (isNaN(dataEntrega.getTime())) {
            console.warn('⚠️ Data de entrega inválida:', comissao.data_entrega);
            return false;
          }
          const mesComissao = dataEntrega.toISOString().slice(0, 7);
          if (mesComissao !== mesSelecionado) {
            return false;
          }
        } catch (e) {
          console.error('❌ Erro ao processar data de entrega:', comissao.data_entrega, e);
          return false;
        }
      }
      
      return true;
    });
    
    // Debug: Log do filtro
    console.log('🔍 Filtro aplicado:', {
      mesSelecionado,
      totalComissoes: comissoes.length,
      comissoesFiltradas: filtradas.length,
      comissoesAtivas: comissoes.filter(c => c.ativa !== false && c.tecnico_comissao_ativa !== false).length
    });
    
    return filtradas;
  }, [comissoes, mesSelecionado]);
  
  // Resumo por técnico (considerando apenas comissões ativas E técnicos com comissão ativa do mês selecionado)
  const resumoPorTecnico = useMemo(() => {
    const resumo = new Map<string, TecnicoResumo>();
    
    // PRIMEIRO: Adicionar todos os técnicos cadastrados (mesmo sem comissões)
    tecnicos.forEach(tec => {
      if (!resumo.has(tec.id)) {
        resumo.set(tec.id, {
          tecnico_id: tec.id,
          nome: tec.nome,
          total_comissoes: 0,
          total_comissao_valor: 0,
          quantidade_os: 0,
          media_comissao: 0,
          status_paga: 0,
          status_calculada: 0,
          status_pendente: 0,
          status_prevista: 0
        });
      }
    });
    
    // DEPOIS: Processar comissões do mês selecionado
    comissoesDoMes.forEach(comissao => {
      if (!resumo.has(comissao.tecnico_id)) {
        resumo.set(comissao.tecnico_id, {
          tecnico_id: comissao.tecnico_id,
          nome: comissao.tecnico_nome,
          total_comissoes: 0,
          total_comissao_valor: 0,
          quantidade_os: 0,
          media_comissao: 0,
          status_paga: 0,
          status_calculada: 0,
          status_pendente: 0,
          status_prevista: 0
        });
      }
      
      const tecnico = resumo.get(comissao.tecnico_id)!;
      tecnico.quantidade_os += 1;
      tecnico.total_comissao_valor += comissao.valor_comissao;
      tecnico.total_comissoes += 1;
      
      const statusUpper = (comissao.status || '').toUpperCase();
      if (statusUpper === 'PAGA') tecnico.status_paga += 1;
      else if (statusUpper === 'CALCULADA') tecnico.status_calculada += 1;
      else if (statusUpper === 'PREVISTA') tecnico.status_prevista += 1;
      else tecnico.status_pendente += 1;
    });
    
    // Calcular média
    resumo.forEach(tecnico => {
      tecnico.media_comissao = tecnico.quantidade_os > 0 
        ? tecnico.total_comissao_valor / tecnico.quantidade_os 
        : 0;
    });
    
    // Ordenar: técnicos com comissões primeiro, depois por valor
    return Array.from(resumo.values()).sort((a, b) => {
      // Se um tem comissões e outro não, o com comissões vem primeiro
      if (a.quantidade_os > 0 && b.quantidade_os === 0) return -1;
      if (a.quantidade_os === 0 && b.quantidade_os > 0) return 1;
      // Se ambos têm ou não têm, ordenar por valor
      return b.total_comissao_valor - a.total_comissao_valor;
    });
  }, [comissoesDoMes, tecnicos]);

  // Métricas gerais do mês selecionado (considerando apenas comissões ativas E técnicos com comissão ativa)
  const metricas = useMemo(() => {
    // Usar comissões do mês selecionado (já filtradas por técnicos ativos)
    const total = comissoesDoMes.reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalOSs = comissoesDoMes.length;
    const mediaGeral = totalOSs > 0 ? total / totalOSs : 0;
    const totalTecnicos = resumoPorTecnico.length;
    const totalPago = comissoesDoMes.filter(c => c.status === 'PAGA').reduce((acc, c) => acc + c.valor_comissao, 0);
    const totalCalculado = comissoesDoMes.filter(c => c.status === 'CALCULADA').reduce((acc, c) => acc + c.valor_comissao, 0);
    
    return {
      totalComissao: total,
      totalOSs,
      mediaGeral,
      totalTecnicos,
      totalPago,
      totalCalculado
    };
  }, [comissoesDoMes, resumoPorTecnico]);

  // Filtrar comissões com filtros adicionais (técnico, status, tipo)
  const comissoesFiltradas = useMemo(() => {
    return comissoesDoMes.filter(comissao => {
      const tecnicoMatch = !filtros.tecnicoId || comissao.tecnico_id === filtros.tecnicoId;
      const statusMatch = !filtros.status || comissao.status === filtros.status;
      const tipoMatch = !filtros.tipoOrdem || comissao.tipo_ordem === filtros.tipoOrdem;
      
      return tecnicoMatch && statusMatch && tipoMatch;
    });
  }, [comissoesDoMes, filtros]);

  const empresaId = usuarioData?.empresa_id ?? null;
  const accessToken = session?.access_token ?? null;
  useEffect(() => {
    if (empresaId) {
      fetchData();
    }
  }, [empresaId, accessToken]);

  const fetchData = async () => {
    if (!usuarioData?.empresa_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getAccessTokenForApi();
      if (!token) {
        addToast('error', 'Sessão expirada ou indisponível. Faça login novamente.');
        setComissoes([]);
        setTecnicos([]);
        return;
      }
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/comissoes/lista', {
        headers,
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast('error', data.error || 'Erro ao carregar comissões');
        setComissoes([]);
        setTecnicos([]);
        return;
      }
      setTecnicos(data.tecnicos || []);
      setComissoes(data.comissoes || []);
      setCampoAtivaExiste(true);
    } catch (error) {
      console.error('Erro ao carregar comissões:', error);
      addToast('error', 'Erro ao carregar dados: ' + (error as Error).message);
      setComissoes([]);
    } finally {
      setLoading(false);
    }
  };

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
    switch (status?.toUpperCase()) {
      case 'PAGA':
        return 'bg-green-100 text-green-800';
      case 'CALCULADA':
        return 'bg-blue-100 text-blue-800';
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800';
      case 'PREVISTA':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Verificar se é admin - considerar também usuarioteste como admin para funcionalidades
  const isAdmin = Boolean(usuarioData?.nivel === 'admin' || usuarioData?.nivel === 'usuarioteste');
  const [campoAtivaExiste, setCampoAtivaExiste] = useState<boolean | null>(null);

  // Debug: verificar nível do usuário
  useEffect(() => {
    if (usuarioData) {
      console.log('🔍 Debug Comissões - Nível do usuário:', usuarioData.nivel, 'isAdmin:', isAdmin, 'usuarioData completo:', usuarioData);
    } else {
      console.log('🔍 Debug Comissões - usuarioData ainda não carregou');
    }
  }, [usuarioData, isAdmin]);

  const handleEditarComissao = (comissao: ComissaoDetalhada) => {
    setComissaoEditando(comissao);
    setValorEditado(comissao.valor_comissao);
    setObservacoesEditadas(comissao.observacoes || '');
  };

  const handleSalvarEdicao = async () => {
    if (!comissaoEditando) return;

    setSalvando(true);
    try {
      console.log('💾 Salvando edição de comissão:', {
        comissaoId: comissaoEditando.id,
        valorComissao: valorEditado,
        observacoes: observacoesEditadas
      });

      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comissaoId: comissaoEditando.id,
          valorComissao: valorEditado,
          observacoes: observacoesEditadas,
        }),
      });

      // Ler a resposta como texto primeiro para verificar se é HTML
      const responseText = await response.text();
      console.log('📥 Resposta da API (texto):', responseText.substring(0, 200));

      // Verificar se a resposta é HTML
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('❌ Resposta HTML recebida em vez de JSON');
        addToast('error', 'Erro de conexão. A resposta do servidor não é válida. Por favor, recarregue a página ou faça login novamente.');
        return;
      }

      // Tentar fazer parse do JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
        console.error('❌ Texto recebido:', responseText);
        addToast('error', 'Erro ao processar resposta do servidor. Verifique o console para mais detalhes.');
        return;
      }

      if (!response.ok) {
        console.error('❌ Erro na resposta da API:', result);
        const errorMsg = result?.error || 'Erro desconhecido ao atualizar comissão';
        addToast('error', errorMsg);
        return;
      }

      if (!result.data) {
        console.error('❌ Nenhum dado retornado após atualizar');
        addToast('error', 'Erro ao atualizar: nenhum dado retornado');
        return;
      }

      // Recarregar dados do banco para garantir sincronização
      await fetchData();

      addToast('success', 'Comissão atualizada com sucesso!');
      setComissaoEditando(null);
    } catch (error: any) {
      console.error('❌ Erro ao salvar edição:', error);
      console.error('❌ Tipo do erro:', typeof error);
      console.error('❌ Mensagem:', error?.message);
      
      let mensagemErro = 'Erro inesperado ao atualizar comissão';
      if (error?.message?.includes('JSON') || error?.message?.includes('DOCTYPE') || error?.message?.includes('<html')) {
        mensagemErro = 'Erro de conexão. Por favor, recarregue a página ou faça login novamente.';
      } else if (error?.message) {
        mensagemErro = error.message;
      }
      
      addToast('error', mensagemErro);
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtiva = async (comissao: ComissaoDetalhada) => {
    const confirmado = await confirm({
      title: comissao.ativa ? 'Desativar Comissão' : 'Ativar Comissão',
      message: comissao.ativa 
        ? `Tem certeza que deseja desativar esta comissão? Ela não será mais considerada nos cálculos.`
        : `Tem certeza que deseja ativar esta comissão?`,
      confirmText: comissao.ativa ? 'Desativar' : 'Ativar',
      cancelText: 'Cancelar',
    });

    if (!confirmado) return;

    setSalvando(true);
    try {
      // Debug: verificar se há cookies antes de fazer a requisição
      console.log('🔍 Debug - Fazendo requisição para atualizar comissão:', {
        comissaoId: comissao.id,
        ativa: !comissao.ativa,
        url: '/api/comissoes/atualizar'
      });

      // Obter token de autenticação da sessão
      const token = session?.access_token;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Adicionar token de autenticação se disponível
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comissaoId: comissao.id,
          ativa: !comissao.ativa,
        }),
      });

      // Ler a resposta como texto primeiro para verificar se é HTML
      const responseText = await response.text();
      console.log('📥 Resposta da API (texto):', responseText.substring(0, 200));

      // Verificar se a resposta é HTML
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('❌ Resposta HTML recebida em vez de JSON');
        addToast('error', 'Erro de conexão. A resposta do servidor não é válida. Por favor, recarregue a página ou faça login novamente.');
        return;
      }

      // Tentar fazer parse do JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse da resposta JSON:', parseError);
        console.error('❌ Texto recebido:', responseText);
        addToast('error', 'Erro ao processar resposta do servidor. Verifique o console para mais detalhes.');
        return;
      }

      if (!response.ok) {
        console.error('❌ Erro na resposta da API:', result);
        const errorMsg = result?.error || 'Erro desconhecido ao atualizar comissão';
        addToast('error', errorMsg);
        return;
      }

      if (!result.data) {
        console.error('❌ Nenhum dado retornado após atualizar');
        addToast('error', 'Erro ao atualizar: nenhum dado retornado');
        return;
      }

      // Mostrar mensagem de sucesso
      addToast('success', comissao.ativa 
        ? 'Comissão desativada com sucesso. Ela não será mais considerada nos cálculos.'
        : 'Comissão ativada com sucesso. Ela será considerada nos cálculos.'
      );

      // Recarregar dados do banco para garantir sincronização
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      addToast('error', 'Erro inesperado ao atualizar comissão');
    } finally {
      setSalvando(false);
    }
  };

  const handleVerDetalhes = (comissao: ComissaoDetalhada) => {
    setComissaoDetalhes(comissao);
  };

  const atualizarStatusComissao = async (comissao: ComissaoDetalhada, novoStatus: 'PAGA' | 'CALCULADA' | 'PENDENTE') => {
    if (comissao.id.startsWith('prevista-')) {
      addToast('error', 'Comissões previstas só podem ser pagas após a OS ser finalizada.');
      return;
    }
    setSalvando(true);
    try {
      const response = await fetch('/api/comissoes/atualizar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comissaoId: comissao.id, status: novoStatus }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        addToast('error', result?.error || 'Erro ao atualizar status');
        return;
      }
      addToast('success', novoStatus === 'PAGA' ? 'Comissão marcada como paga.' : 'Status revertido.');
      await fetchData();
    } catch (e) {
      addToast('error', 'Erro ao atualizar status da comissão');
    } finally {
      setSalvando(false);
    }
  };

  const handleMarcarComoPaga = async (comissao: ComissaoDetalhada) => {
    const confirmado = await confirm({
      title: 'Marcar como paga',
      message: `Confirmar pagamento da comissão de ${formatCurrency(comissao.valor_comissao)} ao técnico ${comissao.tecnico_nome} (OS #${comissao.numero_os})?`,
      confirmText: 'Marcar como paga',
      cancelText: 'Cancelar',
    });
    if (confirmado) await atualizarStatusComissao(comissao, 'PAGA');
  };

  const handleReverterParaCalculada = async (comissao: ComissaoDetalhada) => {
    const confirmado = await confirm({
      title: 'Reverter status',
      message: `Reverter esta comissão para "Calculada"? O técnico voltará a vê-la como pendente.`,
      confirmText: 'Reverter',
      cancelText: 'Cancelar',
    });
    if (confirmado) await atualizarStatusComissao(comissao, 'CALCULADA');
  };

  const exportarCSV = () => {
    const headers = ['Técnico', 'OS', 'Cliente', 'Serviço', 'Data Entrega', 'Valor Total', 'Tipo', 'Percentual/Fixo', 'Comissão', 'Status', 'Status OS'];
    const csvContent = [
      headers.join(','),
      ...comissoesFiltradas.map(c => [
        c.tecnico_nome,
        c.numero_os || 'N/A',
        c.cliente_nome || 'N/A',
        c.servico_nome || 'N/A',
        formatDate(c.data_entrega),
        c.valor_total.toFixed(2),
        c.tipo_comissao === 'fixo' ? 'Fixo' : 'Porcentagem',
        c.tipo_comissao === 'fixo' 
          ? `R$ ${c.valor_comissao_fixa?.toFixed(2) || '0,00'}` 
          : `${c.percentual_comissao || 0}%`,
        c.valor_comissao.toFixed(2),
        c.status,
        c.status_os || '—'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comissoes_tecnicos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportarPDF = async () => {
    if (comissoesFiltradas.length === 0) {
      addToast('error', 'Não há comissões para exportar com os filtros atuais.');
      return;
    }
    try {
      const filtrosLinhas: string[] = [];
      if (filtros.tecnicoId) {
        const nomeTec = tecnicos.find((t) => t.id === filtros.tecnicoId)?.nome;
        filtrosLinhas.push(`Técnico: ${nomeTec || filtros.tecnicoId}`);
      }
      if (filtros.status) filtrosLinhas.push(`Status da comissão: ${filtros.status}`);
      if (filtros.tipoOrdem) filtrosLinhas.push(`Tipo de OS: ${filtros.tipoOrdem}`);
      if (filtrosLinhas.length === 0) filtrosLinhas.push('Filtros adicionais: nenhum');

      const nomeTecFiltro = filtros.tecnicoId
        ? tecnicos.find((t) => t.id === filtros.tecnicoId)?.nome
        : undefined;
      const blob = await buildComissoesTecnicosPDFBlob({
        periodoLabel: formatarMes(mesSelecionado),
        filtrosLinhas,
        comissoes: comissoesFiltradas,
        formatCurrency,
        formatDate,
        empresaNome: empresaData?.nome,
        logoUrl: empresaData?.logo_url,
        cnpj: empresaData?.cnpj,
        incluirAssinaturaTecnico: pdfListaAssinatura && Boolean(filtros.tecnicoId && nomeTecFiltro),
        nomeParaAssinatura: nomeTecFiltro,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comissoes_tecnicos_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('success', 'PDF exportado com sucesso.');
    } catch (e) {
      console.error('Erro ao gerar PDF de comissões:', e);
      addToast('error', 'Não foi possível gerar o PDF. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando comissões...</p>
          </div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <AuthGuard>
      <MenuLayout>
      <div className="p-3 md:-m-8 md:p-4 lg:p-6 space-y-4 md:space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <FiUsers className="text-blue-600 flex-shrink-0" size={28} />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Comissões dos Técnicos</h1>
              <p className="text-sm md:text-base text-gray-600">
                Resumo e gestão de comissões de todos os técnicos
                {isAdmin && <span className="ml-2 text-xs text-green-600">(Modo Admin - Edição habilitada)</span>}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
              >
                <FiFilter size={16} />
                <span className="hidden sm:inline">Filtros</span>
              </button>

              <button
                type="button"
                title="Exportar planilha CSV"
                onClick={exportarCSV}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
              >
                <FiDownload size={16} />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                type="button"
                title="Exportar relatório em PDF"
                onClick={exportarPDF}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm md:text-base"
              >
                <FiFileText size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
            {filtros.tecnicoId ? (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none max-w-[280px] justify-end text-right sm:text-left sm:justify-start">
                <input
                  type="checkbox"
                  checked={pdfListaAssinatura}
                  onChange={(e) => setPdfListaAssinatura(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                />
                <span>Incluir total e assinatura do técnico no PDF</span>
              </label>
            ) : null}
          </div>
        </div>

        {/* Filtros */}
        {mostrarFiltros && (
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900">Filtros</h3>
              <button
                onClick={() => setMostrarFiltros(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Técnico</label>
                <select
                  value={filtros.tecnicoId}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tecnicoId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {tecnicos.map(tecnico => (
                    <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="CALCULADA">Calculada</option>
                  <option value="PAGA">Paga</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={filtros.tipoOrdem}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipoOrdem: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="SERVICO">Serviço</option>
                  <option value="RETORNO">Retorno</option>
                  <option value="GARANTIA">Garantia</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Abas por Mês */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 md:gap-4 overflow-x-auto flex-1">
              {/* Navegação de Mês */}
              <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg px-2 md:px-3 py-1.5 md:py-2 flex-shrink-0">
                <button
                  onClick={() => navegarMes('anterior')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Mês anterior"
                >
                  <FiChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                
                <div className="flex items-center space-x-2 px-2 md:px-3">
                  <FiCalendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 min-w-[120px] md:min-w-[140px] text-center whitespace-nowrap">
                    {formatarMes(mesSelecionado || 'todos')}
                  </span>
                </div>
                
                <button
                  onClick={() => navegarMes('proximo')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Próximo mês"
                >
                  <FiChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <button
                onClick={irParaMesAtual}
                className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0"
              >
                Hoje
              </button>
              
              {/* Abas dos meses com comissões */}
              <div className="flex gap-1 md:gap-2 overflow-x-auto flex-1">
                {/* Aba "Todos" */}
                <button
                  onClick={() => setMesSelecionado('todos')}
                  className={`px-3 md:px-4 py-1.5 md:py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    mesSelecionado === 'todos'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Todos
                  <span className={`ml-1.5 md:ml-2 px-1.5 md:px-2 py-0.5 text-xs rounded-full ${
                    mesSelecionado === 'todos' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {comissoes.filter(c => c.ativa !== false && c.tecnico_comissao_ativa !== false).length}
                  </span>
                </button>
                
                {mesesComComissoes.map((mes) => {
                  const comissoesMesAtual = comissoes.filter(c => {
                    try {
                      if (c.ativa === false || c.tecnico_comissao_ativa === false) {
                        return false;
                      }
                      const dataEntrega = new Date(c.data_entrega);
                      if (isNaN(dataEntrega.getTime())) {
                        return false;
                      }
                      const mesComissao = dataEntrega.toISOString().slice(0, 7);
                      return mesComissao === mes;
                    } catch (e) {
                      console.error('❌ Erro ao filtrar comissão por mês:', e);
                      return false;
                    }
                  });
                  const totalMes = comissoesMesAtual.reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
                  const countMes = comissoesMesAtual.length;
                  
                  return (
                    <button
                      key={mes}
                      onClick={() => setMesSelecionado(mes)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 font-medium text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                        mesSelecionado === mes
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {(() => {
                        const [ano, mesNum] = mes.split('-');
                        const data = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
                        return data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
                      })()}
                      <span className={`ml-1.5 md:ml-2 px-1.5 md:px-2 py-0.5 text-xs rounded-full ${
                        mesSelecionado === mes ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {countMes}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Gerais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <FiDollarSign className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Total de Comissões</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">{formatCurrency(metricas.totalComissao)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-100 rounded-lg flex-shrink-0">
                <FiUsers className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Técnicos</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{metricas.totalTecnicos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <FiTrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Média por OS</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">{formatCurrency(metricas.mediaGeral)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <FiCalendar className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-gray-600 truncate">Total OSs</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{metricas.totalOSs}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo por Técnico */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 md:p-6 border-b border-gray-200">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Resumo por Técnico ({resumoPorTecnico.length} técnicos)
            </h3>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {resumoPorTecnico.map((tecnico) => (
              <div 
                key={tecnico.tecnico_id} 
                className="p-3 md:p-4 space-y-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                onClick={() => router.push(`/financeiro/comissoes-tecnicos/${tecnico.tecnico_id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiUser className="text-gray-400 flex-shrink-0" size={18} />
                    <div className="text-sm font-semibold text-gray-900">{tecnico.nome}</div>
                  </div>
                  <FiChevronRight className="text-gray-400" size={18} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">OSs</p>
                    <p className="text-sm font-medium text-gray-900">{tecnico.quantidade_os}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Comissões</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(tecnico.total_comissao_valor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Média por OS</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(tecnico.media_comissao)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        P: {tecnico.status_paga}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        C: {tecnico.status_calculada}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pe: {tecnico.status_pendente}
                      </span>
                      {tecnico.status_prevista > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Prev: {tecnico.status_prevista}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {resumoPorTecnico.length === 0 && (
              <div className="text-center py-12">
                <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum técnico encontrado</h3>
                <p className="text-gray-500 text-sm">Não há comissões registradas para o período selecionado.</p>
              </div>
            )}
          </div>

          {/* Versão Desktop - Tabela */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Técnico
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    OSs
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Total Comissões
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                    Média por OS
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Paga
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Calculada
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">
                    Pendente
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                    Prevista
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumoPorTecnico.map((tecnico) => (
                  <tr 
                    key={tecnico.tecnico_id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/financeiro/comissoes-tecnicos/${tecnico.tecnico_id}`)}
                    title="Clique para ver detalhes e realizar saques"
                  >
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FiUser className="text-gray-400 mr-2 flex-shrink-0" size={16} />
                        <div className="text-sm font-medium text-gray-900 truncate">{tecnico.nome}</div>
                        <FiChevronRight className="ml-2 text-gray-400" size={14} />
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{tecnico.quantidade_os}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(tecnico.total_comissao_valor)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right hidden sm:table-cell">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(tecnico.media_comissao)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {tecnico.status_paga}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {tecnico.status_calculada}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {tecnico.status_pendente}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden lg:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {tecnico.status_prevista}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resumoPorTecnico.length === 0 && (
            <div className="hidden md:block text-center py-12">
              <FiUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum técnico encontrado</h3>
              <p className="text-gray-500">Não há comissões registradas para o período selecionado.</p>
            </div>
          )}
        </div>

        {/* Modal de Edição */}
        {comissaoEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Editar Comissão</h3>
                  <button
                    onClick={() => setComissaoEditando(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Técnico
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {comissaoEditando.tecnico_nome}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OS
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    #{comissaoEditando.numero_os}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Total da OS
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {formatCurrency(comissaoEditando.valor_total)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Comissão
                  </label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {comissaoEditando.tipo_comissao === 'fixo' 
                      ? `Fixo: ${formatCurrency(comissaoEditando.valor_comissao_fixa || 0)}`
                      : `Porcentagem: ${comissaoEditando.percentual_comissao || 0}%`
                    }
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor da Comissão *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorEditado}
                    onChange={(e) => setValorEditado(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={observacoesEditadas}
                    onChange={(e) => setObservacoesEditadas(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Adicione observações sobre esta comissão..."
                  />
                </div>
              </div>

              <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setComissaoEditando(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarEdicao}
                  disabled={salvando}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {salvando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FiSave size={16} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalhes */}
        {comissaoDetalhes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">Detalhes da Comissão</h3>
                  <button
                    onClick={() => setComissaoDetalhes(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={20} />
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                    <div className="text-gray-900">{comissaoDetalhes.tecnico_nome}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OS</label>
                    <div className="text-gray-900">#{comissaoDetalhes.numero_os}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <div className="text-gray-900">{comissaoDetalhes.cliente_nome}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Entrega</label>
                    <div className="text-gray-900">{formatDate(comissaoDetalhes.data_entrega)}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                  <div className="text-gray-900">{comissaoDetalhes.servico_nome}</div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Valores</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Valor do Serviço</label>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(comissaoDetalhes.valor_servico)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Valor das Peças</label>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(comissaoDetalhes.valor_peca)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Valor Total</label>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(comissaoDetalhes.valor_total)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Comissão</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                      <div className="text-gray-900">
                        {comissaoDetalhes.tipo_comissao === 'fixo' ? 'Fixo' : 'Porcentagem'}
                      </div>
                    </div>
                    {comissaoDetalhes.tipo_comissao === 'fixo' ? (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Valor Fixo</label>
                        <div className="text-gray-900">
                          {formatCurrency(comissaoDetalhes.valor_comissao_fixa || 0)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Percentual</label>
                        <div className="text-gray-900">
                          {comissaoDetalhes.percentual_comissao || 0}%
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">Valor da Comissão</label>
                      <div className="text-xl font-bold text-green-600">
                        {formatCurrency(comissaoDetalhes.valor_comissao)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(comissaoDetalhes.status)}`}>
                        {comissaoDetalhes.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status Ativo</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        comissaoDetalhes.ativa 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {comissaoDetalhes.ativa ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ordem</label>
                      <div className="text-gray-900 capitalize">{comissaoDetalhes.tipo_ordem}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data de Cálculo</label>
                      <div className="text-gray-900">{formatDate(comissaoDetalhes.created_at)}</div>
                    </div>
                  </div>
                </div>

                {comissaoDetalhes.observacoes && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                      {comissaoDetalhes.observacoes}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setComissaoDetalhes(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MenuLayout>
    </AuthGuard>
  );
}

