'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import logo from '@/assets/imagens/logoagiliza.png';
import {
  FiHome,
  FiUsers,
  FiBox,
  FiTool,
  FiDollarSign,
  FiFileText,
  FiLogOut,
  FiCheckCircle,
  FiHelpCircle,
  FiUserCheck,
  FiSearch,
  FiBell,
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth?.user) {
      router.push('/login');
    }
  }, [auth?.user]);

  const isTecnico = auth?.user?.nivel === 'tecnico';

  return (
    <div className="flex min-h-screen relative z-0 overflow-x-hidden w-full">
      {/* Topbar */}
      <div className="fixed top-0 left-0 w-full z-60 h-16 bg-white text-black flex items-center justify-between px-6">
        <div className="flex items-center mr-260">
          <Image src={logo} alt="Logo Agiliza" className="h-20 object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-40">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1860fa]"
            />
            <FiSearch className="absolute left-3 top-2.5 text-black" size={18} />
          </div>
          <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 cursor-pointer hover:bg-gray-200">
            <FiBell className="text-black" size={18} />
          </div>
          <div className="flex items-center gap-2 text-sm text-green-400 font-medium whitespace-nowrap">
            <FiCheckCircle size={16} />
            Licença ativa
          </div>
          <button className="flex items-center gap-2 text-sm text-black hover:text-[#1860fa]">
            <FiHelpCircle size={16} />
            Suporte
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`transition-[width] duration-300 ease-out bg-white shadow-md py-6 px-2 flex flex-col h-screen fixed top-0 left-0 z-50 ${expanded ? 'w-64' : 'w-14'}`}
      >
        <div className="h-[48px] mb-6" />
        <nav className="space-y-2">
          {isTecnico ? (
            <>
              <SidebarButton path="/dashboard/bancada" icon={<FiTool size={20} />} label="Bancada" />
            </>
          ) : (
            <>
              <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" />
              <SidebarButton path="/dashboard/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" />
              <SidebarButton path="/dashboard/clientes" icon={<FiUsers size={20} />} label="Clientes" />
              <SidebarButton path="/dashboard/tecnicos" icon={<FiUserCheck size={20} />} label="Técnicos" />
              <SidebarButton path="/dashboard/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" />
              <SidebarButton path="/dashboard/financeiro" icon={<FiDollarSign size={20} />} label="Financeiro" />
              <SidebarButton path="/dashboard/bancada" icon={<FiTool size={20} />} label="Bancada" />
              <SidebarButton path="/dashboard/termos" icon={<FiFileText size={20} />} label="Termos" />
              <SidebarButton path="/dashboard/configuracoes" icon={<FiTool size={20} />} label="Configurações" />
            </>
          )}
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
            <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>Sair</span>
          </button>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main className="transition-all duration-300 bg-gray-50 p-6 pl-16 z-0 relative overflow-x-auto w-full mt-16">
        {children}
      </main>

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            fontSize: '1rem',
            padding: '16px 24px',
            borderRadius: '8px',
          },
        }}
      />
    </div>
  );
}

function SidebarButton({ path, icon, label }: { path: string; icon: React.ReactNode; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      onClick={() => router.push(path)}
      className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === path ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="min-w-[20px]">{icon}</div>
      <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>{label}</span>
    </button>
  );
}