'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiLayout, 
  FiBriefcase, 
  FiFileText, 
  FiDollarSign, 
  FiUsers, 
  FiSettings 
} from 'react-icons/fi';

const links = [
  { href: '/admin-saas', label: 'Visão geral', icon: FiLayout },
  { href: '/admin-saas/empresas', label: 'Empresas', icon: FiBriefcase },
  { href: '/admin-saas/assinaturas', label: 'Assinaturas', icon: FiFileText },
  { href: '/admin-saas/pagamentos', label: 'Pagamentos', icon: FiDollarSign },
  { href: '/admin-saas/usuarios', label: 'Usuários', icon: FiUsers },
  { href: '/admin-saas/config', label: 'Configurações', icon: FiSettings },
];

export default function NavAdminSaaS() {
  const pathname = usePathname();
  return (
    <nav className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
            <FiLayout className="text-white text-sm" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Admin SaaS</div>
            <div className="text-xs text-gray-500">Painel Administrativo</div>
          </div>
        </div>
      </div>
      
      <ul className="flex-1 p-4 space-y-1">
        {links.map(l => {
          const active = pathname === l.href;
          const Icon = l.icon;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`text-base ${active ? 'text-white' : 'text-gray-500'}`} />
                <span>{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <div className="font-medium text-gray-700 mb-0.5">AgilizaOS</div>
          <div className="text-gray-400">Sistema de Gestão</div>
        </div>
      </div>
    </nav>
  );
}


