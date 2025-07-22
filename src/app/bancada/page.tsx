'use client';

import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';
import { useRouter } from 'next/navigation';
import { FiCpu, FiPlayCircle } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function BancadaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ordens, setOrdens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  useEffect(() => {
    const fetchOrdens = async () => {
      if (!user) return;
      setLoading(true);
      console.log('user.id:', user.id);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:cliente_id(nome)
        `)
        .eq('tecnico_id', user.id);
      console.log('ordens_servico data:', data, 'error:', error);
      if (!error && data) {
        setOrdens(data);
      }
      setLoading(false);
    };
    if (user && !authLoading) fetchOrdens();
  }, [user, authLoading]);

  const iniciarOrdem = (id: string) => {
    router.push(`/bancada/${id}`);
  };

  if (loading || authLoading) {
    return (
      <ProtectedArea area="bancada">
        <MenuLayout>
          <div className="p-6 flex justify-center items-center min-h-[300px]">
            <span className="text-gray-500">Carregando ordens...</span>
          </div>
        </MenuLayout>
      </ProtectedArea>
    );
  }

  return (
    <ProtectedArea area="bancada">
      <MenuLayout>
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
            {ordens
              .filter((os) =>
                (os.cliente?.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase())
              )
              .filter((os) => {
                if (filtroStatus === 'Todos') return true;
                return os.status === filtroStatus;
              })
              .map((os) => {
                const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
                const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
                const valor = ((os.valor_servico || 0) + (os.valor_peca || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                return (
                  <div
                    key={os.id}
                    className="bg-white p-6 rounded-xl shadow flex items-center justify-between hover:shadow-md transition"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        #{os.numero_os || os.id} - {os.cliente?.nome || 'Sem nome'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {aparelho} | Entrada: {entrada}
                      </p>
                      <p className="text-sm font-semibold text-blue-600 mt-1">Valor: {valor}</p>
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
                );
              })}
          </div>
        </div>
      </MenuLayout>
    </ProtectedArea>
  );
}