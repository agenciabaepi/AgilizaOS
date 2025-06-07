'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
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
      <div className="fixed top-0 left-0 w-full z-60 h-10 bg-[#1e3bef] text-white flex items-center justify-end px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-md">
            <FiSearch className="text-white" size={16} />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-transparent placeholder-white/80 text-white text-sm focus:outline-none"
            />
          </div>
          <FiBell className="text-white hover:text-gray-200 cursor-pointer" size={18} />
          <FiCheckCircle className="text-green-400" size={16} />
          <span className="text-white/80 text-sm">Licença ativa</span>
          <button className="text-white/80 text-sm hover:text-white flex items-center gap-1">
            <FiHelpCircle size={16} />
            Suporte
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className="bg-white shadow-md pt-16 px-2 flex flex-col h-screen fixed top-0 left-0 z-50 w-64"
      >
        <div className="flex items-center justify-center mb-6">
          <Image src={logo} alt="Logo Agiliza" className="h-10 object-contain" />
        </div>
        <nav className="space-y-2">
          {isTecnico ? (
            <>
              <SidebarButton path="/dashboard/bancada" icon={<FiTool size={20} />} label="Bancada" />
            </>
          ) : (
            <>
              <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" />
              <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" />
              <SidebarButton path="/clientes" icon={<FiUsers size={20} />} label="Clientes" />
              <SidebarButton path="/tecnicos" icon={<FiUserCheck size={20} />} label="Técnicos" />
              <SidebarButton path="/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" />
              <SidebarButton path="/financeiro" icon={<FiDollarSign size={20} />} label="Financeiro" />
              <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" />
              <SidebarButton path="/termos" icon={<FiFileText size={20} />} label="Termos" />
              <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" />
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
            <span className="ml-2 whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 scale-100">Sair</span>
          </button>
        </nav>
        <div className="mt-auto text-center text-xs text-gray-400 pb-4">
          v1.0.0
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="transition-all duration-300 bg-gray-50 p-6 pl-64 z-0 relative overflow-x-auto w-full mt-16">
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

  return (
    <button
      onClick={() => router.push(path)}
      className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${
        pathname === path ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'
      }`}
    >
      <div className="min-w-[20px]">{icon}</div>
      <span
        className="ml-2 whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 scale-100"
      >
        {label}
      </span>
    </button>
  );
}