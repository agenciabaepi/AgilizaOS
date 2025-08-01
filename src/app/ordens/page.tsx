
'use client';

interface OrdemServico {
  id: string;
  numero_os: number;
  clientes?: {
    nome?: string;
    telefone?: string;
    email?: string;
  };
  categoria?: string;
  marca?: string;
  modelo?: string;
  cor?: string;
  servico?: string;
  status?: string;
  created_at?: string;
  tecnico_id?: {
    nome?: string;
  };
  atendente?: string;
  data_entrega?: string;
  valor_peca?: number;
  valor_servico?: number;
  desconto?: number;
  valor_faturado?: number;
  qtd_peca?: number;
  qtd_servico?: number;
  tipo?: string;
  usuarios?: {
    nome?: string;
  }[];
}

interface OrdemTransformada {
  id: string;
  numero: number;
  cliente: string;
  clienteTelefone: string;
  clienteEmail: string;
  aparelho: string;
  servico: string;
  statusOS: string;
  entrada: string;
  tecnico: string;
  atendente: string;
  entrega: string;
  garantia: string;
  valorPeca: number;
  valorServico: number;
  desconto: number;
  valorTotal: number;
  valorComDesconto: number;
  valorFaturado: number;
  tipo: string;
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEdit, FiPrinter, FiRefreshCw, FiPlus } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import ProtectedArea from '@/components/ProtectedArea';
import DashboardCard from '@/components/ui/DashboardCard';
import MenuLayout from '@/components/MenuLayout';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Select } from '@/components/Select';


