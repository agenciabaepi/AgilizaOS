'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiCreditCard, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { isAllowedWhenSubscriptionExpired } from '@/config/allowedPathsWhenSubscriptionExpired';
import { isPublicPath } from '@/config/publicPaths';

/** Rotas do admin - não aplicamos bloqueio de assinatura */
function isAdminRoute(pathname: string | null): boolean {
  return pathname?.startsWith('/admin-login') === true || pathname?.startsWith('/admin-saas') === true;
}

/**
 * Quando a assinatura está vencida, bloqueia o acesso às páginas e exibe
 * tela com aviso e botão para ir à página de assinatura/renovação.
 * O usuário continua logado; só não acessa o conteúdo até renovar.
 */
export default function SubscriptionVencidaGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, usuarioData, empresaData } = useAuth();
  const { loading, isAssinaturaVencida } = useSubscription();

  if (isAdminRoute(pathname) || isPublicPath(pathname || '')) {
    return <>{children}</>;
  }

  if (!user || !usuarioData?.empresa_id || !empresaData) {
    return <>{children}</>;
  }

  if (loading) {
    return <>{children}</>;
  }

  if (!isAssinaturaVencida()) {
    return <>{children}</>;
  }

  if (isAllowedWhenSubscriptionExpired(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="/assets/imagens/logopreto.png"
            alt="Gestão Consert"
            width={180}
            height={180}
            className="dark:hidden"
          />
          <Image
            src="/assets/imagens/logobranco.png"
            alt="Gestão Consert"
            width={180}
            height={180}
            className="hidden dark:block"
          />
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Assinatura vencida
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Sua assinatura expirou. Renove agora para continuar utilizando todos os recursos do sistema.
          </p>

          <Link
            href="/assinatura"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <FiCreditCard className="w-5 h-5" />
            Ir para Assinatura
          </Link>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Na página de assinatura você pode renovar ou pagar cobranças pendentes. Após o pagamento, o acesso é liberado automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
