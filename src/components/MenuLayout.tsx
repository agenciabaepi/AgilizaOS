'use client';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

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
  FiSearch,
  FiBell,
  FiChevronDown,
  FiMenu,
  FiX,
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [financeiroExpanded, setFinanceiroExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

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

  // Remover menuExpandido, hoverTimeout, handleMouseEnter, handleMouseLeave, e toda lógica relacionada
  // Sidebar sempre expandida

  // Função para checar permissão
  const podeVer = (area: string) =>
    usuarioData?.nivel === 'admin' || usuarioData?.permissoes?.includes(area);

  if (menuExpandido === null) return null;
  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col py-8 px-4 min-h-screen hidden md:flex">
        {/* Logo preto centralizado com degradê radial sutil de fundo */}
        <div className="flex flex-col items-center mb-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, #f6ffe6 0%, transparent 70%)'}} />
          <Image src={logopreto} alt="Logo AgilizaOS" className="h-12 w-auto object-contain relative z-10" />
        </div>
        {/* Busca */}
        <div className="flex items-center gap-2 mb-6">
          <FiSearch className="text-zinc-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar no menu..."
            className="w-full bg-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition"
          />
        </div>
        {/* Menu */}
        <nav className="flex flex-col gap-1">
          {podeVer('dashboard') && (
            <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} />
          )}
          {podeVer('lembretes') && (
            <SidebarButton path="/lembretes" icon={<FiFileText size={20} />} label="Lembretes" isActive={pathname === '/lembretes'} />
          )}
          {podeVer('ordens') && (
            <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" isActive={pathname === '/ordens'} />
          )}
          <SidebarButton path="/caixa" icon={<FiDollarSign size={20} />} label="Caixa" isActive={pathname === '/caixa'} />
          {podeVer('clientes') && (
            <SidebarButton path="/clientes" icon={<FiUsers size={20} />} label="Clientes" isActive={pathname === '/clientes'} />
          )}
          {podeVer('equipamentos') && (
            <SidebarButton path="/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" isActive={pathname === '/equipamentos'} />
          )}
          {podeVer('financeiro') && (
            <>
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-zinc-700 hover:bg-zinc-100"
                onClick={() => setFinanceiroExpanded(!financeiroExpanded)}
                style={{ minHeight: 48 }}
              >
                <div className="flex items-center gap-3">
                  <FiDollarSign size={20} />
                  <span>Financeiro</span>
                </div>
                <FiChevronDown 
                  size={16} 
                  className={`transition-transform ${financeiroExpanded ? 'rotate-180' : ''}`} 
                />
              </div>
              
              {financeiroExpanded && (
                <div className="ml-6 flex flex-col gap-1 mt-1">
                  <SidebarButton path="/financeiro/vendas" icon={<FiFileText size={18} />} label="Vendas" isActive={pathname === '/financeiro/vendas'} />
                  <SidebarButton path="/movimentacao-caixa" icon={<FiDollarSign size={18} />} label="Movimentações Caixa" isActive={pathname === '/movimentacao-caixa'} />
                  <SidebarButton path="/financeiro/contas-a-pagar" icon={<FiFileText size={18} />} label="Contas a Pagar" isActive={pathname === '/financeiro/contas-a-pagar'} />
                </div>
              )}
            </>
          )}
          {podeVer('bancada') && (
            <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" isActive={pathname === '/bancada'} />
          )}
          {podeVer('termos') && (
            <SidebarButton path="#" icon={<FiFileText size={20} />} label="Termos" isActive={pathname === '/termos'} />
          )}
          <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" isActive={pathname === '/perfil'} />
          {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
            <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" isActive={pathname === '/configuracoes'} />
          )}
          <SidebarButton path="#logout" icon={<FiLogOut size={20} />} label="Sair" isActive={false} onClick={async () => {
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
          }} />
        </nav>
        <div className="mt-auto text-center text-xs text-[#cffb6d] pb-4">
          v1.0.0
        </div>
      </aside>
      {/* Sidebar Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer */}
          <aside className="relative w-64 bg-white border-r border-zinc-200 flex flex-col py-8 px-4 min-h-screen animate-slide-in">
            <button className="absolute top-4 right-4 text-zinc-500" onClick={() => setMobileMenuOpen(false)}>
              <FiX size={28} />
            </button>
            <div className="flex flex-col items-center mb-8 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none" style={{background: 'radial-gradient(circle, #f6ffe6 0%, transparent 70%)'}} />
              <Image src={logopreto} alt="Logo AgilizaOS" className="h-12 w-auto object-contain relative z-10" />
            </div>
            <div className="flex items-center gap-2 mb-6">
              <FiSearch className="text-zinc-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar no menu..."
                className="w-full bg-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400 transition"
              />
            </div>
            <nav className="flex flex-col gap-1">
              {podeVer('dashboard') && (
                <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} />
              )}
              {podeVer('lembretes') && (
                <SidebarButton path="/lembretes" icon={<FiFileText size={20} />} label="Lembretes" isActive={pathname === '/lembretes'} />
              )}
              {podeVer('ordens') && (
                <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" isActive={pathname === '/ordens'} />
              )}
              <SidebarButton path="/caixa" icon={<FiDollarSign size={20} />} label="Caixa" isActive={pathname === '/caixa'} />
              {podeVer('clientes') && (
                <SidebarButton path="/clientes" icon={<FiUsers size={20} />} label="Clientes" isActive={pathname === '/clientes'} />
              )}
              {podeVer('equipamentos') && (
                <SidebarButton path="/equipamentos" icon={<FiBox size={20} />} label="Produtos/Serviços" isActive={pathname === '/equipamentos'} />
              )}
              {podeVer('financeiro') && (
                <>
                  <div 
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-zinc-700 hover:bg-zinc-100"
                    onClick={() => setFinanceiroExpanded(!financeiroExpanded)}
                    style={{ minHeight: 48 }}
                  >
                    <div className="flex items-center gap-3">
                      <FiDollarSign size={20} />
                      <span>Financeiro</span>
                    </div>
                    <FiChevronDown 
                      size={16} 
                      className={`transition-transform ${financeiroExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                  
                  {financeiroExpanded && (
                    <div className="ml-6 flex flex-col gap-1 mt-1">
                      <SidebarButton path="/financeiro/vendas" icon={<FiFileText size={18} />} label="Vendas" isActive={pathname === '/financeiro/vendas'} />
                      <SidebarButton path="/financeiro/movimentacoes-caixa" icon={<FiDollarSign size={18} />} label="Movimentações Caixa" isActive={pathname === '/financeiro/movimentacoes-caixa'} />
                      <SidebarButton path="/financeiro/contas-a-pagar" icon={<FiFileText size={18} />} label="Contas a Pagar" isActive={pathname === '/financeiro/contas-a-pagar'} />
                    </div>
                  )}
                </>
              )}
              {podeVer('bancada') && (
                <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" isActive={pathname === '/bancada'} />
              )}
              {podeVer('termos') && (
                <SidebarButton path="#" icon={<FiFileText size={20} />} label="Termos" isActive={pathname === '/termos'} />
              )}
              <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" isActive={pathname === '/perfil'} />
              {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
                <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" isActive={pathname === '/configuracoes'} />
              )}
              <SidebarButton path="#logout" icon={<FiLogOut size={20} />} label="Sair" isActive={false} onClick={async () => {
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
              }} />
            </nav>
            <div className="mt-auto text-center text-xs text-[#cffb6d] pb-4">
              v1.0.0
            </div>
          </aside>
        </div>
      )}
      {/* Main area with header and content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* TopHeader */}
        <header className="w-full h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-30">
          {/* Botão menu mobile */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="text-zinc-700">
              <FiMenu size={28} />
            </button>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2">
              <FiSearch className="text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent text-zinc-700 text-sm focus:outline-none w-32 md:w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              {usuarioData?.foto_url ? (
                <img
                  src={usuarioData.foto_url}
                  alt="Foto de perfil"
                  className="rounded-full border-2 border-lime-400 object-cover w-8 h-8"
                />
              ) : (
                <div className="rounded-full border-2 border-lime-400 bg-lime-200 w-8 h-8 flex items-center justify-center">
                  <span className="text-base font-bold text-lime-700">
                    {usuarioData?.nome?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="text-zinc-700 text-sm font-medium">{usuarioData?.nome || userName}</span>
            </div>
            <div className="relative">
              <FiBell
                className="text-zinc-500 hover:text-lime-500 cursor-pointer transition-colors"
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
        </header>
        {/* Conteúdo principal */}
        <main className="flex-1 p-4 md:p-8 w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarButton({ path, icon, label, isActive, onClick }: { path: string; icon: React.ReactNode; label: string; isActive: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick || (() => window.location.href = path)}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition font-medium text-base
        ${isActive ? 'bg-lime-100 text-black' : 'hover:bg-zinc-100 text-zinc-700'}`}
      style={{ minHeight: 48 }}
    >
      <span className="min-w-[24px] flex items-center justify-center">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

// Função de upload de foto
async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file || !usuarioData?.id) return;
  const filePath = `user-${usuarioData.id}/${file.name}`;
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });
  if (!error) {
    const url = supabase.storage.from('avatars').getPublicUrl(filePath).publicUrl;
    await supabase.from('usuarios').update({ foto_url: url }).eq('id', usuarioData.id);
    // Atualize o contexto do usuário se necessário
    addToast('success', 'Foto atualizada!');
    setShowProfileModal(false);
    window.location.reload(); // Força atualização do avatar
  } else {
    addToast('error', 'Erro ao fazer upload da foto.');
  }
}