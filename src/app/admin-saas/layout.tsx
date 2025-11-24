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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar fixo */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 shadow-sm z-30">
        <NavAdminSaaS />
      </aside>
      
      {/* Conteúdo principal com margin para compensar sidebar */}
      <main className="ml-64 flex flex-col min-h-screen bg-gray-50">
        <HeaderAdminSaaS />
        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}


