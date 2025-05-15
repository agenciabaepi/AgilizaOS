'use client';

import { useRouter } from 'next/navigation';
import { FiCpu, FiPlayCircle } from 'react-icons/fi';
import { useState } from 'react';

const ordensTecnico = [...Array(5)].map((_, i) => ({
  id: `${i + 201}`,
  cliente: `Cliente ${i + 1}`,
  aparelho: i % 2 === 0 ? 'iPhone 13' : 'Notebook Dell',
  status: 'Aguardando Início',
  entrada: '14/05/2025',
  prazo: '16/05/2025',
}));

export default function BancadaPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  const iniciarOrdem = (id: string) => {
    // Aqui podemos futuramente atualizar o status para "Em análise"
    router.push(`/dashboard/bancada/${id}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <FiCpu className="text-blue-600" />
        Minha Bancada
      </h1>

      <div className="sticky top-0 z-10 pt-4 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-1">
          <div className="bg-white p-5 min-h-[90px] flex flex-col justify-center rounded-xl shadow border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Finalizados no mês</p>
            <p className="text-2xl font-semibold text-green-600">8</p>
          </div>
          <div className="bg-white p-5 min-h-[90px] flex flex-col justify-center rounded-xl shadow border-l-4 border-yellow-500">
            <p className="text-sm text-gray-500">Pendentes no mês</p>
            <p className="text-2xl font-semibold text-yellow-600">3</p>
          </div>
          <div className="bg-white p-5 min-h-[90px] flex flex-col justify-center rounded-xl shadow border-l-4 border-blue-500">
            <p className="text-sm text-gray-500">Comissão do mês</p>
            <p className="text-2xl font-semibold text-blue-600">R$ 420,00</p>
          </div>
          <div className="bg-white p-5 min-h-[90px] flex flex-col justify-center rounded-xl shadow border-l-4 border-gray-500">
            <p className="text-sm text-gray-500">Já sacado no mês</p>
            <p className="text-2xl font-semibold text-gray-600">R$ 180,00</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded-lg px-4 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {['Todos', 'Aguardando Início', 'Em análise', 'Aguardando peça', 'Concluído'].map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                filtroStatus === status
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {ordensTecnico
          .filter((os) =>
            os.cliente.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .filter((os) => {
            if (filtroStatus === 'Todos') return true;
            return os.status === filtroStatus;
          })
          .map((os) => (
            <div
              key={os.id}
              className="bg-white p-6 rounded-xl shadow flex items-center justify-between hover:shadow-md transition"
            >
              <div>
                <p className="font-medium text-gray-800">
                  #{os.id} - {os.cliente}
                </p>
                <p className="text-sm text-gray-600">
                  {os.aparelho} | Entrada: {os.entrada} | Prazo: {os.prazo}
                </p>
                <p className="text-sm font-semibold text-blue-600 mt-1">Valor: R$ 250,00</p>
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                  {os.status}
                </span>
              </div>

              <button
                onClick={() => iniciarOrdem(os.id)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
              >
                <FiPlayCircle size={18} /> Iniciar
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}