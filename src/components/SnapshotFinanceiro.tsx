'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/Button';
import { useSnapshotFinanceiro } from '@/hooks/useSnapshotFinanceiro';
import { FiDollarSign, FiTrendingDown, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface SnapshotFinanceiroProps {
  dataInicio?: string;
  dataFim?: string;
}

export function SnapshotFinanceiro({ dataInicio, dataFim }: SnapshotFinanceiroProps) {
  const { snapshot, loading, error } = useSnapshotFinanceiro(dataInicio, dataFim);
  const router = useRouter();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleVerDetalhes = () => {
    router.push('/financeiro/dashboard');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const cards = [
    {
      title: 'Receita',
      value: formatCurrency(snapshot.receita),
      subtitle: `${snapshot.total_vendas} vendas`,
      icon: FiDollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Despesas',
      value: formatCurrency(snapshot.despesas),
      subtitle: `${snapshot.total_contas} contas`,
      icon: FiTrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      title: 'Lucro',
      value: formatCurrency(snapshot.lucro),
      subtitle: `${formatPercent(snapshot.margem_percentual)} margem`,
      icon: FiTrendingUp,
      color: snapshot.lucro >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: snapshot.lucro >= 0 ? 'bg-green-50' : 'bg-red-50',
      borderColor: snapshot.lucro >= 0 ? 'border-green-200' : 'border-red-200'
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Resumo Financeiro</h2>
        <Button 
          onClick={handleVerDetalhes}
          variant="outline"
          className="flex items-center gap-2"
        >
          Ver detalhes
          <FiArrowRight className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          
          return (
            <Card 
              key={index} 
              className={`${card.borderColor} hover:shadow-md transition-shadow`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <IconComponent className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                  <p className="text-sm text-gray-500">
                    {card.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
