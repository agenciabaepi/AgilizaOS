'use client'

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { FiLogOut, FiChevronRight } from 'react-icons/fi';

export default function HeaderAdminSaaS() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const parts = (pathname || '').split('/').filter(Boolean);
  const idxAdmin = parts.indexOf('admin-saas');
  const crumbs = parts.slice(idxAdmin + 1);

  async function handleLogout() {
    if (loggingOut) return;
    
    setLoggingOut(true);
    try {
      const res = await fetch('/api/admin-saas/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await res.json();

      if (json.ok) {
        router.push('/admin-login');
      } else {
        console.error('Erro ao fazer logout:', json.error);
        // Mesmo assim redirecionar
        router.push('/admin-login');
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo assim redirecionar
      router.push('/admin-login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          {crumbs.length > 0 ? (
            <>
              <Link 
                href="/admin-saas" 
                className="text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm whitespace-nowrap"
              >
                Admin SaaS
              </Link>
              {crumbs.map((c, i) => {
                const href = '/' + parts.slice(0, idxAdmin + 1 + i + 1).join('/');
                const isLast = i === crumbs.length - 1;
                const label = c.replace(/-/g, ' ');
                return (
                  <span key={href} className="flex items-center gap-1.5 flex-shrink-0">
                    <FiChevronRight className="text-gray-400 text-xs flex-shrink-0" />
                    {isLast ? (
                      <span className="text-gray-900 font-semibold capitalize truncate">{label}</span>
                    ) : (
                      <Link 
                        href={href} 
                        className="text-gray-600 hover:text-gray-900 capitalize transition-colors font-medium text-sm whitespace-nowrap"
                      >
                        {label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </>
          ) : (
            <span className="text-gray-900 font-semibold text-base">Visão Geral</span>
          )}
        </div>
        
        {/* Botão de Logout */}
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-gray-700 hover:text-white hover:bg-gray-900 border-gray-300 hover:border-gray-900 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex-shrink-0"
        >
          <FiLogOut className={`text-sm ${loggingOut ? 'animate-spin' : ''}`} />
          <span className="whitespace-nowrap">{loggingOut ? 'Saindo...' : 'Sair'}</span>
        </Button>
      </div>
    </div>
  );
}


