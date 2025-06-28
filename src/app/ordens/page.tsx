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
        const mapped = data.map((item: any) => ({
          id: item.id,
          numero: item.numero_os,
          cliente: item.clientes?.nome || 'Sem nome',
          clienteTelefone: item.clientes?.telefone || '',
          clienteEmail: item.clientes?.email || '',
          aparelho: [item.categoria, item.marca, item.modelo, item.cor].filter(Boolean).join(' ') || '',
          servico: item.servico || '',
          statusOS: item.status || '',
          entrada: item.created_at || '',
          tecnico: item.tecnico_id?.nome || '',
          atendente: item.atendente || '',
          entrega: item.data_entrega || '',
          garantia: item.vencimento_garantia || '',
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
        <div className="overflow-x-auto rounded-lg shadow-md bg-white p-4">
          <table className="min-w-full divide-y divide-gray-200 text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Telefone</th>
                <th className="px-3 py-2">Aparelho</th>
                <th className="px-3 py-2">Serviço</th>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Garantia</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Técnico</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginated.map((os) => (
                <tr key={os.id} className="hover:bg-gray-50 transition">
                  <td className="px-3 py-2 font-medium">#{os.numero}</td>
                  <td className="px-3 py-2">{os.cliente}</td>
                  <td className="px-3 py-2">{os.clienteTelefone}</td>
                  <td className="px-3 py-2">{os.aparelho}</td>
                  <td className="px-3 py-2">{os.servico}</td>
                  <td className="px-3 py-2">{formatDate(os.entrega)}</td>
                  <td className="px-3 py-2">{os.atendente}</td>
                  <td className="px-3 py-2">{formatDate(os.garantia)}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">R$ {os.valorTotal?.toFixed(2)}</td>
                  <td className="px-3 py-2">{os.tecnico}</td>
                  <td className="px-3 py-2">
                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{os.statusOS}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {console.log('Visualizar OS ID:', os.id)}
                      <button onClick={() => router.push(`/ordens/${os.id}`)} className="text-blue-600 hover:text-blue-800">
                        <FiEye size={18} />
                      </button>
                      <button onClick={() => router.push(`/ordens/editar/${os.id}`)} className="text-yellow-600 hover:text-yellow-800">
                        <FiEdit size={18} />
                      </button>
                      <button onClick={() => console.log('Imprimir', os.id)} className="text-gray-600 hover:text-gray-800">
                        <FiPrinter size={18} />
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
