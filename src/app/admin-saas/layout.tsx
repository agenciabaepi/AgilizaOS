export const dynamic = 'force-dynamic';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import NavAdminSaaS from './NavAdminSaaS';
import HeaderAdminSaaS from './HeaderAdminSaaS';

/**
 * ⚠️ SEGURANÇA CRÍTICA: Layout do Admin SaaS
 * 
 * Verifica obrigatoriamente o cookie de acesso antes de renderizar qualquer página
 * Sem o cookie, redireciona automaticamente para login
 * 
 * OBSERVAÇÃO: A página de login foi movida para /admin-login (fora deste diretório)
 * para evitar conflitos de layout. Este layout só se aplica a rotas dentro de /admin-saas
 */
export default async function AdminSaaSLayout({ children }: { children: React.ReactNode }) {
  // ⚠️ IMPORTANTE: O middleware já protege as rotas e permite /admin-login
  // O layout só verifica autenticação para as páginas protegidas dentro de /admin-saas
  
  const cookieStore = await cookies();
  const gateCookie = cookieStore.get('admin_saas_access')?.value === '1';
  
  // ✅ BLOQUEAR ACESSO: Sem cookie, redirecionar para login
  // Esta verificação é OBRIGATÓRIA para TODAS as páginas do admin
  // O middleware também bloqueia no nível de rota, mas esta é uma camada adicional
  if (!gateCookie) {
    redirect('/admin-login');
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="grid grid-cols-[260px,1fr] gap-0 min-h-screen">
        <aside className="border-r border-gray-200 bg-white shadow-sm">
          <NavAdminSaaS />
        </aside>
        <main className="flex flex-col min-h-screen overflow-auto">
          <HeaderAdminSaaS />
          <div className="flex-1 p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


