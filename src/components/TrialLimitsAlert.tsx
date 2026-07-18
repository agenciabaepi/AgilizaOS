'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { FiUsers, FiBox, FiFileText } from 'react-icons/fi';
import { PLANO_SLUGS } from '@/config/planModules';

interface TrialLimitsAlertProps {
  showOnlyIfNearLimit?: boolean;
}

/** Alerta de limites do plano (B?sico e trial). */
export default function TrialLimitsAlert({ showOnlyIfNearLimit = false }: TrialLimitsAlertProps) {
  const { assinatura, limites, planoSlug, isTrialExpired } = useSubscription();

  if (!assinatura || !limites) return null;

  const isTrial = assinatura.status === 'trial' && !isTrialExpired();
  const isBasico = planoSlug === PLANO_SLUGS.BASICO;
  if (!isTrial && !isBasico) return null;

  const limitesConfig = [
    {
      key: 'usuarios' as const,
      label: 'Usu?rios',
      icon: <FiUsers size={16} />,
    },
    {
      key: 'produtos' as const,
      label: 'Produtos/servi?os',
      icon: <FiBox size={16} />,
    },
    {
      key: 'ordens' as const,
      label: 'OS no m?s',
      icon: <FiFileText size={16} />,
    },
  ];

  const limitesFiltrados = limitesConfig.filter((config) => {
    const limite = limites[config.key];
    if (!limite?.limite) return false;
    const percentual = (limite.atual / limite.limite) * 100;
    if (showOnlyIfNearLimit) return percentual >= 80;
    return true;
  });

  if (limitesFiltrados.length === 0) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 dark:bg-zinc-800 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-gray-700 dark:text-gray-200 text-sm">
          Limites do plano {isBasico ? 'B?sico' : 'de teste'}
        </span>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/assinatura#planos-assinatura';
          }}
          className="text-blue-600 text-xs hover:underline"
        >
          Ver planos
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        {limitesFiltrados.map((config) => {
          const limite = limites[config.key];
          const percentual = (limite.atual / limite.limite) * 100;
          const isAtLimit = percentual >= 100;

          return (
            <div
              key={config.key}
              className={`text-center p-2 rounded border ${
                isAtLimit
                  ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
                  : 'border-gray-200 bg-white dark:border-zinc-600 dark:bg-zinc-900'
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  isAtLimit ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {config.label}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {limite.atual}/{limite.limite}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