export default function ListaOrdensPage() {
  const router = useRouter();
  const { empresaData } = useAuth();
  const empresaId = empresaData?.id;

  // Estados dos cards principais
  const [totalOS, setTotalOS] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [retornosMes, setRetornosMes] = useState(0);
  const [osConcluidas, setOsConcluidas] = useState(0);
  const [percentualConcluidas, setPercentualConcluidas] = useState(0);
  const [percentualRetornos, setPercentualRetornos] = useState(0);
  // Novos estados para crescimento real semana/mês
  const [crescimentoSemana, setCrescimentoSemana] = useState(0);
  const [crescimentoMes, setCrescimentoMes] = useState(0);
  // Remover tecnicosDict se não está sendo usado
  // const [tecnicosDict, setTecnicosDict] = useState<Record<string, string>>({});

  function formatDate(date: string) {
    return date ? new Date(date).toLocaleDateString('pt-BR') : '';
  }

  function formatPhoneNumber(phone: string) {
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  }

  const [ordens, setOrdens] = useState<OrdemTransformada[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [aparelhoFilter, setAparelhoFilter] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  useEffect(() => {
    if (!empresaId) return;
    const fetchOrdens = async () => {
      console.log('🟢 Iniciando fetchOrdens');
      console.log('🟡 empresaId recebido:', empresaId);

      if (!empresaId) {
        console.warn('[ListaOrdensPage] empresaId não definido, abortando fetch');
        return;
      }

      const empresaUuid = empresaId as `${string}-${string}-${string}-${string}-${string}`;

      const session = await supabase.auth.getSession();
      console.log('🟠 SESSION:', session);
      console.log('🔵 USER ID:', session.data.session?.user?.id);

      console.log("🟢 SESSION:", session.data.session);

      const user = session.data.session?.user;
      console.log("🟡 USER UID:", user?.id);

      console.log("🔵 EMPRESA ID usada na query:", empresaUuid);

      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          clientes:cliente_id(nome, telefone, email),
          usuarios!tecnico_id ( nome ),
          qtd_peca,
          qtd_servico,
          tipo
        `)
        .eq("empresa_id", empresaUuid);

      console.log('🟣 Dados retornados:', data);
      console.log('🔴 Erro na query:', error);

      if (error) {
        console.error('Erro ao carregar OS:', JSON.stringify(error, null, 2));
      } else if (data) {
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const mapped = data.map((item: OrdemServico) => ({
          id: item.id,
          numero: item.numero_os,
          cliente: item.clientes?.nome || 'Sem nome',
          clienteTelefone: item.clientes?.telefone ? formatPhoneNumber(item.clientes.telefone) : '',
          clienteEmail: item.clientes?.email || '',
          aparelho: [item.categoria, item.marca, item.modelo, item.cor].filter(Boolean).join(' ') || '',
          servico: item.servico || '',
          statusOS: item.status || '',
          entrada: item.created_at || '',
          tecnico: item.usuarios?.[0]?.nome || '',
          atendente: item.atendente || '',
          entrega: item.data_entrega || '',
          garantia: item.data_entrega
            ? new Date(new Date(item.data_entrega).setDate(new Date(item.data_entrega).getDate() + 90)).toISOString()
            : '',
          valorPeca: item.valor_peca || 0,
          valorServico: item.valor_servico || 0,
          desconto: item.desconto || 0,
          valorTotal: ((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1)),
          valorComDesconto: (((item.valor_peca || 0) * (item.qtd_peca || 1)) + ((item.valor_servico || 0) * (item.qtd_servico || 1))) - (item.desconto || 0),
          valorFaturado: item.valor_faturado || 0,
          tipo: item.tipo || 'Nova',
        }));
        setOrdens(mapped);

        // Lógica dos cards principais e crescimento real semana/mês
        // Datas de corte
        const agora = new Date();
        const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
        const primeiroDiaMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const ultimoDiaMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);
        const seteDiasAtras = new Date(agora);
        seteDiasAtras.setDate(agora.getDate() - 7);
        const quatorzeDiasAtras = new Date(agora);
        quatorzeDiasAtras.setDate(agora.getDate() - 14);

        // Totais reais
        const totalMesAtual = data.filter(os => new Date(os.created_at) >= primeiroDiaMes).length;
        const totalMesAnterior = data.filter(os => {
          const d = new Date(os.created_at);
          return d >= primeiroDiaMesAnterior && d <= ultimoDiaMesAnterior;
        }).length;

        const totalSemanaAtual = data.filter(os => new Date(os.created_at) >= seteDiasAtras).length;
        const totalSemanaAnterior = data.filter(os => {
          const d = new Date(os.created_at);
          return d >= quatorzeDiasAtras && d < seteDiasAtras;
        }).length;

        const retornos = data.filter(os => os.tipo === 'Retorno' && new Date(os.created_at) >= primeiroDiaMes).length;
        const concluidas = data.filter(os =>
          os.status?.toLowerCase() === 'concluido' && new Date(os.created_at) >= primeiroDiaMes
        ).length;

        const calcPercent = (atual: number, anterior: number) => {
          if (anterior === 0) return atual > 0 ? 100 : 0;
          return Math.round(((atual - anterior) / anterior) * 100);
        };

        const percentualSemana = calcPercent(totalSemanaAtual, totalSemanaAnterior);
        const percentualMes = calcPercent(totalMesAtual, totalMesAnterior);

        setTotalOS(data.length);
        setTotalMes(totalMesAtual);
        setRetornosMes(retornos);
        setOsConcluidas(concluidas);
        setPercentualConcluidas(data.length ? Math.round((concluidas / data.length) * 100) : 0);
        setPercentualRetornos(data.length ? Math.round((retornos / data.length) * 100) : 0);
        setCrescimentoSemana(percentualSemana);
        setCrescimentoMes(percentualMes);
      }
    };

    fetchOrdens();
  }, [empresaId]);

  // Buscar todos os técnicos da empresa e montar dicionário auth_user_id -> nome
  useEffect(() => {
    if (!empresaId) return;
    const fetchTecnicos = async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('auth_user_id, nome')
        .eq('empresa_id', empresaId)
        .eq('nivel', 'tecnico');
      if (!error && data) {
        const dict: Record<string, string> = {};
        data.forEach((t: { auth_user_id: string, nome: string }) => {
          dict[t.auth_user_id] = t.nome;
        });
        // setTecnicosDict(dict); // Remover tecnicosDict se não está sendo usado
      }
    };
    fetchTecnicos();
  }, [empresaId]);

  // Otimização: useMemo para dados filtrados
  const filtered = useMemo(() => {
    return ordens.filter((os) => {
      const matchesSearch = os.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.aparelho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(os.id).includes(searchTerm);
      const matchesStatus = statusFilter === '' || os.statusOS === statusFilter;
      const matchesAparelho = aparelhoFilter === '' || os.aparelho.includes(aparelhoFilter);
      const matchesTecnico = tecnicoFilter === '' || os.tecnico === tecnicoFilter;
      const matchesTipo = tipoFilter === '' || os.tipo === tipoFilter;
      return matchesSearch && matchesStatus && matchesAparelho && matchesTecnico && matchesTipo;
    });
  }, [ordens, searchTerm, statusFilter, aparelhoFilter, tecnicoFilter, tipoFilter]);

  // Otimização: useMemo para dados paginados
  const paginated = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Otimização: useMemo para total de páginas
  const totalPages = useMemo(() => {
    return Math.ceil(filtered.length / itemsPerPage);
  }, [filtered.length, itemsPerPage]);

  // Otimização: useCallback para handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleAparelhoFilterChange = useCallback((value: string) => {
    setAparelhoFilter(value);
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

  if (!empresaId) {
    return (
      <div className="p-6 text-center text-gray-500 animate-pulse">
        Carregando ordens de serviço...
      </div>
    );
  }

  return (
    <ProtectedArea area="ordens">
      <MenuLayout>
        <div className="p-8">
          {/* Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <DashboardCard
              title="Total de OS"
              value={totalOS}
              description={`+${crescimentoSemana}% na última semana`}
              descriptionColorClass="text-green-500"
              svgPolyline={{ color: '#84cc16', points: '0,20 10,15 20,17 30,10 40,12 50,8 60,10 70,6' }}
            />
            <DashboardCard
              title="OS no Mês"
              value={totalMes}
              description={`+${crescimentoMes}% em relação ao mês anterior`}
              descriptionColorClass="text-green-500"
              svgPolyline={{ color: '#4ade80', points: '0,18 10,16 20,14 30,10 40,11 50,9 60,10 70,6' }}
            />
            <DashboardCard
              title="Retornos do Mês"
              icon={<FiRefreshCw className="w-4 h-4 text-red-500" />}
              value={retornosMes}
              description={`${percentualRetornos}% do total`}
              descriptionColorClass="text-red-500"
              svgPolyline={{ color: '#f87171', points: '0,12 10,14 20,16 30,18 40,20 50,17 60,15 70,16' }}
            />
            <DashboardCard
              title="OS Concluídas"
              value={osConcluidas}
              description={`${percentualConcluidas}% do total`}
              descriptionColorClass="text-blue-500"
              svgPolyline={{ color: '#60a5fa', points: '0,20 10,16 20,14 30,10 40,11 50,8 60,6 70,4' }}
            />
          </div>


          {/* Filtros e busca */}
          <h1 className="text-2xl font-bold mb-6">Ordens de Serviço</h1>
          
                    <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Button
                onClick={() => {
                  router.push("/nova-os");
                }}
                size="lg"
                className="bg-black text-white hover:bg-neutral-800 px-8 py-3 text-base font-semibold"
              >
                + Nova OS
              </Button>
              
              <Input
                type="text"
                placeholder="Buscar OS..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="flex-1 min-w-80"
              />
              
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="w-48"
              >
                <option value="">Filtrar por Status</option>
                <option value="Finalizada">Finalizada</option>
                <option value="Aguardando aprovação">Aguardando aprovação</option>
                <option value="Pronta para retirada">Pronta para retirada</option>
                <option value="Aberta">Aberta</option>
                <option value="Não aprovada">Não aprovada</option>
              </Select>
              <Select
                value={aparelhoFilter}
                onChange={(e) => handleAparelhoFilterChange(e.target.value)}
                className="w-48"
              >
                <option value="">Todos os Tipos</option>
                <option value="iPhone">Celulares</option>
                <option value="Samsung">Celulares</option>
                <option value="Notebook">Computadores</option>
              </Select>
              <Select
                value={tecnicoFilter}
                onChange={(e) => handleTecnicoFilterChange(e.target.value)}
                className="w-48"
              >
                <option value="">Todos os Técnicos</option>
                <option value="Carlos">Carlos</option>
                <option value="Fernanda">Fernanda</option>
              </Select>
              <Select
                value={tipoFilter}
                onChange={(e) => handleTipoFilterChange(e.target.value)}
                className="w-48"
              >
                <option value="">Todos os Tipos</option>
                <option value="Nova">🟢 Nova</option>
                <option value="Retorno">🔴 Retorno</option>
              </Select>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <FiRefreshCw className="w-4 h-4" />
                        <span>Tipo</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aparelho</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serviço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrega</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Garantia</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginated.map((os) => (
                    <tr key={os.id} className={`hover:bg-gray-50 transition-colors ${
                      os.tipo === 'Retorno' ? 'border-l-4 border-l-red-400' : ''
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">#{os.numero}</span>
                          {os.tipo === 'Retorno' && (
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{os.cliente}</div>
                        <div className="text-sm text-gray-400">{os.clienteTelefone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {os.tipo === 'Retorno' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FiRefreshCw className="w-3 h-3 mr-1" />
                            Retorno
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FiPlus className="w-3 h-3 mr-1" />
                            Nova
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{os.aparelho}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{os.servico}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(os.entrada)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(os.entrega)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        os.garantia && new Date(os.garantia) < new Date()
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}>
                        <div>{formatDate(os.garantia)}</div>
                        {os.garantia && (
                          <div className="text-xs text-gray-500">
                            {
                              new Date(os.garantia).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                                ? 'Expirada'
                                : `${Math.max(0, Math.ceil((new Date(os.garantia).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))} dias restantes`
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">R$ {os.valorTotal?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{os.tecnico}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            os.statusOS.toLowerCase() === 'concluido' ? 'bg-green-100 text-green-800' :
                            os.statusOS.toLowerCase() === 'orcamento' ? 'bg-yellow-100 text-yellow-800' :
                            os.statusOS.toLowerCase() === 'analise' ? 'bg-blue-100 text-blue-800' :
                            os.statusOS.toLowerCase() === 'nao aprovado' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {os.statusOS}
                          </span>
                          {os.tipo === 'Retorno' && (
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => router.push(`/ordens/${os.id}`)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <FiEye size={16} />
                          </Button>
                          <Button
                            onClick={() => router.push(`/ordens/${os.id}/editar`)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <FiEdit size={16} />
                          </Button>
                          <Button
                            onClick={() => console.log('Imprimir', os.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <FiPrinter size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </div>
      </MenuLayout>
    </ProtectedArea>
  );
}
