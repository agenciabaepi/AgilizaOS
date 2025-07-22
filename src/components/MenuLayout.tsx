'use client';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import Image from 'next/image';
import logobranco from '@/assets/imagens/logobranco.png';
import {
  FiHome,
  FiUsers,
  FiBox,
  FiTool,
  FiDollarSign,
  FiFileText,
  FiLogOut,
  FiSearch,
  FiBell,
  FiChevronDown,
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { signOut, usuarioData } = useAuth();
  const { addToast } = useToast();

  const [userName, setUserName] = useState<string>('');
  const [userLevel, setUserLevel] = useState<string>('');
  const [menuExpandido, setMenuExpandido] = useState<boolean | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showFinanceiroSub, setShowFinanceiroSub] = useState(false);

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = (user.user_metadata as { full_name?: string })?.full_name || user.email || '';
        setUserName(name);
        // fetch user level
        const { data: profile } = await supabase
          .from('usuarios')
          .select('nivel')
          .eq('id', user.id)
          .single();
        if (profile?.nivel) {
          setUserLevel(profile.nivel);
        }
      }
    })();
  }, [supabase]);

  useEffect(() => {
    const stored = localStorage.getItem('menuExpandido') === 'true';
    setMenuExpandido(stored);
  }, []);

  const handleMouseEnter = () => {
    setMenuExpandido(true);
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setMenuExpandido(false);
    }, 500); // recolhe 3 segundos após sair com o mouse
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout.current) {
        clearTimeout(hoverTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (menuExpandido !== null) {
      localStorage.setItem('menuExpandido', String(menuExpandido));
    }
  }, [menuExpandido]);

  // Função para checar permissão
  const podeVer = (area: string) =>
    usuarioData?.nivel === 'admin' || usuarioData?.permissoes?.includes(area);

  if (menuExpandido === null) return null;
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
          <span className="text-white text-sm ml-4">{userName}</span>
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
          ref={menuRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`flex bg-white border-r border-[#000000]/10 pt-16 px-2 flex-col h-screen fixed top-0 left-0 z-50 transition-all duration-300 ${
            menuExpandido ? 'w-64' : 'w-0 md:w-16'
          } ${menuExpandido ? 'opacity-100' : 'opacity-0 md:opacity-100'} ${menuExpandido ? 'visible' : 'invisible md:visible'}`}
        >
          <div className="mb-6 h-10" />
          <nav className="space-y-2">
            {podeVer('dashboard') && (
              <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" menuExpandido={menuExpandido} />
            )}
            {podeVer('lembretes') && (
              <SidebarButton path="/lembretes" icon={<FiFileText size={20} />} label="Lembretes" menuExpandido={menuExpandido} />
            )}
            {podeVer('ordens') && (
              <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" menuExpandido={menuExpandido} />
            )}
            {podeVer('clientes') && (
              <SidebarButton path="/clientes" icon={<FiUsers size={20} />} label="Clientes" menuExpandido={menuExpandido} />
            )}
            {podeVer('equipamentos') && (
              <SidebarButton path="/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" menuExpandido={menuExpandido} />
            )}
            {podeVer('financeiro') && (
              <div className="relative">
                <button
                  onClick={() => setShowFinanceiroSub((v) => !v)}
                  className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-[#cffb6d]/20 text-[#000000] hover:text-[#000000] ${showFinanceiroSub ? 'bg-[#cffb6d]/40' : ''}`}
                >
                  <div className="min-w-[20px]">
                    <FiDollarSign size={20} />
                  </div>
                  <span className={`transition-all duration-300 ease-in-out whitespace-nowrap ml-2 ${menuExpandido ? 'opacity-100 scale-100 max-w-[200px]' : 'opacity-0 scale-95 max-w-0 overflow-hidden'}`}>Financeiro</span>
                  {menuExpandido && <FiChevronDown className={`ml-auto transition-transform ${showFinanceiroSub ? 'rotate-180' : ''}`} size={16} />}
                </button>
                {showFinanceiroSub && menuExpandido && (
                  <div className="ml-8 mt-1 space-y-1">
                    <SidebarButton path="/financeiro/contas-a-pagar" icon={<FiFileText size={18} />} label="Contas a Pagar" menuExpandido={true} />
                  </div>
                )}
              </div>
            )}
            {podeVer('bancada') && (
              <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" menuExpandido={menuExpandido} />
            )}
            {podeVer('termos') && (
              <SidebarButton path="#" icon={<FiFileText size={20} />} label="Termos" menuExpandido={menuExpandido} />
            )}
            <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" menuExpandido={menuExpandido} />
            {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
              <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" menuExpandido={menuExpandido} />
            )}
            <button
              onClick={async () => {
                setIsLoggingOut(true);
                try {
                  await signOut((msg) => addToast('error', `Erro ao sair: ${msg}`));
                  window.location.href = '/login';
                } catch (error) {
                  addToast('error', 'Erro inesperado ao sair.');
                  console.error('Erro ao fazer logout:', error);
                } finally {
                  setIsLoggingOut(false);
                }
              }}
              className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out hover:bg-red-100 ${
                menuExpandido ? '' : 'justify-center'
              }`}
              disabled={isLoggingOut}
            >
              <div className="min-w-[20px]">
                <FiLogOut size={20} />
              </div>
              <span
                className={`ml-2 transition-all duration-300 ease-in-out whitespace-nowrap text-red-600 font-medium ${
                  menuExpandido ? 'opacity-100 scale-100 max-w-[200px]' : 'opacity-0 scale-95 max-w-0 overflow-hidden'
                }`}
              >
                {isLoggingOut ? 'Saindo...' : 'Sair'}
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
  const pathname = usePathname() || '';
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