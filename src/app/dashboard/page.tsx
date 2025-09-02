'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import OnboardingModal from '@/components/OnboardingModal';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/lib/supabaseClient';
import { 
  FiFileText, 
  FiClock, 
  FiCheckCircle, 
  FiUsers, 
  FiBell,
  FiPlus,
  FiAlertCircle,
  FiEdit3,
  FiTrash2,
  FiX,
  FiUser
} from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { Book, Pencil, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

interface AdminMetrics {
  totalOS: number;
  osPendentes: number;
  osConcluidas: number;
  totalClientes: number;
  totalTecnicos: number;
  faturamentoMes: number;
  satisfacaoMedia: number;
  osCriadasMes: number;
  clientesNovos: number;
  // Métricas diárias
  osHoje: number;
  faturamentoHoje: number;
  retornosHoje: number;
  aprovadosHoje: number;
  ticketMedioHoje: number;
}

interface OSData {
  id: string;
  numero_os?: string;
  status?: string;
  cliente_nome?: string;
  created_at?: string;
  valor_faturado?: number;
  status_tecnico?: string;
}

interface ClienteData {
  id: string;
  nome?: string;
  empresa?: string;
  created_at?: string;
}

interface Lembrete {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
  data_criacao: string;
  responsavel: string;
}

interface LembreteEditando {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
}

// Tipos para o sistema Kanban
interface Nota {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
  data_criacao: string;
  pos_x: number;
  pos_y: number;
  empresa_id: string;
  responsavel: string;
}

interface NotaEditando {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
  data: string;
  data_criacao: string;
}

interface NotaSelecionada {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
}

export default function DashboardPage() {
  const { usuarioData, empresaData, showOnboarding, setShowOnboarding } = useAuth();
  const router = useRouter();
  const { onboardingStatus, markOnboardingCompleted } = useOnboarding();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalOS: 0,
    osPendentes: 0,
    osConcluidas: 0,
    totalClientes: 0,
    totalTecnicos: 0,
    faturamentoMes: 0,
    satisfacaoMedia: 0,
    osCriadasMes: 0,
    clientesNovos: 0,
    osHoje: 0,
    faturamentoHoje: 0,
    retornosHoje: 0,
    aprovadosHoje: 0,
    ticketMedioHoje: 0
  });
  const [recentOS, setRecentOS] = useState<OSData[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para lembretes
  const [showLembreteModal, setShowLembreteModal] = useState(false);
  const [lembreteEditando, setLembreteEditando] = useState<LembreteEditando | null>(null);
  const [colunas, setColunas] = useState<string[]>([]);

  // Estados para o sistema Kanban
  const [colunasKanban, setColunasKanban] = useState<any[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [notaEditando, setNotaEditando] = useState<NotaEditando | null>(null);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaSelecionada | null>(null);
  const [showModalKanban, setShowModalKanban] = useState(false);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalVisualizar, setShowModalVisualizar] = useState(false);
  const [showKanbanBoard, setShowKanbanBoard] = useState(false);

  // ✅ DEBUG: Mostrar nível do usuário atual
  useEffect(() => {
    if (usuarioData) {
      console.log('🔍 Usuário atual:', {
        nome: usuarioData.nome,
        email: usuarioData.email,
        nivel: usuarioData.nivel,
        empresa_id: usuarioData.empresa_id
      });
    }
  }, [usuarioData]);

  // ✅ CARREGAR DADOS DA DASHBOARD
  const fetchDashboardData = async () => {
    if (!empresaData?.id) return;
    
    setLoading(true);
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      // ✅ TIMEOUT: Evitar loading infinito
      const { data: ordensData, error: ordensError } = await Promise.race([
        supabase
          .from('ordens_servico')
          .select(`
            id,
            numero_os,
            status,
            status_tecnico,
            created_at,
            valor_faturado,
            clientes:cliente_id(nome)
          `)
          .eq('empresa_id', empresaData.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Dashboard timeout')), 10000)
        )
      ]);

      if (ordensError) {
        console.error('Erro ao carregar ordens:', ordensError);
        return;
      }

      const ordens = ordensData || [];
      
      // ✅ BUSCAR LEMBRETES E COLUNAS
      const { data: lembretesData } = await supabase
        .from('notas_dashboard')
        .select('*')
        .eq('empresa_id', empresaData.id)
        .order('data_criacao', { ascending: false });

      const { data: colunasData } = await supabase
        .from('colunas_dashboard')
        .select('nome')
        .eq('empresa_id', empresaData.id)
        .order('posicao');

      setLembretes(lembretesData || []);
      setColunas(colunasData?.map((c: any) => c.nome) || ['A Fazer', 'Em Andamento', 'Concluído']);

      // ✅ CALCULAR MÉTRICAS
      const totalOS = ordens.length;
      const osPendentes = ordens.filter((os: any) => 
        ['ABERTA', 'EM_ANALISE', 'ORCAMENTO', 'PENDENTE'].includes(os.status || '')
      ).length;
      const osConcluidas = ordens.filter((os: any) => 
        ['CONCLUIDO', 'ENTREGUE'].includes(os.status || '')
      ).length;
      
      const osHoje = ordens.filter((os: any) => 
        new Date(os.created_at || '') >= inicioDia
      ).length;
      
      const faturamentoHoje = ordens
        .filter((os: any) => new Date(os.created_at || '') >= inicioDia)
        .reduce((sum: number, os: any) => sum + (os.valor_faturado || 0), 0);
      
      const osCriadasMes = ordens.filter((os: any) => 
        new Date(os.created_at || '') >= inicioMes
      ).length;

      // ✅ BUSCAR CLIENTES E TÉCNICOS
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome, created_at')
        .eq('empresa_id', empresaData.id);

      const { data: tecnicosData } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('empresa_id', empresaData.id)
        .eq('nivel', 'tecnico');

      const clientes = clientesData || [];
      const tecnicos = tecnicosData || [];
      
      const totalClientes = clientes.length;
      const totalTecnicos = tecnicos.length;
      const clientesNovos = clientes.filter((cliente: any) => 
        new Date(cliente.created_at || '') >= inicioMes
      ).length;

      // ✅ OSs RECENTES
      const recentOSData = ordens
        .sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 5);

      setRecentOS(recentOSData);

      // ✅ ATUALIZAR MÉTRICAS
      setMetrics({
        totalOS,
        osPendentes,
        osConcluidas,
        totalClientes,
        totalTecnicos,
        faturamentoMes: 0, // TODO: Implementar
        satisfacaoMedia: 0, // TODO: Implementar
        osCriadasMes,
        clientesNovos,
        osHoje,
        faturamentoHoje,
        retornosHoje: 0, // TODO: Implementar
        aprovadosHoje: 0, // TODO: Implementar
        ticketMedioHoje: osHoje > 0 ? faturamentoHoje / osHoje : 0
      });

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaData?.id) {
      fetchDashboardData();
    }
  }, [empresaData?.id]);

  // ✅ FUNÇÕES DO SISTEMA KANBAN
  const fetchColunas = async () => {
    if (!empresaData?.id) return;
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('nome')
      .eq('empresa_id', empresaData.id)
      .order('posicao', { ascending: true });
    if (!error && data && data.length > 0) {
      setColunasKanban(data.map((c) => c.nome));
    } else {
      // Criar colunas padrão se não existirem
      const colunasPadrao = [
        { id: uuidv4(), nome: 'A Fazer', empresa_id: empresaData.id, posicao: 0 },
        { id: uuidv4(), nome: 'Em Andamento', empresa_id: empresaData.id, posicao: 1 },
        { id: uuidv4(), nome: 'Concluído', empresa_id: empresaData.id, posicao: 2 }
      ];

      const { error: insertError } = await supabase
        .from('colunas_dashboard')
        .insert(colunasPadrao);

      if (insertError) {
        console.error('Erro ao criar colunas padrão:', insertError);
        return;
      }

      setColunasKanban(colunasPadrao.map(c => c.nome));
    }
  };

  const fetchNotas = async () => {
    if (!empresaData?.id) return;
    const { data, error } = await supabase
      .from('notas_dashboard')
      .select('*')
      .eq('empresa_id', empresaData.id)
      .order('pos_x');

    if (error) {
      console.error('Erro ao buscar notas:', error);
      return;
    }

    setNotas(data || []);
  };

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Função para lidar com o fim do drag and drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeNota = notas.find(nota => nota.id === active.id);
      const overColuna = over.id as string;

      if (activeNota && activeNota.coluna !== overColuna) {
        // Atualizar a coluna da nota no banco de dados
        const { error } = await supabase
          .from('notas_dashboard')
          .update({ coluna: overColuna })
          .eq('id', active.id)
          .eq('empresa_id', empresaData?.id);

        if (error) {
          console.error('Erro ao atualizar coluna da nota:', error);
          addToast('error', 'Erro ao mover nota');
          return;
        }

        // Atualizar estado local
        setNotas(notas.map(nota => 
          nota.id === active.id ? { ...nota, coluna: overColuna } : nota
        ));

        addToast('success', 'Nota movida com sucesso!');
      }
    }
  };

  // Função para criar nova nota
  const criarNota = async (nota: Omit<NotaEditando, 'id' | 'data_criacao'>) => {
    if (!empresaData?.id) return;

    const novaNota = {
      id: uuidv4(),
      titulo: nota.titulo,
      texto: nota.texto,
      cor: nota.cor,
      coluna: nota.coluna,
      prioridade: nota.prioridade,
      data_criacao: new Date().toISOString(),
      pos_x: 0,
      pos_y: 0,
      empresa_id: empresaData.id,
      responsavel: usuarioData?.nome || 'Sistema'
    };

    const { error } = await supabase
      .from('notas_dashboard')
      .insert(novaNota);

    if (error) {
      console.error('Erro ao criar nota:', error);
      addToast('error', 'Erro ao criar nota');
      return;
    }

    setNotas([...notas, novaNota]);
    setShowModalKanban(false);
    addToast('success', 'Nota criada com sucesso!');
  };

  // Função para editar nota
  const editarNota = async (nota: NotaEditando) => {
    if (!empresaData?.id) return;

    const { error } = await supabase
      .from('notas_dashboard')
      .update({
        titulo: nota.titulo,
        texto: nota.texto,
        cor: nota.cor,
        coluna: nota.coluna,
        prioridade: nota.prioridade
      })
      .eq('id', nota.id)
      .eq('empresa_id', empresaData.id);

    if (error) {
      console.error('Erro ao editar nota:', error);
      addToast('error', 'Erro ao editar nota');
      return;
    }

    setNotas(notas.map(n => 
      n.id === nota.id ? { ...n, ...nota } : n
    ));
    setShowModalEditar(false);
    setNotaEditando(null);
    addToast('success', 'Nota editada com sucesso!');
  };

  // Função para excluir nota
  const excluirNota = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Nota',
      message: 'Tem certeza que deseja excluir esta nota?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    const { error } = await supabase
      .from('notas_dashboard')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaData?.id);

    if (error) {
      console.error('Erro ao excluir nota:', error);
      addToast('error', 'Erro ao excluir nota');
      return;
    }

    setNotas(notas.filter(n => n.id !== id));
    addToast('success', 'Nota excluída com sucesso!');
  };

  // Função para criar nova coluna
  const criarColuna = async (nome: string) => {
    if (!empresaData?.id) return;

    const novaColuna = {
      id: uuidv4(),
      nome,
      empresa_id: empresaData.id,
      posicao: colunasKanban.length
    };

    const { error } = await supabase
      .from('colunas_dashboard')
      .insert(novaColuna);

    if (error) {
      console.error('Erro ao criar coluna:', error);
      addToast('error', 'Erro ao criar coluna');
      return;
    }

    setColunasKanban([...colunasKanban, novaColuna]);
    addToast('success', 'Coluna criada com sucesso!');
  };

  // Função para excluir coluna
  const excluirColuna = async (id: string) => {
    const confirmed = await confirm({
      title: 'Excluir Coluna',
      message: 'Tem certeza que deseja excluir esta coluna? Todas as notas serão perdidas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    // Primeiro excluir todas as notas da coluna
    const { error: notasError } = await supabase
      .from('notas_dashboard')
      .delete()
      .eq('coluna', colunasKanban.find(c => c.id === id)?.nome)
      .eq('empresa_id', empresaData?.id);

    if (notasError) {
      console.error('Erro ao excluir notas da coluna:', notasError);
      addToast('error', 'Erro ao excluir coluna');
      return;
    }

    // Depois excluir a coluna
    const { error } = await supabase
      .from('colunas_dashboard')
      .delete()
      .eq('id', id)
      .eq('empresa_id', empresaData?.id);

    if (error) {
      console.error('Erro ao excluir coluna:', error);
      addToast('error', 'Erro ao excluir coluna');
      return;
    }

    setColunasKanban(colunasKanban.filter(c => c.id !== id));
    setNotas(notas.filter(n => n.coluna !== colunasKanban.find(c => c.id === id)?.nome));
    addToast('success', 'Coluna excluída com sucesso!');
  };

  // Carregar dados do Kanban
  useEffect(() => {
    if (empresaData?.id) {
      fetchColunas();
      fetchNotas();
    }
  }, [empresaData?.id]);

  // ✅ COMPONENTE PARA NOTA ARRASTÁVEL
  const NotaArrastavel = ({ nota }: { nota: Nota }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: nota.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const cores = {
      azul: 'bg-blue-100 border-blue-300 text-blue-800',
      verde: 'bg-green-100 border-green-300 text-green-800',
      amarelo: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      vermelho: 'bg-red-100 border-red-300 text-red-800',
      roxo: 'bg-purple-100 border-purple-300 text-purple-800',
      rosa: 'bg-pink-100 border-pink-300 text-pink-800',
      laranja: 'bg-orange-100 border-orange-300 text-orange-800',
      cinza: 'bg-gray-100 border-gray-300 text-gray-800'
    };

    return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`p-3 rounded-lg border cursor-move ${cores[nota.cor as keyof typeof cores] || cores.cinza}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-sm">{nota.titulo}</h3>
            <p className="text-xs mt-1 opacity-80">{nota.texto}</p>
            <p className="text-xs mt-1 opacity-60">
              {format(new Date(nota.data_criacao), 'dd/MM/yyyy')}
            </p>
          </div>
          <div className="ml-2 flex space-x-1">
            {nota.prioridade === 'alta' && (
              <span className="text-red-600 text-xs">🔥</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotaSelecionada(nota);
                setShowModalVisualizar(true);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Book className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotaEditando({
                  id: nota.id,
                  titulo: nota.titulo,
                  texto: nota.texto,
                  cor: nota.cor,
                  coluna: nota.coluna,
                  prioridade: nota.prioridade,
                  data: '',
                  data_criacao: nota.data_criacao
                });
                setShowModalEditar(true);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // ✅ FUNÇÕES DOS LEMBRETES
  const criarLembrete = async (lembrete: Omit<LembreteEditando, 'id'>) => {
    if (!empresaData?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notas_dashboard')
        .insert({
          titulo: lembrete.titulo,
          texto: lembrete.texto,
          cor: lembrete.cor,
          coluna: lembrete.coluna,
          prioridade: lembrete.prioridade,
          empresa_id: empresaData.id,
          responsavel: usuarioData?.nome || 'Sistema'
        })
        .select()
        .single();

      if (error) throw error;

      addToast('success', 'Lembrete criado com sucesso!');
      setShowLembreteModal(false);
      fetchDashboardData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      addToast('error', 'Erro ao criar lembrete');
    }
  };

  const editarLembrete = async (lembrete: LembreteEditando) => {
    if (!empresaData?.id) return;
    
    try {
      const { error } = await supabase
        .from('notas_dashboard')
        .update({
          titulo: lembrete.titulo,
          texto: lembrete.texto,
          cor: lembrete.cor,
          coluna: lembrete.coluna,
          prioridade: lembrete.prioridade
        })
        .eq('id', lembrete.id)
        .eq('empresa_id', empresaData.id);

      if (error) throw error;

      addToast('success', 'Lembrete atualizado com sucesso!');
      setLembreteEditando(null);
      fetchDashboardData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao editar lembrete:', error);
      addToast('error', 'Erro ao editar lembrete');
    }
  };

  const excluirLembrete = async (id: string) => {
    if (!empresaData?.id) return;
    
    const confirmed = await confirm({
      title: 'Excluir Lembrete',
      message: 'Tem certeza que deseja excluir este lembrete?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('notas_dashboard')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaData.id);

      if (error) throw error;

      addToast('success', 'Lembrete excluído com sucesso!');
      fetchDashboardData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
      addToast('error', 'Erro ao excluir lembrete');
    }
  };

  // ✅ FORMATAR VALOR
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // ✅ FORMATAR DATA
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '';
    }
  };

  // ✅ OBTER COR DO STATUS
  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'concluido':
      case 'entregue':
        return 'text-green-600 bg-green-100';
      case 'orcamento':
      case 'orçamento':
        return 'text-yellow-600 bg-yellow-100';
      case 'em analise':
      case 'em análise':
        return 'text-blue-600 bg-blue-100';
      case 'aguardando peca':
      case 'aguardando peça':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // ✅ OBTER COR DO LEMBRETE
  const getLembreteColor = (cor: string) => {
    const cores: { [key: string]: string } = {
      'azul': 'bg-blue-100 border-blue-300 text-blue-800',
      'verde': 'bg-green-100 border-green-300 text-green-800',
      'amarelo': 'bg-yellow-100 border-yellow-300 text-yellow-800',
      'vermelho': 'bg-red-100 border-red-300 text-red-800',
      'roxo': 'bg-purple-100 border-purple-300 text-purple-800',
      'rosa': 'bg-pink-100 border-pink-300 text-pink-800',
      'laranja': 'bg-orange-100 border-orange-300 text-orange-800',
      'cinza': 'bg-gray-100 border-gray-300 text-gray-800'
    };
    return cores[cor] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  // ✅ LOADING STATE
  if (loading) {
    return (
      <ProtectedArea area="dashboard">
        <MenuLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando dashboard...</p>
              <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</p>
            </div>
          </div>
        </MenuLayout>
      </ProtectedArea>
    );
  }

  return (
    <ProtectedArea area="dashboard">
      <MenuLayout>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Dashboard
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Resumo do dia {formatDate(new Date().toISOString())}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push('/nova-os')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Nova OS</span>
                  </button>
                  <button
                    onClick={() => setShowLembreteModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Novo Lembrete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* OS do Dia */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">OS do Dia</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.osHoje}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <FiFileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    Faturamento: {formatCurrency(metrics.faturamentoHoje)}
                  </p>
                </div>
              </div>

              {/* OS Pendentes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">OS Pendentes</p>
                    <p className="text-3xl font-bold text-orange-600">{metrics.osPendentes}</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-full">
                    <FiClock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    {((metrics.osPendentes / metrics.totalOS) * 100).toFixed(1)}% do total
                  </p>
                </div>
              </div>

              {/* OS Concluídas */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">OS Concluídas</p>
                    <p className="text-3xl font-bold text-green-600">{metrics.osConcluidas}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <FiCheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    {((metrics.osConcluidas / metrics.totalOS) * 100).toFixed(1)}% do total
                  </p>
                </div>
              </div>

              {/* Total Clientes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                    <p className="text-3xl font-bold text-purple-600">{metrics.totalClientes}</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FiUsers className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    +{metrics.clientesNovos} este mês
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* OSs Recentes */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">OSs Recentes</h3>
                      <button
                        onClick={() => router.push('/ordens')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Ver todas
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    {recentOS.length > 0 ? (
                      <div className="space-y-4">
                        {recentOS.map((os) => (
                          <div key={os.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <FiFileText className="w-4 h-4 text-blue-600" />
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  OS #{os.numero_os}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {os.cliente_nome}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(os.status || '')}`}>
                                {os.status}
                              </span>
                              <p className="text-sm text-gray-600">
                                {formatDate(os.created_at || '')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Nenhuma OS encontrada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sistema Kanban */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Kanban</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowModalKanban(true)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Nova Nota
                        </button>
                        <button
                          onClick={() => {
                            const nome = prompt('Nome da nova coluna:');
                            if (nome) criarColuna(nome);
                          }}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Nova Coluna
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {colunasKanban.map((coluna) => (
                          <div key={coluna} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{coluna}</h4>
                              <div className="flex space-x-2">
                                <span className="text-sm text-gray-500">
                                  {notas.filter(n => n.coluna === coluna).length}
                                </span>
                                <button
                                  onClick={() => excluirColuna(coluna)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            
                            <SortableContext
                              items={notas.filter(n => n.coluna === coluna).map(n => n.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {notas
                                  .filter(nota => nota.coluna === coluna)
                                  .map((nota) => (
                                    <NotaArrastavel key={nota.id} nota={nota} />
                                  ))}
                              </div>
                            </SortableContext>
                          </div>
                        ))}
                      </div>
                    </DndContext>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Ações Rápidas</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                      onClick={() => router.push('/nova-os')}
                      className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FiPlus className="w-8 h-8 text-blue-600 mb-2" />
                      <span className="text-sm font-medium text-blue-900">Nova OS</span>
                    </button>
                    
                    <button
                      onClick={() => router.push('/clientes/novo')}
                      className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <FiUser className="w-8 h-8 text-green-600 mb-2" />
                      <span className="text-sm font-medium text-green-900">Novo Cliente</span>
                    </button>
                    
                    <button
                      onClick={() => router.push('/ordens')}
                      className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <FiFileText className="w-8 h-8 text-purple-600 mb-2" />
                      <span className="text-sm font-medium text-purple-900">Ver OSs</span>
                    </button>
                    
                    <button
                      onClick={() => setShowLembreteModal(true)}
                      className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <FiBell className="w-8 h-8 text-orange-600 mb-2" />
                      <span className="text-sm font-medium text-orange-900">Lembretes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal para criar nota */}
        {showModalKanban && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Nova Nota</h3>
                <button
                  onClick={() => setShowModalKanban(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  criarNota({
                    titulo: formData.get('titulo') as string,
                    texto: formData.get('texto') as string,
                    cor: formData.get('cor') as string,
                    coluna: formData.get('coluna') as string,
                    prioridade: formData.get('prioridade') as string,
                    data: ''
                  });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto
                  </label>
                  <textarea
                    name="texto"
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <select
                      name="cor"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="azul">Azul</option>
                      <option value="verde">Verde</option>
                      <option value="amarelo">Amarelo</option>
                      <option value="vermelho">Vermelho</option>
                      <option value="roxo">Roxo</option>
                      <option value="rosa">Rosa</option>
                      <option value="laranja">Laranja</option>
                      <option value="cinza">Cinza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      name="prioridade"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coluna
                  </label>
                  <select
                    name="coluna"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {colunasKanban.map((coluna) => (
                      <option key={coluna} value={coluna}>{coluna}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModalKanban(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Criar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para editar nota */}
        {showModalEditar && notaEditando && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Editar Nota</h3>
                <button
                  onClick={() => {
                    setShowModalEditar(false);
                    setNotaEditando(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  editarNota({
                    id: notaEditando.id,
                    titulo: formData.get('titulo') as string,
                    texto: formData.get('texto') as string,
                    cor: formData.get('cor') as string,
                    coluna: formData.get('coluna') as string,
                    prioridade: formData.get('prioridade') as string,
                    data: '',
                    data_criacao: notaEditando.data_criacao
                  });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    name="titulo"
                    defaultValue={notaEditando.titulo}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto
                  </label>
                  <textarea
                    name="texto"
                    defaultValue={notaEditando.texto}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <select
                      name="cor"
                      defaultValue={notaEditando.cor}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="azul">Azul</option>
                      <option value="verde">Verde</option>
                      <option value="amarelo">Amarelo</option>
                      <option value="vermelho">Vermelho</option>
                      <option value="roxo">Roxo</option>
                      <option value="rosa">Rosa</option>
                      <option value="laranja">Laranja</option>
                      <option value="cinza">Cinza</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <select
                      name="prioridade"
                      defaultValue={notaEditando.prioridade}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coluna
                  </label>
                  <select
                    name="coluna"
                    defaultValue={notaEditando.coluna}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {colunasKanban.map((coluna) => (
                      <option key={coluna} value={coluna}>{coluna}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalEditar(false);
                      setNotaEditando(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Atualizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para visualizar nota */}
        {showModalVisualizar && notaSelecionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Visualizar Nota</h3>
                <button
                  onClick={() => {
                    setShowModalVisualizar(false);
                    setNotaSelecionada(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <p className="text-gray-900">{notaSelecionada.titulo}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Texto
                  </label>
                  <p className="text-gray-900">{notaSelecionada.texto}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cor
                    </label>
                    <p className="text-gray-900 capitalize">{notaSelecionada.cor}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridade
                    </label>
                    <p className="text-gray-900 capitalize">{notaSelecionada.prioridade}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coluna
                  </label>
                  <p className="text-gray-900">{notaSelecionada.coluna}</p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => excluirNota(notaSelecionada.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Excluir
                  </button>
                  <button
                    onClick={() => {
                      setShowModalVisualizar(false);
                      setNotaSelecionada(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />

        {/* Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={markOnboardingCompleted}
        />
      </MenuLayout>
    </ProtectedArea>
  );
}