'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import logobranco from '@/assets/imagens/logobranco.png';
import logopreto from '@/assets/imagens/logopreto.png';
import {
  FiHome,
  FiUsers,
  FiBox,
  FiTool,
  FiDollarSign,
  FiFileText,
  FiLogOut,
  FiUserCheck,
  FiSearch,
  FiBell,
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [menuExpandido, setMenuExpandido] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  return (
    <div className="flex min-h-screen bg-transparent relative z-0 overflow-x-hidden w-full">
      {/* Topbar */}
      <div className="fixed top-0 left-0 w-full z-60 h-14 bg-black text-white flex items-center justify-between px-4 border-b border-[#000000]/10">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenuExpandido(!menuExpandido)} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <Image src={logobranco} alt="Logo AgilizaOS" className="h-10 w-auto object-contain transition-all duration-300" />
        </div>
        <div className="flex items-center gap-3 px-5 py-2 rounded-full backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg">
          <FiSearch className="text-white/90 hover:text-[#cffb6d] transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent placeholder-white/60 text-white text-sm focus:outline-none w-36 sm:w-60"
          />
          <div className="relative">
            <FiBell
              className="text-white hover:text-[#cffb6d] cursor-pointer transition-colors"
              size={20}
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {showNotifications && (
              <div className="absolute right-0 top-8 w-72 z-50">
                <div className="bg-white text-black rounded-xl shadow-xl p-4 border border-black/10">
                  <h4 className="font-semibold text-sm mb-2">Notificações</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="border-b border-gray-200 pb-1">🔧 Ordem #324 foi aprovada.</li>
                    <li className="border-b border-gray-200 pb-1">📦 Novo produto cadastrado.</li>
                    <li>💰 Entrada no financeiro registrada.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
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
            <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" menuExpandido={menuExpandido} />
            <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" menuExpandido={menuExpandido} />
            <SidebarButton path="/clientes" icon={<FiUsers size={20} />} label="Clientes" menuExpandido={menuExpandido} />
            <SidebarButton path="/tecnicos" icon={<FiUserCheck size={20} />} label="Técnicos" menuExpandido={menuExpandido} />
            <SidebarButton path="/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" menuExpandido={menuExpandido} />
            <SidebarButton path="#" icon={<FiDollarSign size={20} />} label="Financeiro" menuExpandido={menuExpandido} />
            <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" menuExpandido={menuExpandido} />
            <SidebarButton path="#" icon={<FiFileText size={20} />} label="Termos" menuExpandido={menuExpandido} />
            <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" menuExpandido={menuExpandido} />
            <button
              onClick={() => {
                // TODO: adicionar lógica de logout
                router.push('/login');
              }}
              className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-red-100 ${
                menuExpandido ? '' : 'justify-center'
              }`}
            >
              <div className="min-w-[20px]">
                <FiLogOut size={20} />
              </div>
              <span
                className={`ml-2 transition-all duration-300 ease-in-out whitespace-nowrap text-red-600 font-medium ${
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
  const pathname = useRouter().pathname || '';
  const isActive = pathname === path || pathname.startsWith(path + '/') || (path === '/ordens' && pathname.startsWith('/nova-os'));

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