'use client';

import MenuLayout from '@/components/MenuLayout';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FiEye, FiEdit, FiPrinter, FiUsers } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

export default function ListaOrdensPage() {
  const router = useRouter();
  const { usuarioData, empresaData } = useAuth();
  const empresaId = empresaData?.id;

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

  const [ordens, setOrdens] = useState<any[]>([]);
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
          tecnico_id(nome)
        `)
        .eq("empresa_id", empresaUuid);

      console.log('🟣 Dados retornados:', data);
      console.log('🔴 Erro na query:', error);

      if (error) {
        console.error('Erro ao carregar OS:', JSON.stringify(error, null, 2));
      } else if (data) {
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const mapped = data.map((item: any) => ({
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
          valorTotal: (item.valor_peca || 0) + (item.valor_servico || 0),
          valorComDesconto: ((item.valor_peca || 0) + (item.valor_servico || 0)) - (item.desconto || 0),
          valorFaturado: item.valor_faturado || 0,
        }));
        setOrdens(mapped);
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
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm text-red-600 font-semibold">
                    {formatDate(os.garantia)}
                  </td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm text-left font-bold text-green-700">R$ {os.valorTotal?.toFixed(2)}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-sm">{os.tecnico}</td>
                  <td className="px-3 py-2 align-middle border-r border-gray-100 text-left  text-sm">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      os.statusOS === 'Finalizada' ? 'bg-green-100 text-green-700' :
                      os.statusOS === 'Aguardando aprovação' ? 'bg-yellow-100 text-yellow-700' :
                      os.statusOS === 'Não aprovada' ? 'bg-red-100 text-red-700' :
                      os.statusOS === 'Pronta para retirada' ? 'bg-blue-100 text-blue-700' :
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
