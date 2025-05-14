'use client';
import Image from 'next/image';
import logo from '@/assets/imagens/logoagiliza.png';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  FiHome,
  FiFilePlus,
  FiUsers,
  FiBox,
  FiTool,
  FiDollarSign,
  FiFileText,
  FiLogOut,
} from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

import { useState } from 'react';

export default function DashboardPage({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [expanded, setExpanded] = useState(false);
  const { user, loading } = auth || {};
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  if (loading) return <p>Carregando...</p>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen relative z-0 overflow-x-hidden w-full">
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`transition-[width] duration-300 ease-in-out bg-white shadow-md py-6 px-2 flex flex-col h-screen fixed top-0 left-0 z-50 ${
          expanded ? 'w-64' : 'w-14'
        }`}
      >
        <div className="flex items-center gap-3 px-3 mb-6">
          <Image src={logo} alt="Logo AgilizaOS" width={100} height={40} className="mx-auto" />
        </div>

        <nav className="space-y-2">
          {[
            { icon: FiHome, label: 'Dashboard', href: '/dashboard' },
            { icon: FiFilePlus, label: 'Nova OS', href: '/dashboard/nova-os' },
            { icon: FiUsers, label: 'Clientes', href: '/dashboard/clientes' },
            { icon: FiBox, label: 'Produtos/Serviços', href: '/dashboard/produtos' },
            { icon: FiTool, label: 'Técnicos', href: '/dashboard/tecnicos' },
            { icon: FiDollarSign, label: 'Financeiro', href: '/dashboard/financeiro' },
            { icon: FiFileText, label: 'Termos', href: '/dashboard/termos' },
          ].map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href;
            return (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${
                  isActive ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'
                }`}
              >
                <div className={`min-w-[20px] ${isActive ? 'text-white' : 'text-[#1860fa] group-hover:text-inherit'}`}>
                  <Icon size={20} />
                </div>
                <span
                  className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${
                    expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              auth?.signOut();
              router.push('/login');
            }}
            className="group flex items-center w-full text-left px-3 py-2 text-red-600 hover:text-red-800 mt-4"
          >
            <div className="min-w-[20px]">
              <FiLogOut size={20} />
            </div>
            <span
              className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${
                expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`}
            >
              Sair
            </span>
          </button>
        </nav>
      </aside>
      <main className={`transition-all duration-300 ${expanded ? 'ml-64' : 'ml-14'} bg-gray-50 p-6 z-0 relative overflow-x-auto w-full`}>
        {children}
      </main>
    </div>
  );
}
