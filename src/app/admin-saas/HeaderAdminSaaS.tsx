'use client'

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/Button';

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
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          {crumbs.length > 0 ? (
            <>
              <Link href="/admin-saas" className="text-gray-500 hover:text-gray-900 transition-colors">
                Admin SaaS
              </Link>
              {crumbs.map((c, i) => {
                const href = '/' + parts.slice(0, idxAdmin + 1 + i + 1).join('/');
                const isLast = i === crumbs.length - 1;
                const label = c.replace(/-/g, ' ');
                return (
                  <span key={href} className="flex items-center gap-2">
                    <span className="text-gray-300">/</span>
                    {isLast ? (
                      <span className="text-gray-900 font-medium capitalize">{label}</span>
                    ) : (
                      <Link href={href} className="text-gray-600 hover:text-gray-900 capitalize transition-colors">
                        {label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </>
          ) : (
            <span className="text-gray-900 font-medium">Visão Geral</span>
          )}
        </div>
        <Button
          onClick={handleLogout}
          disabled={loggingOut}
          variant="outline"
          size="sm"
          className="text-gray-700 hover:text-gray-900 border-gray-300 hover:border-gray-400 transition-colors"
        >
          {loggingOut ? 'Saindo...' : 'Sair'}
        </Button>
      </div>
    </div>
  );
}


