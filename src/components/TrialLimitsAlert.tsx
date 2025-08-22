'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { FiAlertTriangle, FiUsers, FiBox, FiTool, FiFileText, FiTruck } from 'react-icons/fi';

interface TrialLimitsAlertProps {
  showOnlyIfNearLimit?: boolean; // Se true, só mostra quando está próximo do limite
}

export default function TrialLimitsAlert({ showOnlyIfNearLimit = false }: TrialLimitsAlertProps) {
  console.log('🔍 TrialLimitsAlert: Renderizando componente');
  
  const { assinatura, limites, isTrialExpired } = useSubscription();
  
  console.log('🔍 TrialLimitsAlert: Estado atual:', {
    assinatura: assinatura ? 'PRESENTE' : 'AUSENTE',
    limites: limites ? 'PRESENTE' : 'AUSENTE',
    assinaturaStatus: assinatura?.status
  });

  // Se não está no trial ou já expirou, não mostra
  if (!assinatura || assinatura.status !== 'trial' || isTrialExpired()) {
    console.log('🔍 TrialLimitsAlert: Não mostrando - não é trial ou expirou');
    return null;
  }

  if (!limites) {
    console.log('🔍 TrialLimitsAlert: Não mostrando - sem limites');
    return null;
  }

  console.log('🔍 TrialLimitsAlert: Mostrando alerta de limites');

  const limitesConfig = [
    {
      key: 'usuarios' as const,
      label: 'Usuários',
      icon: <FiUsers size={16} />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      key: 'produtos' as const,
      label: 'Produtos',
      icon: <FiBox size={16} />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      key: 'servicos' as const,
      label: 'Serviços',
      icon: <FiTool size={16} />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    },
    {
      key: 'clientes' as const,
      label: 'Clientes',
      icon: <FiUsers size={16} />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      key: 'ordens' as const,
      label: 'Ordens de Serviço',
      icon: <FiFileText size={16} />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    },
    {
      key: 'fornecedores' as const,
      label: 'Fornecedores',
      icon: <FiTruck size={16} />,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20'
    }
  ];

  const limitesFiltrados = limitesConfig.filter(config => {
    const limite = limites[config.key];
    const percentual = (limite.atual / limite.limite) * 100;
    
    if (showOnlyIfNearLimit) {
      // Mostra apenas se está próximo do limite (80% ou mais)
      return percentual >= 80;
    }
    
    return true;
  });

  if (limitesFiltrados.length === 0) {
    console.log('🔍 TrialLimitsAlert: Nenhum limite para mostrar');
    return null;
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-700 text-sm">Limites do teste grátis</span>
        <button 
          onClick={() => window.location.href = '/planos'}
          className="text-blue-600 text-xs hover:underline"
        >
          Ver planos
        </button>
      </div>
      
      {/* Limites simples */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
        {limitesFiltrados.map((config) => {
          const limite = limites[config.key];
          const percentual = (limite.atual / limite.limite) * 100;
          const isNearLimit = percentual >= 80;
          const isAtLimit = percentual >= 100;

          return (
                         <div
               key={config.key}
               className={`text-center p-2 rounded border ${
                 isAtLimit 
                   ? 'border-red-200 bg-red-50' 
                   : 'border-gray-200 bg-white'
               }`}
             >
               <div className={`text-xs font-medium ${
                 isAtLimit ? 'text-red-600' : 'text-gray-700'
               }`}>
                 {config.label}
               </div>
               <div className="text-xs text-gray-600 mt-1">
                 {limite.atual}/{limite.limite}
               </div>
             </div>
          );
        })}
      </div>
    </div>
  );
} 