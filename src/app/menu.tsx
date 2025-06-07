'use client';
import Image from 'next/image';
import logo from '@/assets/imagens/logoagiliza.png';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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


export default function DashboardPage({ children }: { children: React.ReactNode }) {
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
      <div className="fixed top-0 left-0 w-full z-60 h-16 bg-white text-black flex items-center justify-between px-6">
        {/* Esquerda: Logo */}
        <div className="flex items-center mr-260">
          <Image src={logo} alt="Logo Agiliza" className="h-20 object-contain" />
        </div>

        {/* Direita: Busca + Notificação + Licença + Suporte */}
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
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`transition-[width] duration-300 ease-out bg-white shadow-md py-6 px-2 flex flex-col h-screen fixed top-0 left-0 z-50 ${
          expanded ? 'w-64' : 'w-14'
        }`}
      >
        <div className="h-[48px] mb-6" />

        <nav className="space-y-2">
          {isTecnico ? (
            <>
              <button
                onClick={() => router.push('/dashboard/bancada')}
                className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${
                  pathname === '/dashboard/bancada'
                    ? 'bg-[#1e3bef] text-white font-semibold'
                    : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'
                }`}
              >
                <div className="min-w-[20px]">
                  <FiTool size={20} />
                </div>
                <span
                  className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${
                    expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  }`}
                >
                  Bancada
                </span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.push('/dashboard')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiHome size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Dashboard
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/ordens')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/ordens' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiFileText size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Ordens de Serviço
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/clientes')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/clientes' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiUsers size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Clientes
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/tecnicos')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/tecnicos' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiUserCheck size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Técnicos
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/equipamentos')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/equipamentos' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiBox size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Produtos/Serviços
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/financeiro')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/financeiro' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiDollarSign size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Financeiro
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/bancada')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/bancada' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiTool size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Bancada
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/termos')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/termos' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiFileText size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Termos
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/configuracoes')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/configuracoes' ? 'bg-[#1e3bef] text-white font-semibold' : 'hover:bg-[#1e3bef]/10 hover:text-[#1e3bef]'}`}>
                <div className="min-w-[20px]">
                  <FiTool size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Configurações
                </span>
              </button>
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