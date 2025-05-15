'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FiEye, FiEdit, FiPrinter } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, loading } = auth || {};

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'OS Criadas',
        data: [12, 15, 18, 16, 20, 24],
        borderColor: '#1860fa',
        backgroundColor: 'rgba(24, 96, 250, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  if (loading) return null;

  return (
    <div className="w-full px-6 py-4">
      <h1 className="text-2xl font-bold mb-2">Bem-vindo ao AgilizaOS</h1>
      <p className="text-sm text-gray-600 mb-6">Usuário: {user?.email}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1860fa] text-white p-4 rounded-xl shadow">
          <p className="text-sm">OS em aberto</p>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">OS concluídas</p>
          <p className="text-2xl font-bold">28</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">Total do mês</p>
          <p className="text-2xl font-bold">R$ 4.890,00</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">Técnicos ativos</p>
          <p className="text-2xl font-bold">5</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">📱 Aparelhos por Técnico</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border hover:shadow">
            <h3 className="font-semibold text-gray-800">Carlos</h3>
            <p className="text-sm text-gray-600">3 aparelhos em andamento</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border hover:shadow">
            <h3 className="font-semibold text-gray-800">Fernanda</h3>
            <p className="text-sm text-gray-600">5 aparelhos em andamento</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border hover:shadow">
            <h3 className="font-semibold text-gray-800">Eduardo</h3>
            <p className="text-sm text-gray-600">2 aparelhos em andamento</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Últimas 5 Ordens de Serviço</h2>
          <button className="bg-[#1860fa] text-white px-4 py-2 rounded-lg text-sm">Nova OS</button>
        </div>

        <div className="grid grid-cols-11 items-center gap-4 text-sm font-semibold text-gray-500 px-4 mb-2">
          <div>Cliente</div>
          <div>Aparelho</div>
          <div>Serviço</div>
          <div>Status</div>
          <div>Entrada</div>
          <div>Entrega</div>
          <div>Peça</div>
          <div>Serviço</div>
          <div>Total</div>
          <div>Técnico</div>
          <div className="text-right">Ações</div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-11 items-center gap-4 bg-green-50 p-4 rounded-xl">
            <div>João Silva</div>
            <div>iPhone 11</div>
            <div>Troca de Tela</div>
            <div className="text-green-700">Concluída</div>
            <div>10/05/2025</div>
            <div>12/05/2025</div>
            <div>R$ 200,00</div>
            <div>R$ 150,00</div>
            <div>R$ 350,00</div>
            <div>Carlos</div>
            <div className="flex justify-end gap-2 text-xs">
              <button className="text-blue-600 hover:text-blue-800">
                <FiEye size={16} />
              </button>
              <button className="text-yellow-600 hover:text-yellow-800">
                <FiEdit size={16} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <FiPrinter size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-11 items-center gap-4 bg-yellow-50 p-4 rounded-xl">
            <div>Maria Souza</div>
            <div>Samsung A32</div>
            <div>Formatação</div>
            <div className="text-yellow-700">Aguardando aprovação</div>
            <div>13/05/2025</div>
            <div>15/05/2025</div>
            <div>R$ 0,00</div>
            <div>R$ 80,00</div>
            <div>R$ 80,00</div>
            <div>Fernanda</div>
            <div className="flex justify-end gap-2 text-xs">
              <button className="text-blue-600 hover:text-blue-800">
                <FiEye size={16} />
              </button>
              <button className="text-yellow-600 hover:text-yellow-800">
                <FiEdit size={16} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <FiPrinter size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-11 items-center gap-4 bg-blue-50 p-4 rounded-xl">
            <div>Lucas Souza</div>
            <div>Iphone 13 Pro Max</div>
            <div>Formatação</div>
            <div className="text-blue-700">Orçamento</div>
            <div>13/05/2025</div>
            <div>15/05/2025</div>
            <div>R$ 0,00</div>
            <div>R$ 0,00</div>
            <div>R$ 0,00</div>
            <div>Fernanda</div>
            <div className="flex justify-end gap-2 text-xs">
              <button className="text-blue-600 hover:text-blue-800">
                <FiEye size={16} />
              </button>
              <button className="text-yellow-600 hover:text-yellow-800">
                <FiEdit size={16} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <FiPrinter size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-base font-semibold mb-2">OS por Mês</h2>
          <Line options={options} data={data} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-base font-semibold mb-2">Entradas Financeiras</h2>
          <Line
            options={options}
            data={{
              ...data,
              datasets: [
                {
                  ...data.datasets[0],
                  label: 'R$',
                  data: [2000, 2500, 1800, 2200, 2600, 3000],
                },
              ],
            }}
          />
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-base font-semibold mb-2">Comissões Técnicas</h2>
          <Line
            options={options}
            data={{
              ...data,
              datasets: [
                {
                  ...data.datasets[0],
                  label: '% Comissão',
                  data: [400, 480, 500, 600, 720, 800],
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}