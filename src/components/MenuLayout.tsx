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
  const router = useRouter();
  const pathname = usePathname();

  const [isReady, setIsReady] = useState(false);
  const [menuExpandido, setMenuExpandido] = useState(true);

  useEffect(() => {
    if (auth?.user === undefined) return;
    if (!auth?.user) {
      router.push('/login');
    } else {
      setIsReady(true);
    }
  }, [auth?.user]);

  const isTecnico = auth?.user?.nivel === 'tecnico';

if (!isReady) {
  return null;
}

  return (
    <div className="flex min-h-screen bg-transparent relative z-0 overflow-x-hidden w-full">
      {/* Topbar */}
      <div className="fixed top-0 left-0 w-full z-60 h-14 bg-white text-[#000000] flex items-center justify-between px-4 border-b border-[#000000]/10">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenuExpandido(!menuExpandido)} className="text-[#000000]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <Image src={logo} alt="Logo Agiliza" className="h-6 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <FiSearch className="text-[#000000]" size={16} />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent border-b border-black/10 placeholder-[#000000]/50 text-[#000000] text-sm focus:outline-none"
          />
          <FiBell className="text-[#000000] hover:text-[#000000]/80 cursor-pointer" size={18} />
        </div>
      </div>

      {/* Sidebar e Conteúdo principal em wrapper responsivo */}
      <div className="flex w-full">
        <aside
          className={`flex bg-white border-r border-[#000000]/10 pt-16 px-2 flex-col h-screen fixed top-0 left-0 z-50 transition-all duration-300 ${
            menuExpandido ? 'w-64' : 'w-0 md:w-16'
          } ${menuExpandido ? 'opacity-100' : 'opacity-0 md:opacity-100'} ${menuExpandido ? 'visible' : 'invisible md:visible'}`}
        >
          <div className="mb-6 h-10" />
          <nav className="space-y-2">
            {isTecnico ? (
              <>
                <SidebarButton path="/dashboard/bancada" icon={<FiTool size={20} />} label="Bancada" menuExpandido={menuExpandido} />
              </>
            ) : (
              <>
                <SidebarButton path="/dashboard/admin" icon={<FiHome size={20} />} label="Dashboard" menuExpandido={menuExpandido} />
                <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" menuExpandido={menuExpandido} />
                <SidebarButton path="/clientes" icon={<FiUsers size={20} />} label="Clientes" menuExpandido={menuExpandido} />
                <SidebarButton path="/tecnicos" icon={<FiUserCheck size={20} />} label="Técnicos" menuExpandido={menuExpandido} />
                <SidebarButton path="/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" menuExpandido={menuExpandido} />
                <SidebarButton path="/financeiro" icon={<FiDollarSign size={20} />} label="Financeiro" menuExpandido={menuExpandido} />
                <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" menuExpandido={menuExpandido} />
                <SidebarButton path="/termos" icon={<FiFileText size={20} />} label="Termos" menuExpandido={menuExpandido} />
                <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" menuExpandido={menuExpandido} />
              </>
            )}
            <button
              onClick={() => {
                auth?.signOut();
                router.push('/login');
              }}
              className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${
                menuExpandido ? 'text-[#cffb6d] hover:text-white' : 'justify-center text-[#cffb6d]'
              }`}
            >
              <div className="min-w-[20px]">
                <FiLogOut size={20} />
              </div>
              <span
                className={`ml-2 transition-all duration-300 ease-in-out whitespace-nowrap ${
                  menuExpandido ? 'opacity-100 scale-100 max-w-[200px]' : 'opacity-0 scale-95 max-w-0 overflow-hidden'
                }`}
              >
                Sair
              </span>
            </button>
          </nav>
          <div className="mt-auto text-center text-xs text-[#cffb6d] pb-4">
            v1.0.0
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className={`transition-all duration-300 bg-white text-[#000000] p-6 ${menuExpandido ? 'md:ml-64' : 'md:ml-16'} ml-0 z-0 relative overflow-x-auto w-full mt-16`}>
          {children}
        </main>
      </div>

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

function SidebarButton({ path, icon, label, menuExpandido }: { path: string; icon: React.ReactNode; label: string; menuExpandido: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === path || pathname.startsWith(path + '/') || path === '/ordens' && pathname.startsWith('/nova-os');

  return (
    <button
      onClick={() => router.push(path)}
      className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${
        isActive ? 'bg-[#cffb6d] text-[#000000]' : 'hover:bg-[#cffb6d]/20 text-[#000000] hover:text-[#000000]'
      }`}
    >
      <div className="min-w-[20px]">{icon}</div>
      <span
        className={`transition-all duration-300 ease-in-out whitespace-nowrap ml-2 ${
          menuExpandido ? 'opacity-100 scale-100 max-w-[200px]' : 'opacity-0 scale-95 max-w-0 overflow-hidden'
        }`}
      >
        {label}
      </span>
    </button>
  );
}