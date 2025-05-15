'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiEye, FiEdit, FiPrinter, FiUsers } from 'react-icons/fi';

export default function ListaOrdensPage() {
  const router = useRouter();

  const ordens = [...Array(20)].map((_, i) => ({
    id: `${i + 1}`,
    cliente: `Cliente ${i + 1}`,
    aparelho: i % 2 === 0 ? 'iPhone 11' : 'Samsung A32',
    servico: i % 3 === 0 ? 'Formatação' : 'Troca de Tela',
    statusTecnico:
      i % 6 === 0
        ? 'Serviço finalizado'
        : i % 6 === 1
        ? 'Sem conserto'
        : i % 6 === 2
        ? 'Reparo em andamento'
        : i % 6 === 3
        ? 'Aguardando peça'
        : i % 6 === 4
        ? 'Em análise'
        : 'Sem reparo',
    statusOS:
      i % 5 === 0
        ? 'Finalizada'
        : i % 5 === 1
        ? 'Aguardando aprovação'
        : i % 5 === 2
        ? 'Pronta para retirada'
        : i % 5 === 3
        ? 'Aberta'
        : 'Não aprovada',
    entrada: '10/05/2025',
    entrega: '12/05/2025',
    valorPeca: 'R$ 150,00',
    valorServico: 'R$ 100,00',
    valorTotal: 'R$ 250,00',
    tecnico: i % 2 === 0 ? 'Carlos' : 'Fernanda',
  }));

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [aparelhoFilter, setAparelhoFilter] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [statusTecnicoFilter, setStatusTecnicoFilter] = useState('');

  const filtered = ordens.filter((os) => {
    const matchesSearch = os.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.aparelho.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.id.includes(searchTerm);
    const matchesStatus = statusFilter === '' || os.statusOS === statusFilter;
    const matchesAparelho = aparelhoFilter === '' || os.aparelho.includes(aparelhoFilter);
    const matchesTecnico = tecnicoFilter === '' || os.tecnico === tecnicoFilter;
    const matchesStatusTecnico = statusTecnicoFilter === '' || os.statusTecnico === statusTecnicoFilter;
    return matchesSearch && matchesStatus && matchesAparelho && matchesTecnico && matchesStatusTecnico;
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="w-full px-6 py-4">
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiUsers className="text-blue-600" />
          Aparelhos em Andamento por Técnico
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-blue-800">Carlos</h3>
            <p className="text-sm text-blue-700">3 aparelhos</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg shadow-sm hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-yellow-800">Fernanda</h3>
            <p className="text-sm text-yellow-700">5 aparelhos</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-gray-800">Eduardo</h3>
            <p className="text-sm text-gray-700">2 aparelhos</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ordens de Serviço</h1>
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm"
          />
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm"
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
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm"
            value={statusTecnicoFilter}
            onChange={(e) => setStatusTecnicoFilter(e.target.value)}
          >
            <option value="">Status Técnico</option>
            <option value="Serviço finalizado">Serviço finalizado</option>
            <option value="Sem conserto">Sem conserto</option>
            <option value="Reparo em andamento">Reparo em andamento</option>
            <option value="Aguardando peça">Aguardando peça</option>
            <option value="Em análise">Em análise</option>
            <option value="Sem reparo">Sem reparo</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm"
            value={aparelhoFilter}
            onChange={(e) => setAparelhoFilter(e.target.value)}
          >
            <option value="">Todos os Tipos</option>
            <option value="iPhone">Celulares</option>
            <option value="Samsung">Celulares</option>
            <option value="Notebook">Computadores</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm shadow-sm"
            value={tecnicoFilter}
            onChange={(e) => setTecnicoFilter(e.target.value)}
          >
            <option value="">Todos os Técnicos</option>
            <option value="Carlos">Carlos</option>
            <option value="Fernanda">Fernanda</option>
          </select>
          <button
            onClick={() => router.push('/dashboard/nova-os')}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm shadow hover:bg-blue-700 transition"
          >
            + Nova OS
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-6">
        <div className="grid grid-cols-12 items-center gap-6 text-sm font-semibold text-gray-500 px-6 mb-4">
          <div>OS</div>
          <div>Cliente</div>
          <div>Aparelho</div>
          <div>Serviço</div>
          <div>Entrada</div>
          <div>Entrega</div>
          <div>Técnico</div>
          <div>Total</div>
          <div className="mr-6">Status Técnico</div>
          <div className=" ml-10">Status OS</div>
          <div className="text-right col-span-2">Ações</div>
        </div>
        <div className="space-y-4">
          {paginated.map((os) => (
            <div
              key={os.id}
              className={`relative grid grid-cols-12 items-center gap-6 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition ${
                os.statusOS === 'Finalizada'
                  ? 'bg-green-100/30'
                  : os.statusOS === 'Aguardando aprovação'
                  ? 'bg-yellow-100/30'
                  : os.statusOS === 'Pronta para retirada'
                  ? 'bg-blue-100/30'
                  : os.statusOS === 'Não aprovada'
                  ? 'bg-red-100/30'
                  : 'bg-gray-100/30'
              }`}
            >
              <div className="font-mono text-sm text-gray-500">#{os.id}</div>
              <div className="font-medium text-gray-800">{os.cliente}</div>
              <div className="text-sm text-gray-600">{os.aparelho}</div>
              <div className="text-sm text-gray-600">{os.servico}</div>
              <div className="text-sm text-gray-600">{os.entrada}</div>
              <div className="text-sm text-gray-600">{os.entrega}</div>
              <div className="text-sm text-gray-600">{os.tecnico}</div>
              <div className="text-sm text-gray-800 font-semibold">{os.valorTotal}</div>
              <div>
                <span className={`mr-6 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  os.statusTecnico === 'Sem reparo'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {os.statusTecnico}
                </span>
              </div>
              <div>
                <span
                  className={`ml-10 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    os.statusOS === 'Finalizada'
                      ? 'bg-green-100 text-green-700'
                      : os.statusOS === 'Aguardando aprovação'
                      ? 'bg-yellow-100 text-yellow-700'
                      : os.statusOS === 'Pronta para retirada'
                      ? 'bg-blue-100 text-blue-700'
                      : os.statusOS === 'Não aprovada'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {os.statusOS}
                </span>
              </div>
              <div className="absolute right-6 flex gap-2 text-xs top-1/2 -translate-y-1/2">
                <button
                  onClick={() => router.push(`/dashboard/ordens/${os.id}`)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FiEye size={20} />
                </button>
                <button
                  onClick={() => router.push(`/dashboard/ordens/${os.id}/editar`)}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <FiEdit size={20} />
                </button>
                <button
                  onClick={() => console.log('Imprimir', os.id)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FiPrinter size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded-md text-sm font-medium border ${
                currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              } hover:bg-blue-500 hover:text-white transition`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
