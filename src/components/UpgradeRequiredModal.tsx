'use client';

import { useRouter } from 'next/navigation';
import { FiX, FiLock, FiArrowRight } from 'react-icons/fi';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeRequiredModalProps {
  resource: string;
  onClose?: () => void;
}

const RESOURCE_NAMES: Record<string, { name: string; description: string; plan: string }> = {
  financeiro: {
    name: 'Módulo Financeiro',
    description: 'Acesso completo ao módulo financeiro com vendas, contas a pagar, movimentações e análise de lucro',
    plan: 'Pro'
  },
  vendas: {
    name: 'Módulo de Vendas',
    description: 'Controle completo de vendas e receitas',
    plan: 'Pro'
  },
  movimentacao_caixa: {
    name: 'Movimentações de Caixa',
    description: 'Controle detalhado de movimentações financeiras',
    plan: 'Pro'
  },
  whatsapp: {
    name: 'Automações WhatsApp',
    description: 'Integração com WhatsApp e automações inteligentes',
    plan: 'Ultra'
  },
  chatgpt: {
    name: 'Integração ChatGPT',
    description: 'Automações inteligentes com inteligência artificial',
    plan: 'Ultra'
  },
  editor_foto: {
    name: 'Editor de Fotos',
    description: 'Edição de imagens diretamente no sistema',
    plan: 'Ultra'
  },
};

export default function UpgradeRequiredModal({ resource, onClose }: UpgradeRequiredModalProps) {
  const router = useRouter();
  const { assinatura } = useSubscription();
  
  const resourceInfo = RESOURCE_NAMES[resource] || {
    name: 'Recurso Premium',
    description: 'Este recurso não está disponível no seu plano atual',
    plan: 'Pro ou Ultra'
  };

  const handleUpgrade = () => {
    router.push('/planos');
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Botão fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FiX size={24} />
        </button>

        {/* Ícone */}
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <FiLock className="text-yellow-600" size={32} />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Recurso Indisponível
        </h2>

        {/* Descrição */}
        <p className="text-gray-600 text-center mb-6">
          O recurso <span className="font-semibold text-gray-900">{resourceInfo.name}</span> não está disponível no seu plano atual.
        </p>

        {/* Info do recurso */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{resourceInfo.name}</h3>
          <p className="text-sm text-gray-600 mb-3">{resourceInfo.description}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Disponível no plano:</span>
            <span className="font-semibold text-gray-900">{resourceInfo.plan}</span>
          </div>
        </div>

        {/* Plano atual */}
        {assinatura && (
          <div className="bg-blue-50 rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Plano atual:</span>
              <span className="font-semibold text-blue-900">{assinatura.plano.nome}</span>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleUpgrade}
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Ver Planos Disponíveis
            <FiArrowRight size={20} />
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

