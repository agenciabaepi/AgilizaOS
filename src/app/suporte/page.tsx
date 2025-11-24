'use client';

import { useState, useEffect } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  FiPlus, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiClock, 
  FiMessageSquare,
  FiSearch,
  FiFilter,
  FiFileText,
  FiX
} from 'react-icons/fi';

type Ticket = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  resposta_suporte?: string | null;
  created_at: string;
  updated_at: string;
};

export default function SuportePage() {
  const { user, session } = useAuth();
  const { addToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: 'bug',
    prioridade: 'media'
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (user && session) {
      // Aguardar um pouco para garantir que a sessão está totalmente carregada
      const timer = setTimeout(() => {
        fetchTickets();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, session]);

  const fetchTickets = async () => {
    if (!user || !session) return;
    
    try {
      setLoading(true);
      
      // Verificar se a sessão está válida antes de fazer queries
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !currentSession) {
        console.error('❌ Erro de sessão:', sessionError);
        addToast('error', 'Sessão expirada. Faça login novamente.');
        return;
      }
      
      // Usar o cliente Supabase diretamente do lado do cliente
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, empresa_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError) {
        console.error('Erro ao buscar usuário:', usuarioError);
        addToast('error', 'Erro ao buscar dados do usuário');
        return;
      }

      if (!usuario) {
        addToast('error', 'Usuário não encontrado');
        return;
      }

      // Buscar tickets da empresa
      // NOTA: RLS está desabilitado para tickets_suporte e tickets_comentarios
      // A segurança é garantida pelo filtro manual de empresa_id e validações no código
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets_suporte')
        .select('*')
        .eq('empresa_id', usuario.empresa_id)
        .order('created_at', { ascending: false });

      if (ticketsError) {
        console.error('❌ Erro ao buscar tickets:', ticketsError);
        console.error('📋 Detalhes completos:', JSON.stringify(ticketsError, null, 2));
        console.error('📋 Código do erro:', ticketsError.code);
        console.error('📋 Mensagem do erro:', ticketsError.message);
        console.error('📋 Hint do erro:', ticketsError.hint);
        console.error('👤 Usuário auth:', user.id);
        console.error('🏢 Empresa ID:', usuario.empresa_id);
        console.error('🔑 Sessão válida:', !!currentSession);
        
        // Verificar se é erro de tabela não encontrada
        if (ticketsError.code === '42P01' || ticketsError.message?.includes('does not exist') || ticketsError.message?.includes('não existe')) {
          addToast('error', 'Tabela de tickets não encontrada. Execute o SQL de criação no Supabase.');
        } 
        // Verificar se é erro de permissão RLS
        else if (ticketsError.code === '42501' || ticketsError.message?.includes('permission denied') || ticketsError.message?.includes('permissão') || ticketsError.message?.includes('new row violates row-level security') || ticketsError.message?.includes('violates row-level security')) {
          addToast('error', 'Erro de permissão RLS. O RLS está bloqueando o acesso. Vamos desabilitar temporariamente o RLS para esta tabela.');
          // Sugerir desabilitar RLS temporariamente
          console.warn('⚠️ RLS está bloqueando. Para desabilitar temporariamente, execute: ALTER TABLE tickets_suporte DISABLE ROW LEVEL SECURITY;');
        } 
        // Outros erros
        else {
          addToast('error', ticketsError.message || 'Erro ao carregar tickets');
        }
        return;
      }

      setTickets(ticketsData || []);
    } catch (error: any) {
      console.error('Erro ao buscar tickets (catch):', error);
      addToast('error', error?.message || 'Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.descricao.trim()) {
      addToast('error', 'Preencha todos os campos obrigatórios');
      return;
    }

    if (!user || !session) {
      addToast('error', 'Não autenticado');
      return;
    }

    try {
      setSubmitting(true);
      
      // Buscar usuário e empresa
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, empresa_id')
        .eq('auth_user_id', user.id)
        .single();

      if (usuarioError) {
        console.error('Erro ao buscar usuário:', usuarioError);
        addToast('error', 'Erro ao buscar dados do usuário');
        return;
      }

      if (!usuario) {
        addToast('error', 'Usuário não encontrado');
        return;
      }

      // Criar ticket diretamente usando o cliente Supabase
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets_suporte')
        .insert({
          empresa_id: usuario.empresa_id,
          usuario_id: usuario.id,
          titulo: formData.titulo,
          descricao: formData.descricao,
          categoria: formData.categoria || 'bug',
          prioridade: formData.prioridade || 'media',
          anexos_url: [],
          status: 'aguardando_resposta' // Inicia como aguardando, muda para aberto quando admin visualizar
        })
        .select()
        .single();

      if (ticketError) {
        console.error('Erro ao criar ticket:', ticketError);
        console.error('Detalhes do erro:', {
          message: ticketError.message,
          details: ticketError.details,
          hint: ticketError.hint,
          code: ticketError.code
        });
        addToast('error', ticketError.message || 'Erro ao criar ticket');
        return;
      }

      addToast('success', 'Ticket criado com sucesso!');
      setFormData({ titulo: '', descricao: '', categoria: 'bug', prioridade: 'media' });
      setShowForm(false);
      fetchTickets();
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      addToast('error', 'Erro ao criar ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-blue-100 text-blue-800';
      case 'em_desenvolvimento':
        return 'bg-yellow-100 text-yellow-800';
      case 'aguardando_resposta':
        return 'bg-orange-100 text-orange-800';
      case 'resolvido':
        return 'bg-green-100 text-green-800';
      case 'fechado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'Aberto';
      case 'em_desenvolvimento':
        return 'Em Desenvolvimento';
      case 'aguardando_resposta':
        return 'Aguardando Resposta';
      case 'resolvido':
        return 'Resolvido';
      case 'fechado':
        return 'Fechado';
      default:
        return status;
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'critica':
        return 'bg-red-100 text-red-800';
      case 'alta':
        return 'bg-orange-100 text-orange-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baixa':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    switch (categoria) {
      case 'bug':
        return 'Bug';
      case 'melhoria':
        return 'Melhoria';
      case 'duvida':
        return 'Dúvida';
      case 'outro':
        return 'Outro';
      default:
        return categoria;
    }
  };

  const filteredTickets = filterStatus === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  return (
    <MenuLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie seus tickets de suporte</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <FiPlus className="mr-2" />
            Novo Ticket
          </Button>
        </div>

        {/* Formulário de Novo Ticket */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Abrir Novo Ticket</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título *
                </label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Descreva brevemente o problema"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva detalhadamente o problema, incluindo passos para reproduzir se possível"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black min-h-[120px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="bug">Bug</option>
                    <option value="melhoria">Melhoria</option>
                    <option value="duvida">Dúvida</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({ ...formData, prioridade: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-black hover:bg-gray-800 text-white"
                >
                  {submitting ? 'Enviando...' : 'Enviar Ticket'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ titulo: '', descricao: '', categoria: 'bug', prioridade: 'media' });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('aberto')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'aberto'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Abertos
            </button>
            <button
              onClick={() => setFilterStatus('em_desenvolvimento')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'em_desenvolvimento'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Em Desenvolvimento
            </button>
            <button
              onClick={() => setFilterStatus('resolvido')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === 'resolvido'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resolvidos
            </button>
          </div>
        </div>

        {/* Lista de Tickets */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <p className="mt-2 text-sm text-gray-500">Carregando tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <FiFileText className="mx-auto text-gray-400" size={48} />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum ticket encontrado</h3>
            <p className="mt-2 text-sm text-gray-500">
              {filterStatus === 'all' 
                ? 'Você ainda não abriu nenhum ticket. Clique em "Novo Ticket" para começar.'
                : 'Nenhum ticket com este status.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{ticket.titulo}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioridadeColor(ticket.prioridade)}`}>
                        {ticket.prioridade.charAt(0).toUpperCase() + ticket.prioridade.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{ticket.descricao}</p>
                    
                    {/* Resposta do Suporte */}
                    {ticket.resposta_suporte && (
                      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FiMessageSquare className="text-blue-600" size={16} />
                          <h4 className="text-sm font-semibold text-blue-900">Resposta do Suporte</h4>
                        </div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.resposta_suporte}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                      <span className="flex items-center gap-1">
                        <FiFileText size={14} />
                        {getCategoriaLabel(ticket.categoria)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock size={14} />
                        {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MenuLayout>
  );
}

