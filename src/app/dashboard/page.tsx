'use client';
export const dynamic = 'force-dynamic';

import MenuLayout from '@/components/MenuLayout';
import ProtectedArea from '@/components/ProtectedArea';

export default function DashboardPage() {
  return (
    <MenuLayout>
      <ProtectedArea area="dashboard">
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-green-600">42</span>
              <span className="text-gray-600 mt-2">Ordens de Serviço</span>
            </div>
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-blue-600">15</span>
              <span className="text-gray-600 mt-2">Clientes</span>
            </div> 
            <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center">
              <span className="text-3xl font-bold text-yellow-600">R$ 12.300</span>
              <span className="text-gray-600 mt-2">Faturamento</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Novidades do Sistema</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Nova página de lembretes com Kanban!</li>
              <li>Controle de permissões aprimorado.</li>
              <li>Correções de segurança e melhorias de UX.</li>
            </ul>
          </div>
        </div>
      </ProtectedArea>
    </MenuLayout>
  );
}