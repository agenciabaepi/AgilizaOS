'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { 
  FiSearch,
  FiFilter,
  FiMessageSquare,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiX,
  FiEye,
  FiEdit,
  FiSend
} from 'react-icons/fi';

type Ticket = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  created_at: string;
  updated_at: string;
  empresa: {
    id: string;
    nome: string;
    email: string | null;
    logo_url: string | null;
  };
  usuario: {
    id: string;
    nome: string;
    email: string;
  } | null;
  resolvido_por_usuario: {
    id: string;
    nome: string;
    email: string;
  } | null;
  resposta_suporte: string | null;
  resolvido_em: string | null;
};

type TicketCounts = {
  total: number;
  aberto: number;
  em_desenvolvimento: number;
  aguardando_resposta: number;
  resolvido: number;
  fechado: number;
};

export default function TicketsAdminPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<TicketCounts>({
    total: 0,
    aberto: 0,
    em_desenvolvimento: 0,
    aguardando_resposta: 0,
    resolvido: 0,
    fechado: 0
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    prioridade: '',
    categoria: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pageSize = 20;
  
  // Refs para acessar valores atuais no polling
  const filtersRef = useRef(filters);
  const pageRef = useRef(page);
  
  // Atualizar refs quando valores mudarem
  useEffect(() => {
    filtersRef.current = filters;
    pageRef.current = page;
  }, [filters, page]);

  // Buscar tickets quando filtros ou página mudarem
  useEffect(() => {
    fetchTickets();
  }, [filters, page]);

  // Polling independente para atualização em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      // Usar valores atuais das refs
      const currentFilters = filtersRef.current;
      const currentPage = pageRef.current;
      
      const params = new URLSearchParams();
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.prioridade) params.append('prioridade', currentFilters.prioridade);
      if (currentFilters.categoria) params.append('categoria', currentFilters.categoria);
      if (currentFilters.search) params.append('search', currentFilters.search);
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      params.append('_t', Date.now().toString());

      fetch(`/api/admin-saas/tickets?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            setTickets(data.tickets || []);
            setCounts(data.counts || counts);
            setTotal(data.total || 0);
            setLastUpdate(new Date());
          }
        })
        .catch(err => console.error('Erro no polling:', err));
    }, 10000); // 10 segundos
    
    return () => clearInterval(interval);
  }, []); // Sem dependências - sempre usa os valores atuais das refs

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.prioridade) params.append('prioridade', filters.prioridade);
      if (filters.categoria) params.append('categoria', filters.categoria);
      if (filters.search) params.append('search', filters.search);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      // Adicionar timestamp para evitar cache
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/admin-saas/tickets?${params.toString()}`, {
        cache: 'no-store', // Não usar cache
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();

      if (data.ok) {
        setTickets(data.tickets || []);
        setCounts(data.counts || counts);
        setTotal(data.total || 0);
        setLastUpdate(new Date());
      } else {
        console.error('Erro na resposta da API:', data);
        addToast('error', data.message || 'Erro ao carregar tickets');
      }
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      addToast('error', 'Erro ao carregar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/admin-saas/tickets/${ticketId}`, {
        method: 'GET',
        cache: 'no-store'
      });
      const data = await response.json();

      if (data.ok) {
        setSelectedTicket(data.ticket);
        setShowDetails(true);
        
        // Se o ticket está em "aguardando_resposta", mudar automaticamente para "aberto"
        if (data.ticket.status === 'aguardando_resposta') {
          // Atualizar status para "aberto" automaticamente
          const updateResponse = await fetch(`/api/admin-saas/tickets/${ticketId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'aberto'
            })
          });
          
          const updateData = await updateResponse.json();
          if (updateData.ok) {
            // Atualizar o ticket na lista e no modal
            setSelectedTicket(updateData.ticket);
            fetchTickets(); // Atualizar a lista
          }
        }
      } else {
        addToast('error', 'Erro ao carregar ticket');
      }
    } catch (error) {
      console.error('Erro ao buscar ticket:', error);
      addToast('error', 'Erro ao carregar ticket');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aguardando_resposta':
        return 'bg-orange-100 text-orange-800';
      case 'aberto':
        return 'bg-blue-100 text-blue-800';
      case 'em_desenvolvimento':
        return 'bg-yellow-100 text-yellow-800';
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
      case 'aguardando_resposta':
        return 'Aguardando Resposta';
      case 'aberto':
        return 'Aberto';
      case 'em_desenvolvimento':
        return 'Em Desenvolvimento';
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets de Suporte</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie todos os tickets do sistema
            {lastUpdate && (
              <span className="ml-2 text-xs">
                • Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchTickets()}
          className="text-sm"
        >
          Atualizar
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{counts.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Abertos</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{counts.aberto}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Em Dev</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{counts.em_desenvolvimento}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Aguardando</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{counts.aguardando_resposta}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Resolvidos</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{counts.resolvido}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-500">Fechados</div>
          <div className="text-2xl font-bold text-gray-600 mt-1">{counts.fechado}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              placeholder="Buscar por título ou descrição..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Todos os status</option>
              <option value="aguardando_resposta">Aguardando Resposta</option>
              <option value="aberto">Aberto</option>
              <option value="em_desenvolvimento">Em Desenvolvimento</option>
              <option value="resolvido">Resolvido</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>
          <div>
            <select
              value={filters.prioridade}
              onChange={(e) => setFilters({ ...filters, prioridade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Todas as prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
          <div>
            <select
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Todas as categorias</option>
              <option value="bug">Bug</option>
              <option value="melhoria">Melhoria</option>
              <option value="duvida">Dúvida</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Tickets */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-2 text-sm text-gray-500">Carregando tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FiMessageSquare className="mx-auto text-gray-400" size={48} />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nenhum ticket encontrado</h3>
          <p className="mt-2 text-sm text-gray-500">Não há tickets com os filtros selecionados.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{ticket.titulo}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{ticket.descricao}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {ticket.empresa.logo_url ? (
                          <img 
                            src={ticket.empresa.logo_url} 
                            alt={ticket.empresa.nome}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-400">
                              {ticket.empresa.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{ticket.empresa.nome}</div>
                          {ticket.usuario && (
                            <div className="text-xs text-gray-500">{ticket.usuario.nome}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPrioridadeColor(ticket.prioridade)}`}>
                        {ticket.prioridade.charAt(0).toUpperCase() + ticket.prioridade.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        onClick={() => handleViewTicket(ticket.id)}
                        className="bg-black hover:bg-gray-800 text-white"
                      >
                        <FiEye className="mr-1" />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {total > pageSize && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} tickets
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= total}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Detalhes */}
      {showDetails && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetails(false);
            setSelectedTicket(null);
          }}
          onUpdate={fetchTickets}
        />
      )}
    </div>
  );
}

