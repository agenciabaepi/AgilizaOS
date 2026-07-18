'use client';

import { useSubscription } from '@/hooks/useSubscription';

interface TrialLimitGuardProps {
  children: React.ReactNode;
  tipo: 'usuarios' | 'produtos' | 'servicos' | 'clientes' | 'ordens' | 'fornecedores';
  showAlert?: boolean;
}

const TIPO_LABEL: Record<TrialLimitGuardProps['tipo'], string> = {
  usuarios: 'usuários',
  produtos: 'produtos/serviços',
  servicos: 'produtos/serviços',
  clientes: 'clientes',
  ordens: 'ordens de serviço neste mês',
  fornecedores: 'fornecedores',
};

/**
 * Bloqueia criação quando o limite do plano (Básico/Trial/Completo) foi atingido.
 * Nome legado: TrialLimitGuard — aplica a qualquer plano com limites.
 */
export default function TrialLimitGuard({ children, tipo, showAlert = true }: TrialLimitGuardProps) {
  const { assinatura, limites, podeCriar, loading } = useSubscription();

  if (loading) {
    return <>{children}</>;
  }

  // Sem assinatura carregada: não bloqueia aqui (outros guards tratam acesso)
  if (!assinatura) {
    return <>{children}</>;
  }

  if (!limites) {
    return <>{children}</>;
  }

  if (podeCriar(tipo)) {
    return <>{children}</>;
  }

  if (!showAlert) {
    return null;
  }

  const uso = limites[tipo];
  const label = TIPO_LABEL[tipo];

  return (
    <div>
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4 text-center dark:from-zinc-800 dark:to-zinc-900 dark:border-zinc-700">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">
            Limite de {label} atingido
            {uso ? ` (${uso.atual}/${uso.limite})` : ''}
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-xs mb-3">
          Seu plano atual não permite criar mais {label}. Faça upgrade para o Plano Completo.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = '/assinatura#planos-assinatura';
          }}
          className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors"
        >
          Ver planos disponíveis
        </button>
      </div>
    </div>
  );
}
