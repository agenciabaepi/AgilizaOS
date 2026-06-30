'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiLayout } from 'react-icons/fi';
import { ADMIN_SAAS_NAV_LINKS } from '@/config/adminSaasNav';

export default function NavAdminSaaS() {
  const pathname = usePathname();

  return (
    <nav className="h-screen flex flex-col bg-white border-r border-gray-200 overflow-hidden">
      <div className="px-6 py-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-black flex items-center justify-center">
            <FiLayout className="text-white text-lg" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Admin SaaS</div>
            <div className="text-xs text-gray-500">Painel Administrativo</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6">
        <div className="space-y-1">
          {ADMIN_SAAS_NAV_LINKS.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== '/admin-saas' && pathname?.startsWith(l.href));
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`text-lg flex-shrink-0 ${active ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="flex-1 truncate">{l.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-900 mb-1">Gestão Consert</div>
          <div className="text-[10px] text-gray-500">Versão Admin</div>
        </div>
      </div>
    </nav>
  );
}
