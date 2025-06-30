
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
}

import MenuLayout from '@/components/MenuLayout';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FiEye, FiEdit, FiPrinter, FiUsers } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';


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
          tecnico_id(nome),
          qtd_peca,
          qtd_servico
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
          tecnico: item.tecnico_id?.nome || '',
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

  const filtered = ordens.filter((os) => {
    const matchesSearch = os.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.aparelho.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(os.id).includes(searchTerm);
    const matchesStatus = statusFilter === '' || os.statusOS === statusFilter;
    const matchesAparelho = aparelhoFilter === '' || os.aparelho.includes(aparelhoFilter);
    const matchesTecnico = tecnicoFilter === '' || os.tecnico === tecnicoFilter;
    return matchesSearch && matchesStatus && matchesAparelho && matchesTecnico;
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (!empresaId) {
    return (
      <div className="p-6 text-center text-gray-500 animate-pulse">
        Carregando ordens de serviço...
      </div>
    );
  }

  return (
    <MenuLayout>
      <div className="pt-20 px-6 w-full">
        {/* Cards principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Total de OS */}
          <div className="bg-white rounded-xl shadow-md p-5 relative overflow-hidden">
            <h3 className="text-gray-500 text-sm mb-1">Total de OS</h3>
            <p className="text-3xl font-bold text-black">{totalOS}</p>
            <div className="text-green-500 text-sm mt-2 flex items-center gap-1">
              <span>+{crescimentoSemana}%</span>
              <span className="text-gray-400">na última semana</span>
            </div>
            <div className="absolute bottom-2 right-2 opacity-40">
              <svg width="80" height="24">
                <polyline fill="none" stroke="#84cc16" strokeWidth="2" points="0,20 10,15 20,17 30,10 40,12 50,8 60,10 70,6" />
              </svg>
            </div>
          </div>
          {/* OS no Mês */}
          <div className="bg-white rounded-xl shadow-md p-5 relative overflow-hidden">
            <h3 className="text-gray-500 text-sm mb-1">OS no Mês</h3>
            <p className="text-3xl font-bold text-black">{totalMes}</p>
            <div className="text-green-500 text-sm mt-2 flex items-center gap-1">
              <span>+{crescimentoMes}%</span>
              <span className="text-gray-400">em relação ao mês anterior</span>
            </div>
            <div className="absolute bottom-2 right-2 opacity-40">
              <svg width="80" height="24">
                <polyline fill="none" stroke="#4ade80" strokeWidth="2" points="0,18 10,16 20,14 30,10 40,11 50,9 60,10 70,6" />
              </svg>
            </div>
          </div>
          {/* Retornos do Mês */}
          <div className="bg-white rounded-xl shadow-md p-5 relative overflow-hidden">
            <h3 className="text-gray-500 text-sm mb-1">Retornos do Mês</h3>
            <p className="text-3xl font-bold text-black">{retornosMes}</p>
            <div className="text-red-500 text-sm mt-2 flex items-center gap-1">
              <span>{percentualRetornos}%</span>
              <span className="text-gray-400">do total</span>
            </div>
            <div className="absolute bottom-2 right-2 opacity-40">
              <svg width="80" height="24">
                <polyline fill="none" stroke="#f87171" strokeWidth="2" points="0,12 10,14 20,16 30,18 40,20 50,17 60,15 70,16" />
              </svg>
            </div>
          </div>
          {/* OS Concluídas */}
          <div className="bg-white rounded-xl shadow-md p-5 relative overflow-hidden">
            <h3 className="text-gray-500 text-sm mb-1">OS Concluídas</h3>
            <p className="text-3xl font-bold text-black">{osConcluidas}</p>
            <div className="text-blue-500 text-sm mt-2 flex items-center gap-1">
              <span>{percentualConcluidas}%</span>
              <span className="text-gray-400">do total</span>
            </div>
            <div className="absolute bottom-2 right-2 opacity-40">
              <svg width="80" height="24">
                <polyline fill="none" stroke="#60a5fa" strokeWidth="2" points="0,20 10,16 20,14 30,10 40,11 50,8 60,6 70,4" />
              </svg>
            </div>
          </div>
        </div>
        {/* Cards de técnicos */}
        <div className="backdrop-blur-sm bg-white/60 p-6 rounded-xl shadow mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FiUsers className="text-white" />
            Aparelhos em Andamento por Técnico
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#cffb6d]/20 border border-[#cffb6d] p-4 rounded-lg shadow-sm hover:shadow-md transition text-[#333]">
              <h3 className="text-sm font-semibold">Carlos</h3>
              <p className="text-sm">3 aparelhos</p>
            </div>
            <div className="bg-[#cffb6d]/30 border border-[#cffb6d] p-4 rounded-lg shadow-sm hover:shadow-md transition text-[#333]">
              <h3 className="text-sm font-semibold">Fernanda</h3>
              <p className="text-sm">5 aparelhos</p>
            </div>
            <div className="bg-white border border-[#ccc] p-4 rounded-lg shadow-sm hover:shadow-md transition text-[#555]">
              <h3 className="text-sm font-semibold">Eduardo</h3>
              <p className="text-sm">2 aparelhos</p>
            </div>
          </div>
        </div>

        {/* Filtros e busca */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Buscar OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm bg-white/70 backdrop-blur"
            />
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm bg-white/70 backdrop-blur"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Filtrar por Status</option>
              <option value="Finalizada">Finalizada</option>
              <option value="Aguardando aprovação">Aguardando aprovação</option>
              <option value="Pronta para retirada">Pronta para retirada</option>
              <option value="Aberta">Aberta</option>
              <option value="Não aprovada">Não aprovada</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm bg-white/70 backdrop-blur"
              value={aparelhoFilter}
              onChange={(e) => setAparelhoFilter(e.target.value)}
            >
              <option value="">Todos os Tipos</option>
              <option value="iPhone">Celulares</option>
              <option value="Samsung">Celulares</option>
              <option value="Notebook">Computadores</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm bg-white/70 backdrop-blur"
              value={tecnicoFilter}
              onChange={(e) => setTecnicoFilter(e.target.value)}
            >
              <option value="">Todos os Técnicos</option>
              <option value="Carlos">Carlos</option>
              <option value="Fernanda">Fernanda</option>
            </select>
            <button
              onClick={() => {
                router.push("/nova-os");
              }}
              className="rounded-md bg-lime-400 px-4 py-2 text-black font-medium hover:bg-lime-300 transition-all"
            >
              + Nova OS
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-auto rounded-lg border border-gray-200 mt-4">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-100 text-left text-xs font-semibold text-gray-700 border-b border-gray-300">
              <tr>
                <th className="px-3 py-2 border-r border-gray-200">#</th>
                <th className="px-3 py-2 border-r border-gray-200">Aparelho</th>
                <th className="px-3 py-2 border-r border-gray-200">Serviço</th>
                <th className="px-3 py-2 border-r border-gray-200">Entrada</th>
                <th className="px-3 py-2 border-r border-gray-200">Entrega</th>
                <th className="px-3 py-2 border-r border-gray-200">Garantia</th>
                <th className="px-3 py-2 border-r border-gray-200">Total</th>
                <th className="px-3 py-2 border-r border-gray-200">Técnico</th>
                <th className="px-3 py-2 border-r border-gray-200">Status</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 divide-y divide-gray-200">
              {paginated.map((os) => (
                <tr key={os.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm font-medium text-gray-900">
                    <div className="text-sm font-bold text-gray-800">#{os.numero}</div>
                    <div className="text-sm text-gray-700">{os.cliente}</div>
                    <div className="text-sm text-gray-500">{os.clienteTelefone}</div>
                  </td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm">{os.aparelho}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm">{os.servico}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm">{formatDate(os.entrada)}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm">{formatDate(os.entrega)}</td>
                  <td className={`px-3 py-2 align-middle border-r border-gray-100 text-sm font-semibold ${
                    os.garantia && new Date(os.garantia) < new Date()
                      ? 'text-red-400'
                      : 'text-green-600'
                  }`}>
                    <div>{formatDate(os.garantia)}</div>
                    {os.garantia && (
                      <div className="text-xs mt-1">
                        {
                          new Date(os.garantia).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)
                            ? 'Expirada'
                            : `${Math.max(0, Math.ceil((new Date(os.garantia).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))} dias restantes`
                        }
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm text-left font-bold text-green-700">R$ {os.valorTotal?.toFixed(2)}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm">{os.tecnico}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-left  text-sm">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full capitalize ${
                      os.statusOS.toLowerCase() === 'concluido' ? 'bg-green-100 text-green-700' :
                      os.statusOS.toLowerCase() === 'orcamento' ? 'bg-yellow-100 text-yellow-700' :
                      os.statusOS.toLowerCase() === 'analise' ? 'bg-blue-100 text-blue-700' :
                      os.statusOS.toLowerCase() === 'nao aprovado' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {os.statusOS}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-left text-sm">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => router.push(`/ordens/${os.id}`)} className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition">
                        <FiEye size={16} />
                      </button>
                      <button onClick={() => router.push(`/ordens/${os.id}/editar`)} className="p-2 rounded-full bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition">
                        <FiEdit size={16} />
                      </button>
                      <button onClick={() => console.log('Imprimir', os.id)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                        <FiPrinter size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-md text-sm font-medium border ${
                currentPage === i + 1 ? 'bg-[#cffb6d] text-black' : 'bg-white text-gray-700'
              } hover:bg-lime-400 hover:text-black transition`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </MenuLayout>
  );
}