// Componente de Modal de Detalhes
function TicketDetailsModal({ 
  ticket, 
  onClose, 
  onUpdate 
}: { 
  ticket: Ticket; 
  onClose: () => void; 
  onUpdate: () => void;
}) {
  const { addToast } = useToast();
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [status, setStatus] = useState(ticket.status);
  const [prioridade, setPrioridade] = useState(ticket.prioridade);
  const [resposta, setResposta] = useState(ticket.resposta_suporte || '');
  const [comentario, setComentario] = useState('');
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Atualizar estados quando o ticket prop mudar
  useEffect(() => {
    setCurrentTicket(ticket);
    setStatus(ticket.status);
    setPrioridade(ticket.prioridade);
    setResposta(ticket.resposta_suporte || '');
  }, [ticket]);

  useEffect(() => {
    if (!currentTicket?.id) return;
    
    fetchComentarios();
    
    // Atualizar comentários automaticamente a cada 5 segundos
    const interval = setInterval(() => {
      fetchComentarios();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentTicket.id]);

  const fetchComentarios = async () => {
    try {
      const response = await fetch(`/api/admin-saas/tickets/${currentTicket.id}`);
      const data = await response.json();
      if (data.ok) {
        if (data.ticket.comentarios) {
          setComentarios(data.ticket.comentarios);
        }
        // Atualizar também o ticket completo caso tenha mudado
        if (data.ticket) {
          setCurrentTicket(data.ticket);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin-saas/tickets/${currentTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          prioridade,
          resposta_suporte: resposta
        })
      });

      const data = await response.json();
      if (data.ok) {
        addToast('success', 'Ticket atualizado com sucesso!');
        // Atualizar o ticket na lista imediatamente
        onUpdate();
        // Atualizar o ticket selecionado com os novos dados
        if (data.ticket) {
          setCurrentTicket(data.ticket);
          setStatus(data.ticket.status);
          setPrioridade(data.ticket.prioridade);
          setResposta(data.ticket.resposta_suporte || '');
        }
      } else {
        addToast('error', 'Erro ao atualizar ticket');
      }
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
      addToast('error', 'Erro ao atualizar ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comentario.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin-saas/tickets/${currentTicket.id}/comentarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ comentario })
      });

      const data = await response.json();
      if (data.ok) {
        addToast('success', 'Comentário adicionado!');
        setComentario('');
        fetchComentarios();
      } else {
        addToast('error', 'Erro ao adicionar comentário');
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      addToast('error', 'Erro ao adicionar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Detalhes do Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações do Ticket */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="aguardando_resposta">Aguardando Resposta</option>
                <option value="aberto">Aberto</option>
                <option value="em_desenvolvimento">Em Desenvolvimento</option>
                <option value="resolvido">Resolvido</option>
                <option value="fechado">Fechado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{currentTicket.titulo}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{currentTicket.descricao}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resposta do Suporte</label>
            <textarea
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              placeholder="Digite a resposta para o cliente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black min-h-[120px]"
            />
          </div>

          {/* Comentários */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comentários</label>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {comentarios.map((coment) => (
                <div key={coment.id} className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {coment.usuario?.nome || 'Suporte'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(coment.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{coment.comentario}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Adicionar comentário interno..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black min-h-[80px]"
              />
              <Button
                onClick={handleAddComment}
                disabled={submitting || !comentario.trim()}
                className="bg-black hover:bg-gray-800 text-white"
              >
                <FiSend />
              </Button>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleUpdateStatus}
              disabled={loading}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

