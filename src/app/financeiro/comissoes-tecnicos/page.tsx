'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import MenuLayout from '@/components/MenuLayout';
import AuthGuard from '@/components/AuthGuard';
import { useToast } from '@/components/Toast';
import { FiDollarSign, FiUsers, FiTrendingUp, FiCalendar, FiFilter, FiDownload, FiX, FiUser, FiEye, FiEdit, FiSave, FiPower, FiToggleLeft, FiToggleRight, FiChevronLeft, FiChevronRight, FiCheckCircle, FiRotateCcw } from 'react-icons/fi';
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
  const { usuarioData, session } = useAuth();
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
  
  // Estado para mês selecionado (formato: YYYY-MM ou 'todos')
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => {
    // Começar com o mês atual
    const hoje = new Date();
    return hoje.toISOString().slice(0, 7); // YYYY-MM
  });
  
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
  
  // Quando as comissões forem carregadas pela primeira vez, garantir que está no mês atual
  // Este useEffect só roda uma vez após o carregamento inicial das comissões
  const [comissoesCarregadas, setComissoesCarregadas] = useState(false);
  
  useEffect(() => {
    if (!comissoesCarregadas && comissoes.length >= 0) {
      // Primeira vez que as comissões são carregadas (pode ser array vazio)
      const hoje = new Date();
      const mesAtual = hoje.toISOString().slice(0, 7);
      
      // Se ainda não está no mês atual, mudar para o mês atual
      if (mesSelecionado !== mesAtual) {
        console.log('🔄 Primeira carga - Ajustando para mês atual:', mesAtual);
        setMesSelecionado(mesAtual);
      }
      
      setComissoesCarregadas(true);
    }
  }, [comissoes.length, mesSelecionado, comissoesCarregadas]);

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

  useEffect(() => {
    if (usuarioData?.empresa_id) {
      fetchData();
    }
  }, [usuarioData]);

  const fetchData = async () => {
    if (!usuarioData?.empresa_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Buscar técnicos da empresa (incluindo auth_user_id para mapeamento)
      const { data: tecnicosData, error: tecnicosError } = await supabase
        .from('usuarios')
        .select('id, nome, auth_user_id')
        .eq('empresa_id', usuarioData.empresa_id)
        .eq('nivel', 'tecnico')
        .order('nome');

      if (tecnicosError) {
        console.error('Erro ao buscar técnicos:', tecnicosError);
        addToast('error', 'Erro ao carregar técnicos');
      } else {
        console.log('👥 Técnicos encontrados:', tecnicosData?.length, tecnicosData?.map((t: any) => ({ id: t.id, nome: t.nome, auth_user_id: t.auth_user_id })));
        setTecnicos(tecnicosData || []);
      }
      
      // Criar mapa de auth_user_id -> técnico para resolver IDs inconsistentes
      const authIdToTecnico = new Map<string, { id: string; nome: string }>();
      const tecnicoIdToTecnico = new Map<string, { id: string; nome: string }>();
      (tecnicosData || []).forEach((t: any) => {
        tecnicoIdToTecnico.set(t.id, { id: t.id, nome: t.nome });
        if (t.auth_user_id) {
          authIdToTecnico.set(t.auth_user_id, { id: t.id, nome: t.nome });
        }
      });
      
      console.log('🗺️ Mapas de técnicos criados:', {
        porId: Array.from(tecnicoIdToTecnico.entries()),
        porAuthId: Array.from(authIdToTecnico.entries())
      });

      // Buscar comissões de todos os técnicos da empresa
      // Tentar buscar com o campo ativa primeiro
      let query = supabase
        .from('comissoes_historico')
        .select(`
          id,
          tecnico_id,
          ordem_servico_id,
          valor_servico,
          valor_peca,
          valor_total,
          tipo_comissao,
          percentual_comissao,
          valor_comissao_fixa,
          valor_comissao,
          data_entrega,
          status,
          tipo_ordem,
          created_at,
          observacoes,
          ativa,
          tecnico:tecnico_id (
            id,
            nome,
            comissao_ativa
          ),
          ordens_servico:ordem_servico_id (
            numero_os,
            servico
          ),
          clientes:cliente_id (
            nome
          )
        `)
        .eq('empresa_id', usuarioData.empresa_id)
        .order('data_entrega', { ascending: false })
        .order('created_at', { ascending: false });

      let { data: comissoesData, error } = await query;

      // Se der erro por campo não existir, tentar sem o campo ativa
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        console.log('⚠️ Campo ativa não existe, buscando sem ele...');
        const { data: dataRetry, error: errorRetry } = await supabase
          .from('comissoes_historico')
          .select(`
            id,
            tecnico_id,
            ordem_servico_id,
            valor_servico,
            valor_peca,
            valor_total,
            tipo_comissao,
            percentual_comissao,
            valor_comissao_fixa,
            valor_comissao,
            data_entrega,
            status,
            tipo_ordem,
            created_at,
            observacoes,
            ativa,
            tecnico:tecnico_id (
              nome,
              comissao_ativa
            ),
            ordens_servico:ordem_servico_id (
              numero_os,
              servico
            ),
            clientes:cliente_id (
              nome
            )
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .order('data_entrega', { ascending: false })
          .order('created_at', { ascending: false });

        if (errorRetry) {
          console.error('❌ Erro ao buscar comissões:', errorRetry);
          addToast('error', 'Erro ao carregar comissões: ' + (errorRetry.message || 'Erro desconhecido'));
          setComissoes([]);
          return;
        }

        // Garantir que dataRetry tenha as propriedades ativa e tecnico_comissao_ativa mesmo se as colunas não existirem no banco
        comissoesData = (dataRetry || []).map((item: any) => ({
          ...item,
          ativa: item.ativa !== undefined ? item.ativa : true,
          // Garantir que o técnico tenha a propriedade comissao_ativa
          tecnico: {
            ...item.tecnico,
            comissao_ativa: item.tecnico?.comissao_ativa !== undefined && item.tecnico?.comissao_ativa !== null
              ? item.tecnico.comissao_ativa
              : true
          }
        }));
        error = null;
      }

      if (error) {
        console.error('❌ Erro ao buscar comissões:', error);
        addToast('error', 'Erro ao carregar comissões: ' + (error.message || 'Erro desconhecido'));
        setComissoes([]);
        return;
      }

      // Debug: Log das comissões brutas (antes do mapeamento)
      console.log('📦 Comissões brutas do banco:', (comissoesData || []).map((c: any) => ({
        id: c.id,
        tecnico_id: c.tecnico_id,
        tecnico_nome_join: c.tecnico?.nome,
        tecnico_id_join: c.tecnico?.id,
        valor: c.valor_comissao,
        status: c.status
      })));
      
      // Formatar os dados
      const comissoesFormatadas = (comissoesData || []).map((comissao: any) => {
        // Resolver o técnico: pode vir do join ou do mapeamento (se tecnico_id for auth_user_id)
        let tecnicoResolvido = comissao.tecnico;
        let tecnicoIdFinal = comissao.tecnico?.id || comissao.tecnico_id;
        
        // Se o join não retornou técnico, tentar resolver pelo mapeamento
        if (!tecnicoResolvido || !tecnicoResolvido.nome) {
          // Tentar primeiro pelo ID direto
          if (tecnicoIdToTecnico.has(comissao.tecnico_id)) {
            tecnicoResolvido = tecnicoIdToTecnico.get(comissao.tecnico_id);
            tecnicoIdFinal = tecnicoResolvido!.id;
          }
          // Tentar pelo auth_user_id
          else if (authIdToTecnico.has(comissao.tecnico_id)) {
            tecnicoResolvido = authIdToTecnico.get(comissao.tecnico_id);
            tecnicoIdFinal = tecnicoResolvido!.id;
          }
        }
        
        return {
        id: comissao.id,
        // Usar o ID normalizado (sempre usuarios.id)
        tecnico_id: tecnicoIdFinal,
        tecnico_nome: tecnicoResolvido?.nome || 'Técnico não encontrado',
        ordem_servico_id: comissao.ordem_servico_id,
        numero_os: comissao.ordens_servico?.numero_os || 'N/A',
        cliente_nome: comissao.clientes?.nome || 'Cliente não encontrado',
        servico_nome: comissao.ordens_servico?.servico || 'Serviço não especificado',
        valor_servico: comissao.valor_servico || 0,
        valor_peca: comissao.valor_peca || 0,
        valor_total: comissao.valor_total || 0,
        tipo_comissao: comissao.tipo_comissao || 'porcentagem',
        percentual_comissao: comissao.percentual_comissao,
        valor_comissao_fixa: comissao.valor_comissao_fixa,
        valor_comissao: comissao.valor_comissao || 0,
        data_entrega: comissao.data_entrega,
        status: comissao.status || 'CALCULADA',
        tipo_ordem: comissao.tipo_ordem || 'normal',
        created_at: comissao.created_at,
        // Campo ativa pode não existir ainda - usar true como padrão
        ativa: comissao.ativa !== undefined && comissao.ativa !== null ? comissao.ativa : true,
        // Verificar se o técnico tem comissão ativa (se NULL, considera true para compatibilidade)
        tecnico_comissao_ativa: comissao.tecnico?.comissao_ativa !== undefined && comissao.tecnico?.comissao_ativa !== null 
          ? comissao.tecnico.comissao_ativa 
          : true,
        observacoes: comissao.observacoes || null
      };
      });

      // ==================== COMISSÕES PREVISTAS ====================
      // Buscar OS que ainda não têm comissão registrada mas têm técnico atribuído
      let comissoesPrevistas: ComissaoDetalhada[] = [];
      const osComComissao = new Set((comissoesFormatadas || []).map((c: ComissaoDetalhada) => c.ordem_servico_id));
      
      // Buscar configurações de comissão por técnico e da empresa
      const tecnicoIds = (tecnicosData || []).map((t: any) => t.id);
      
      if (tecnicoIds.length > 0) {
        // Buscar configurações de comissão dos técnicos
        const { data: tecnicosConfigData } = await supabase
          .from('usuarios')
          .select('id, nome, tipo_comissao, comissao_fixa, comissao_percentual, comissao_ativa')
          .in('id', tecnicoIds);
        
        // Buscar configuração padrão da empresa
        const { data: configEmpresa } = await supabase
          .from('configuracoes_comissao')
          .select('tipo_comissao, comissao_fixa_padrao, comissao_padrao')
          .eq('empresa_id', usuarioData.empresa_id)
          .single();
        
        // Buscar OS que têm técnico mas ainda não finalizadas
        const { data: ordensData, error: ordensError } = await supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            empresa_id,
            cliente_id,
            tecnico_id,
            valor_faturado,
            valor_servico,
            valor_peca,
            status,
            status_tecnico,
            tipo,
            data_entrega,
            created_at,
            clientes:cliente_id ( nome ),
            servico,
            tecnico:tecnico_id ( id, nome, tipo_comissao, comissao_fixa, comissao_percentual, comissao_ativa )
          `)
          .eq('empresa_id', usuarioData.empresa_id)
          .not('tecnico_id', 'is', null)
          .order('created_at', { ascending: false });
        
        if (!ordensError && ordensData && ordensData.length > 0) {
          const normalizeStatus = (s: string | null | undefined) =>
            (s || '').toUpperCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
          
          comissoesPrevistas = ordensData
            .filter((os: any) => {
              // Ignorar se já tem comissão registrada
              if (osComComissao.has(os.id)) return false;
              
              // Ignorar se não tem valor
              const valorServico = (os.valor_servico as number | null) ?? 0;
              if (!valorServico || valorServico <= 0) return false;
              
              // Ignorar se já finalizadas (essas devem ter comissão real)
              const status = normalizeStatus(os.status);
              const statusTec = normalizeStatus(os.status_tecnico);
              const finalizada = status === 'ENTREGUE' || statusTec === 'FINALIZADA';
              if (finalizada) return false;
              
              return true;
            })
            .map((os: any) => {
              const valorServico = (os.valor_servico as number | null) ?? 0;
              let tecnicoConfig = os.tecnico;
              
              // Se o join não retornou técnico, tentar resolver pelo mapeamento
              let tecnicoIdFinal = tecnicoConfig?.id || os.tecnico_id;
              let tecnicoNome = tecnicoConfig?.nome;
              
              if (!tecnicoConfig || !tecnicoConfig.nome) {
                // Tentar pelo ID direto
                if (tecnicoIdToTecnico.has(os.tecnico_id)) {
                  const tecnicoResolvidoMap = tecnicoIdToTecnico.get(os.tecnico_id)!;
                  tecnicoIdFinal = tecnicoResolvidoMap.id;
                  tecnicoNome = tecnicoResolvidoMap.nome;
                  // Buscar configuração do técnico se disponível
                  const configFromData = (tecnicosConfigData || []).find((t: any) => t.id === tecnicoIdFinal);
                  if (configFromData) tecnicoConfig = configFromData;
                }
                // Tentar pelo auth_user_id
                else if (authIdToTecnico.has(os.tecnico_id)) {
                  const tecnicoResolvidoMap = authIdToTecnico.get(os.tecnico_id)!;
                  tecnicoIdFinal = tecnicoResolvidoMap.id;
                  tecnicoNome = tecnicoResolvidoMap.nome;
                  // Buscar configuração do técnico se disponível
                  const configFromData = (tecnicosConfigData || []).find((t: any) => t.id === tecnicoIdFinal);
                  if (configFromData) tecnicoConfig = configFromData;
                }
              }
              
              // Determinar tipo e valor da comissão (prioridade: técnico > empresa > padrão)
              let tipoComissao: 'porcentagem' | 'fixo' = 'porcentagem';
              let valorBaseComissao = 10; // padrão 10%
              
              if (tecnicoConfig?.tipo_comissao) {
                tipoComissao = tecnicoConfig.tipo_comissao as 'porcentagem' | 'fixo';
                if (tipoComissao === 'fixo') {
                  valorBaseComissao = tecnicoConfig.comissao_fixa || 0;
                } else {
                  valorBaseComissao = tecnicoConfig.comissao_percentual || 10;
                }
              } else if (configEmpresa?.tipo_comissao) {
                tipoComissao = configEmpresa.tipo_comissao as 'porcentagem' | 'fixo';
                if (tipoComissao === 'fixo') {
                  valorBaseComissao = configEmpresa.comissao_fixa_padrao || 0;
                } else {
                  valorBaseComissao = configEmpresa.comissao_padrao || 10;
                }
              }
              
              // Calcular comissão
              let valorComissao = 0;
              if (tipoComissao === 'fixo') {
                valorComissao = valorBaseComissao;
              } else {
                valorComissao = (valorServico * valorBaseComissao) / 100;
              }
              
              const dataEntregaBase = os.data_entrega || os.created_at || new Date().toISOString();
              
              return {
                id: `prevista-${os.id}`,
                // Usar o ID normalizado (sempre usuarios.id)
                tecnico_id: tecnicoIdFinal,
                tecnico_nome: tecnicoNome || 'Técnico não encontrado',
                ordem_servico_id: os.id,
                numero_os: os.numero_os || 'N/A',
                cliente_nome: os.clientes?.nome || 'Cliente não encontrado',
                servico_nome: os.servico || 'Serviço não especificado',
                valor_servico: valorServico,
                valor_peca: os.valor_peca || 0,
                valor_total: (os.valor_faturado as number | null) ?? valorServico ?? 0,
                tipo_comissao: tipoComissao,
                percentual_comissao: tipoComissao === 'porcentagem' ? valorBaseComissao : 0,
                valor_comissao_fixa: tipoComissao === 'fixo' ? valorBaseComissao : null,
                valor_comissao: valorComissao,
                data_entrega: dataEntregaBase,
                status: 'PREVISTA',
                tipo_ordem: (os.tipo || 'normal').toLowerCase(),
                created_at: dataEntregaBase,
                ativa: true,
                tecnico_comissao_ativa: tecnicoConfig?.comissao_ativa !== false,
                observacoes: null
              } as ComissaoDetalhada;
            });
        }
      }
      
      // Mesclar comissões reais + previstas
      setComissoes([...comissoesFormatadas, ...comissoesPrevistas]);
      
      // Debug: Log das comissões carregadas
      const todasComissoes = [...comissoesFormatadas, ...comissoesPrevistas];
      console.log('📊 Comissões carregadas:', {
        total: todasComissoes.length,
        reais: comissoesFormatadas.length,
        previstas: comissoesPrevistas.length,
        meses: [...new Set(todasComissoes.map(c => {
          try {
            const data = new Date(c.data_entrega);
            if (isNaN(data.getTime())) {
              console.warn('⚠️ Data inválida:', c.data_entrega);
              return null;
            }
            return data.toISOString().slice(0, 7);
          } catch (e) {
            console.error('❌ Erro ao processar data:', c.data_entrega, e);
            return null;
          }
        }).filter(Boolean))],
        comissoesComTecnicoAtivo: todasComissoes.filter(c => 
          c.ativa !== false && c.tecnico_comissao_ativa !== false
        ).length
      });

      // Verificar se o campo ativa existe fazendo uma query de teste
      // Se a query com o campo ativa funcionar, o campo existe
      if (comissoesFormatadas.length > 0) {
        const { error: testError } = await supabase
          .from('comissoes_historico')
          .select('ativa')
          .eq('id', comissoesFormatadas[0].id)
          .limit(1);
        
        setCampoAtivaExiste(!testError || !testError.message?.includes('column'));
      } else {
        // Se não há comissões, assumir que o campo não existe (será verificado na próxima vez)
        setCampoAtivaExiste(false);
      }

    } catch (error) {
      console.error('💥 Erro geral:', error);
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
    const headers = ['Técnico', 'OS', 'Cliente', 'Serviço', 'Data Entrega', 'Valor Total', 'Tipo', 'Percentual/Fixo', 'Comissão', 'Status'];
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
        c.status
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
          
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
            >
              <FiFilter size={16} />
              <span className="hidden sm:inline">Filtros</span>
            </button>
            
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"
            >
              <FiDownload size={16} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
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

        {/* Tabela Detalhada */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-3 md:p-6 border-b border-gray-200">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Histórico Detalhado ({comissoesFiltradas.length} registros)
            </h3>
          </div>

          {/* Versão Mobile - Cards */}
          <div className="md:hidden divide-y divide-gray-200">
            {comissoesFiltradas.map((comissao) => (
              <div key={comissao.id} className={`p-3 md:p-4 space-y-3 ${!comissao.ativa ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-semibold text-gray-900">#{comissao.numero_os || 'N/A'}</div>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(comissao.status)}`}>
                        {comissao.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{comissao.tecnico_nome}</div>
                    <div className="text-xs text-gray-600 mt-1">{comissao.cliente_nome}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 ml-2 flex-wrap">
                      <button
                        onClick={() => handleVerDetalhes(comissao)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <FiEye size={16} />
                      </button>
                      <button
                        onClick={() => handleEditarComissao(comissao)}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Editar valor"
                      >
                        <FiEdit size={16} />
                      </button>
                      {!comissao.id.startsWith('prevista-') && (comissao.status || '').toUpperCase() !== 'PAGA' && (
                        <button
                          onClick={() => handleMarcarComoPaga(comissao)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marcar como paga"
                          disabled={salvando}
                        >
                          <FiCheckCircle size={16} />
                        </button>
                      )}
                      {!comissao.id.startsWith('prevista-') && (comissao.status || '').toUpperCase() === 'PAGA' && (
                        <button
                          onClick={() => handleReverterParaCalculada(comissao)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Reverter para calculada"
                          disabled={salvando}
                        >
                          <FiRotateCcw size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleAtiva(comissao)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          comissao.ativa
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-orange-600 hover:bg-orange-50'
                        } ${!campoAtivaExiste ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={comissao.ativa ? 'Desativar comissão' : 'Ativar comissão'}
                        disabled={salvando || !campoAtivaExiste}
                      >
                        {comissao.ativa ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Serviço</p>
                    <p className="text-xs text-gray-900 line-clamp-2">{comissao.servico_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Data</p>
                    <p className="text-xs text-gray-900">{formatDate(comissao.data_entrega)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Valor Total</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(comissao.valor_total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Comissão</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(comissao.valor_comissao)}</p>
                  </div>
                  {comissao.tipo_comissao && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Tipo / Valor</p>
                      <p className="text-xs text-blue-600">
                        {comissao.tipo_comissao === 'fixo' 
                          ? `R$ ${comissao.valor_comissao_fixa?.toFixed(2) || '0,00'} (fixo)`
                          : `${comissao.percentual_comissao || 0}%`
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {comissoesFiltradas.length === 0 && (
              <div className="text-center py-12">
                <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
                <p className="text-gray-500 text-sm">
                  {comissoes.length === 0 
                    ? 'Não há comissões registradas.'
                    : 'Tente ajustar os filtros para ver mais resultados.'
                  }
                </p>
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
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    OS
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                    Serviço
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Valor Total
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell whitespace-nowrap">
                    Tipo / Valor
                  </th>
                  <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Comissão
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                    Data
                  </th>
                  {isAdmin && (
                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 whitespace-nowrap">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comissoesFiltradas.map((comissao) => (
                  <tr key={comissao.id} className={`hover:bg-gray-50 ${!comissao.ativa ? 'opacity-60' : ''}`}>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{comissao.tecnico_nome}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{comissao.numero_os || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-sm text-gray-900 truncate max-w-[150px]">{comissao.cliente_nome}</div>
                    </td>
                    <td className="px-3 md:px-6 py-4 hidden lg:table-cell">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {comissao.servico_nome}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(comissao.valor_total)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden md:table-cell">
                      <div className="text-sm font-medium text-gray-900">
                        {comissao.tipo_comissao === 'fixo' ? (
                          <span className="text-blue-600">
                            R$ {comissao.valor_comissao_fixa?.toFixed(2) || '0,00'} (fixo)
                          </span>
                        ) : (
                          <span>
                            {comissao.percentual_comissao || 0}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-bold text-green-600">
                        {formatCurrency(comissao.valor_comissao)}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(comissao.status)}`}>
                        {comissao.status}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center hidden lg:table-cell">
                      <div className="text-sm text-gray-900">
                        {formatDate(comissao.data_entrega)}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-center sticky right-0 bg-white z-10">
                        <div className="flex items-center justify-center gap-1 md:gap-2">
                          <button
                            onClick={() => handleVerDetalhes(comissao)}
                            className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                            title="Ver detalhes"
                          >
                            <FiEye size={14} className="md:w-4 md:h-4" />
                          </button>
                          <button
                            onClick={() => handleEditarComissao(comissao)}
                            className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex-shrink-0"
                            title="Editar valor"
                          >
                            <FiEdit size={14} className="md:w-4 md:h-4" />
                          </button>
                          {!comissao.id.startsWith('prevista-') && (comissao.status || '').toUpperCase() !== 'PAGA' && (
                            <button
                              onClick={() => handleMarcarComoPaga(comissao)}
                              className="p-1.5 md:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
                              title="Marcar como paga"
                              disabled={salvando}
                            >
                              <FiCheckCircle size={14} className="md:w-4 md:h-4" />
                            </button>
                          )}
                          {!comissao.id.startsWith('prevista-') && (comissao.status || '').toUpperCase() === 'PAGA' && (
                            <button
                              onClick={() => handleReverterParaCalculada(comissao)}
                              className="p-1.5 md:p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex-shrink-0"
                              title="Reverter para calculada"
                              disabled={salvando}
                            >
                              <FiRotateCcw size={14} className="md:w-4 md:h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleAtiva(comissao)}
                            className={`p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0 ${
                              comissao.ativa
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-orange-600 hover:bg-orange-50'
                            } ${!campoAtivaExiste ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={
                              !campoAtivaExiste 
                                ? 'Execute o SQL database/adicionar-campo-ativa-comissoes.sql para habilitar esta funcionalidade'
                                : comissao.ativa ? 'Desativar comissão' : 'Ativar comissão'
                            }
                            disabled={salvando || !campoAtivaExiste}
                          >
                            {comissao.ativa ? <FiToggleRight size={14} className="md:w-4 md:h-4" /> : <FiToggleLeft size={14} className="md:w-4 md:h-4" />}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comissoesFiltradas.length === 0 && (
            <div className="hidden md:block text-center py-12">
              <FiDollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comissão encontrada</h3>
              <p className="text-gray-500">
                {comissoes.length === 0 
                  ? 'Não há comissões registradas.'
                  : 'Tente ajustar os filtros para ver mais resultados.'
                }
              </p>
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

