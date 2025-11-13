
import MenuLayout from '@/components/MenuLayout';
import Link from 'next/link';
import { FiDollarSign, FiFileText, FiTrendingUp, FiUsers } from 'react-icons/fi';

export default function FinanceiroPage() {
  const menuItems = [
    {
      title: 'Lucro & Desempenho',
      description: 'Análise de lucratividade por OS',
      icon: FiTrendingUp,
      href: '/financeiro/lucro-desempenho',
      color: 'bg-orange-500'
    },
    {
      title: 'Vendas',
      description: 'Gestão de vendas e receitas',
      icon: FiDollarSign,
      href: '/financeiro/vendas',
      color: 'bg-green-500'
    },
    {
      title: 'Contas a Pagar',
      description: 'Gestão de despesas e contas',
      icon: FiFileText,
      href: '/financeiro/contas-a-pagar',
      color: 'bg-red-500'
    },
    {
      title: 'Movimentações',
      description: 'Histórico de movimentações',
      icon: FiTrendingUp,
      href: '/financeiro/movimentacoes-caixa',
      color: 'bg-purple-500'
    },
    {
      title: 'Comissões dos Técnicos',
      description: 'Resumo de comissões de todos os técnicos',
      icon: FiUsers,
      href: '/financeiro/comissoes-tecnicos',
      color: 'bg-blue-500'
    }
  ];

  return (
    <MenuLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Financeiro</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {menuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <Link key={index} href={item.href}>
                <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6">
                  <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-lg ${item.color} text-white`}>
                      <IconComponent size={24} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </MenuLayout>
  );
} 