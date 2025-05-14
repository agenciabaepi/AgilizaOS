

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

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Últimas OS</h2>
          <button className="bg-[#1860fa] text-white px-4 py-2 rounded-lg text-sm">Nova OS</button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Aparelho</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="px-4 py-2">João Silva</td>
              <td className="px-4 py-2">iPhone 11</td>
              <td className="px-4 py-2 text-green-600">Concluída</td>
              <td className="px-4 py-2">12/05/2025</td>
            </tr>
            <tr className="border-t">
              <td className="px-4 py-2">Maria Souza</td>
              <td className="px-4 py-2">Samsung A32</td>
              <td className="px-4 py-2 text-yellow-600">Em análise</td>
              <td className="px-4 py-2">11/05/2025</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Gráfico de OS por Mês</h2>
        <Line options={options} data={data} />
      </div>
    </div>
  );
}