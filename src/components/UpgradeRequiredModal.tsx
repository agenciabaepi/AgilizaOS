'use client';

import { useRouter } from 'next/navigation';
import { FiX, FiLock, FiArrowRight } from 'react-icons/fi';
import { useSubscription } from '@/hooks/useSubscription';
import { getPremiumModuleInfo } from '@/lib/billing/planResources';
import { PLANO_COMPLETO_NOME } from '@/config/planModules';

interface UpgradeRequiredModalProps {
  resource: string;
  onClose?: () => void;
}

export default function UpgradeRequiredModal({ resource, onClose }: UpgradeRequiredModalProps) {
  const router = useRouter();
  const { assinatura } = useSubscription();

  const info = getPremiumModuleInfo(resource);
  const resourceName = info?.label ?? 'Recurso Premium';
  const resourceDescription =
    info?.description ?? 'Este recurso está disponível apenas no Plano Completo.';

  const handleUpgrade = () => {
    router.push('/assinatura#planos-assinatura');
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
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
        >
          <FiX size={24} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <FiLock className="text-yellow-600" size={32} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Recurso do Plano Completo</h2>

        <p className="text-gray-600 text-center mb-6">
          <span className="font-semibold text-gray-900">{resourceName}</span> não está incluído no seu plano
          atual.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{resourceName}</h3>
          <p className="text-sm text-gray-600 mb-3">{resourceDescription}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Disponível no plano:</span>
            <span className="font-semibold text-gray-900">{PLANO_COMPLETO_NOME}</span>
          </div>
        </div>

        {assinatura && (
          <div className="bg-blue-50 rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Plano atual:</span>
              <span className="font-semibold text-blue-900">{assinatura.plano.nome}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Fazer upgrade para {PLANO_COMPLETO_NOME}
            <FiArrowRight size={20} />
          </button>
          <button
            type="button"
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
