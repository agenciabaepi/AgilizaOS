import { cookies } from 'next/headers';

/**
 * Layout para route group (auth) do admin-saas
 * Este layout EVITA que o layout principal do admin-saas seja aplicado
 * Páginas dentro deste route group (como login) não precisam de autenticação
 * 
 * IMPORTANTE: Este layout sobrescreve completamente o layout pai (admin-saas/layout.tsx)
 * para rotas dentro do route group (auth), permitindo que a página de login funcione
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Este layout é para páginas públicas do admin (login)
  // Retorna apenas os children sem aplicar o layout do admin
  return <>{children}</>;
}

