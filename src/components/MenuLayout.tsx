'use client';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

import Image from 'next/image';
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
  FiGrid,
  FiTruck,
  FiStar,
  FiMessageCircle,
  FiBarChart,
  FiTrendingUp,
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import { supabase, forceLogout } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import LogoutScreen from '@/components/LogoutScreen';
import { useWhatsAppNotification } from '@/hooks/useWhatsAppNotification';
import { useLogout } from '@/hooks/useLogout';

// Funções locais como fallback
const isUsuarioTesteLocal = (usuario: any) => {
  return usuario?.nivel === 'usuarioteste';
};

const podeUsarFuncionalidadeLocal = (usuario: any, nomeFuncionalidade: string) => {
  if (usuario?.nivel === 'usuarioteste') {
    return true;
  }
  return false;
};

// ✅ REMOVER logs desnecessários
export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { signOut, usuarioData, empresaData } = useAuth();
  const { addToast } = useToast();
  const { logout, isLoggingOut } = useLogout();

  const [userLevel, setUserLevel] = useState<string>('');
  const [menuExpandido, setMenuExpandido] = useState<boolean | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFinanceiroSub, setShowFinanceiroSub] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [financeiroExpanded, setFinanceiroExpanded] = useState(false);
  const [equipamentosExpanded, setEquipamentosExpanded] = useState(false);
  const [contatosExpanded, setContatosExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuRecolhido, setMenuRecolhido] = useState<boolean>(false);
  const [catalogoHabilitado, setCatalogoHabilitado] = useState<boolean>(false);



  // ✅ DESABILITADO TEMPORARIAMENTE: Hook muito pesado, causando lentidão
  // useWhatsAppNotification();


  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  // Carregar configurações do catálogo
  useEffect(() => {
    (async () => {
      try {
        if (!empresaData?.id) return;
        
        const { data, error } = await supabase
          .from('configuracoes_empresa')
          .select('catalogo_habilitado')
          .eq('empresa_id', empresaData.id)
          .single();
          
        if (error) {
          // Se não encontrar configurações, assumir que está habilitado por padrão
          setCatalogoHabilitado(true);
          return;
        }
        
        const habilitado = data?.catalogo_habilitado === true;
        setCatalogoHabilitado(habilitado);
        
      } catch (error) {
        // Em caso de erro, assumir que está habilitado
        setCatalogoHabilitado(true);
      }
    })();
  }, [empresaData?.id]);

  useEffect(() => {
    const stored = localStorage.getItem('menuExpandido') === 'true';
    setMenuExpandido(stored);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('menuRecolhido') === 'true';
    setMenuRecolhido(stored);
  }, []);

  // Inicializar estados de expansão
  useEffect(() => {
    // Expandir automaticamente se estiver em qualquer página de equipamentos
    if (pathname.startsWith('/equipamentos/')) {
      setEquipamentosExpanded(true);
    }
    // Expandir automaticamente se estiver nas páginas de contatos
    if (pathname === '/clientes' || pathname === '/fornecedores') {
      setContatosExpanded(true);
    }
    // Expandir automaticamente se estiver em qualquer página do financeiro
    if (pathname.startsWith('/financeiro/')) {
      setFinanceiroExpanded(true);
    }
  }, [pathname]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (menuExpandido && !target.closest('.menu-dropdown')) {
        setMenuExpandido(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuExpandido]);

  // Remover menuExpandido, hoverTimeout, handleMouseEnter, handleMouseLeave, e toda lógica relacionada
  // Sidebar sempre expandida

  // Função para checar permissão
  const podeVer = (area: string) => {
    // Usuários de teste têm acesso a TUDO
    if (usuarioData?.nivel === 'usuarioteste') {
      return true; // ✅ Acesso total garantido
    }
    
    // Admin tem acesso a TUDO
    if (usuarioData?.nivel === 'admin') {
      return true;
    }
    
    // Técnicos sempre podem ver dashboard
    if (area === 'dashboard' && usuarioData?.nivel === 'tecnico') {
      return true;
    }
    
    // Verificar se o usuário tem a permissão específica
    const temPermissao = usuarioData?.permissoes && usuarioData.permissoes.includes(area);
    
    
    return temPermissao;
  };

  const toggleMenu = () => {
    const newState = !menuRecolhido;
    setMenuRecolhido(newState);
    localStorage.setItem('menuRecolhido', newState.toString());
  };
  
  // ❌ REMOVIDO: Esta linha impedia a renderização do menu
  // if (menuExpandido === null || menuRecolhido === null) return null;
  
  // ✅ SOLUÇÃO: Usar valores padrão em vez de bloquear a renderização
  const menuRecolhidoFinal = menuRecolhido ?? false;
  const menuExpandidoFinal = menuExpandido ?? false;
  
  return (
    <div className="flex min-h-screen bg-white">
        {/* Sidebar Desktop */}
        <aside className={`${menuRecolhidoFinal ? 'w-16' : 'w-64'} bg-black border-r border-white/20 flex flex-col py-8 ${menuRecolhidoFinal ? 'px-2' : 'px-4'} h-screen fixed top-0 left-0 z-40 hidden md:flex transition-all duration-300 overflow-y-auto no-print`}>
        {/* Logo branco centralizado */}
        <div className="flex flex-col items-center mb-6">
          {menuRecolhidoFinal ? (
            <div className="w-10 h-10 bg-[#D1FE6E] rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-lg">C</span>
            </div>
          ) : (
            <Image src="/assets/imagens/logobranco.png" alt="Consert Logo" width={200} height={48} className="h-12 w-auto object-contain" priority />
          )}
        </div>
        {/* Busca */}
        {!menuRecolhidoFinal && (
          <div className="flex items-center gap-2 mb-8">
            <FiSearch className="text-white/60" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar no menu..."
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition"
            />
          </div>
        )}
        {/* Menu */}
        <nav className="flex flex-col gap-2 flex-1">
          {/* Dashboard */}
          {(podeVer('dashboard') || usuarioData?.nivel === 'tecnico' || usuarioData?.nivel === 'atendente') && (
            <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} menuRecolhido={menuRecolhidoFinal} />
          )}
                  {/* Lembretes */}
                  {userLevel === 'admin' && (
                    <SidebarButton path="/lembretes" icon={<FiBell size={20} />} label="Lembretes" isActive={pathname === '/lembretes'} menuRecolhido={menuRecolhidoFinal} />
                  )}
          {podeVer('ordens') && (
            <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" isActive={pathname === '/ordens'} menuRecolhido={menuRecolhidoFinal} />
          )}
          {podeVer('caixa') && (
                            <SidebarButton path="/caixa" icon={<FiDollarSign size={20} />} label="Caixa" isActive={pathname === '/caixa'} menuRecolhido={menuRecolhido || false} />
          )}
          {podeVer('clientes') && (
            <>
              <div 
                className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-white hover:bg-white/10
                  ${menuRecolhido ? 'justify-center' : 'justify-between'}`}
                onClick={() => setContatosExpanded(!contatosExpanded)}
                style={{ minHeight: 48 }}
                title="Contatos"
              >
                <div className="flex items-center">
                  <FiUsers size={20} />
                  {!menuRecolhido && <span className="ml-3">Contatos</span>}
                </div>
                {!menuRecolhido && (
                  <FiChevronDown 
                    size={16} 
                    className={`transition-transform ${contatosExpanded ? 'rotate-180' : ''}`} 
                  />
                )}
              </div>
              
              {contatosExpanded && !menuRecolhido && (
                <div className="ml-6 flex flex-col gap-1 mt-1">
                  <SidebarButton path="/clientes" icon={<FiUsers size={18} />} label="Clientes" isActive={pathname === '/clientes'} menuRecolhido={menuRecolhido || false} />
                  {podeVer('fornecedores') && (
                    <SidebarButton path="/fornecedores" icon={<FiTruck size={18} />} label="Fornecedores" isActive={pathname === '/fornecedores'} menuRecolhido={menuRecolhido || false} />
                  )}
                </div>
              )}
            </>
          )}
          {podeVer('equipamentos') && (
            <>
              <div 
                className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-white hover:bg-white/10
                  ${menuRecolhido ? 'justify-center' : 'justify-between'}`}
                onClick={() => setEquipamentosExpanded(!equipamentosExpanded)}
                style={{ minHeight: 48 }}
                title="Produtos/Serviços"
              >
                <div className="flex items-center">
                  <FiBox size={20} />
                  {!menuRecolhido && <span className="ml-3">Produtos/Serviços</span>}
                </div>
                {!menuRecolhido && (
                  <FiChevronDown 
                    size={16} 
                    className={`transition-transform ${equipamentosExpanded ? 'rotate-180' : ''}`} 
                  />
                )}
              </div>
              
              {equipamentosExpanded && !menuRecolhido && (
                <div className="ml-6 flex flex-col gap-1 mt-1">
                  <SidebarButton path="/equipamentos" icon={<FiBox size={18} />} label="Produtos" isActive={pathname === '/equipamentos'} menuRecolhido={menuRecolhido || false} />
                  <SidebarButton path="/equipamentos/categorias" icon={<FiGrid size={18} />} label="Categorias" isActive={pathname === '/equipamentos/categorias'} menuRecolhido={menuRecolhido || false} />
                  {catalogoHabilitado && (
                                          <SidebarButton path="/catalogo" icon={<FiStar size={18} />} label="Catálogo" isActive={pathname === '/catalogo'} menuRecolhido={menuRecolhido || false} />
                  )}
                </div>
              )}
            </>
          )}
          {podeVer('financeiro') && (
            <>
              <div 
                className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-white hover:bg-white/10
                  ${menuRecolhido ? 'justify-center' : 'justify-between'}`}
                onClick={() => setFinanceiroExpanded(!financeiroExpanded)}
                style={{ minHeight: 48 }}
                title="Financeiro"
              >
                <div className="flex items-center">
                  <FiDollarSign size={20} />
                  {!menuRecolhido && <span className="ml-3">Financeiro</span>}
                </div>
                {!menuRecolhido && (
                  <FiChevronDown 
                    size={16} 
                    className={`transition-transform ${financeiroExpanded ? 'rotate-180' : ''}`} 
                  />
                )}
              </div>
              
              {financeiroExpanded && !menuRecolhido && (
                <div className="ml-6 flex flex-col gap-1 mt-1">
                  {podeVer('lucro-desempenho') && (
                    <SidebarButton 
                      path="/financeiro/lucro-desempenho" 
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                          <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                      } 
                      label="Lucro & Desempenho" 
                      isActive={pathname === '/financeiro/lucro-desempenho'} 
                      menuRecolhido={menuRecolhido} 
                    />
                  )}
                  {podeVer('vendas') && (
                    <SidebarButton 
                      path="/financeiro/vendas" 
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14,2 14,8 20,8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10,9 9,9 8,9"></polyline>
                        </svg>
                      } 
                      label="Vendas" 
                      isActive={pathname === '/financeiro/vendas'} 
                      menuRecolhido={menuRecolhido} 
                    />
                  )}
                  {podeVer('movimentacao-caixa') && (
                    <SidebarButton 
                      path="/financeiro/movimentacoes-caixa" 
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23"></line>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                      } 
                      label="Movimentações Caixa" 
                      isActive={pathname === '/financeiro/movimentacoes-caixa'} 
                      menuRecolhido={menuRecolhido} 
                    />
                  )}
                  {podeVer('contas-a-pagar') && (
                    <SidebarButton 
                      path="/financeiro/contas-a-pagar" 
                      icon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                      } 
                      label="Contas a Pagar" 
                      isActive={pathname === '/financeiro/contas-a-pagar'} 
                      menuRecolhido={menuRecolhido} 
                    />
                  )}
                </div>
              )}
            </>
          )}
          {podeVer('bancada') && (
            <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" isActive={pathname === '/bancada'} menuRecolhido={menuRecolhido} />
          )}
          {usuarioData?.nivel === 'tecnico' && (
            <SidebarButton path="/comissoes" icon={<FiDollarSign size={20} />} label="Comissões" isActive={pathname === '/comissoes'} menuRecolhido={menuRecolhido} />
          )}
          
          <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" isActive={pathname === '/perfil'} menuRecolhido={menuRecolhido} />
          {podeVer('configuracoes') && (
            <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" isActive={pathname === '/configuracoes'} menuRecolhido={menuRecolhido} />
          )}
          <SidebarButton path="#logout" icon={<FiLogOut size={20} />} label="Sair" isActive={false} menuRecolhido={menuRecolhido} onClick={logout} />
        </nav>
        {!menuRecolhido && (
          <div className="mt-auto text-center text-xs text-[#D1FE6E] pb-2">
            v1.0.0
          </div>
        )}
        
      </aside>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex no-print">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer */}
          <aside className="relative w-64 bg-black border-r border-white/20 flex flex-col py-8 px-4 min-h-screen animate-slide-in">
            <button className="absolute top-4 right-4 text-white" onClick={() => setMobileMenuOpen(false)}>
              <FiX size={28} />
            </button>
            <div className="flex flex-col items-center mb-8">
              <Image src="/assets/imagens/logobranco.png" alt="Consert Logo" width={200} height={48} className="h-12 w-auto object-contain" priority />
            </div>
            <div className="flex items-center gap-2 mb-6">
              <FiSearch className="text-white/60" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar no menu..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#D1FE6E] focus:border-[#D1FE6E] transition"
              />
            </div>
            <nav className="flex flex-col gap-1">
              {/* Dashboard */}
              {(podeVer('dashboard') || usuarioData?.nivel === 'tecnico' || usuarioData?.nivel === 'atendente') && (
                <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} menuRecolhido={menuRecolhido || false} />
              )}
                      {/* Lembretes removidos - agora integrados na dashboard */}
              {podeVer('ordens') && (
                <SidebarButton path="/ordens" icon={<FiFileText size={20} />} label="Ordens de Serviço" isActive={pathname === '/ordens'} menuRecolhido={menuRecolhido || false} />
              )}
              {podeVer('caixa') && (
                <SidebarButton path="/caixa" icon={<FiDollarSign size={20} />} label="Caixa" isActive={pathname === '/caixa'} menuRecolhido={menuRecolhido || false} />
              )}
              {podeVer('clientes') && (
                <>
                  <div 
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-white hover:bg-white/10"
                    onClick={() => setContatosExpanded(!contatosExpanded)}
                    style={{ minHeight: 48 }}
                  >
                    <div className="flex items-center gap-3">
                      <FiUsers size={20} />
                      <span>Contatos</span>
                    </div>
                    <FiChevronDown 
                      size={16} 
                      className={`transition-transform ${contatosExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                  
                  {contatosExpanded && (
                    <div className="ml-6 flex flex-col gap-1 mt-1">
                      <SidebarButton path="/clientes" icon={<FiUsers size={18} />} label="Clientes" isActive={pathname === '/clientes'} menuRecolhido={menuRecolhido || false} />
                      {podeVer('fornecedores') && (
                        <SidebarButton path="/fornecedores" icon={<FiTruck size={18} />} label="Fornecedores" isActive={pathname === '/fornecedores'} menuRecolhido={menuRecolhido || false} />
                      )}
                    </div>
                  )}
                </>
              )}
                            {podeVer('equipamentos') && (
                <>
                  <div 
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-white hover:bg-white/10"
                    onClick={() => setEquipamentosExpanded(!equipamentosExpanded)}
                    style={{ minHeight: 48 }}
                  >
                    <div className="flex items-center gap-3">
                      <FiBox size={20} />
                      <span>Produtos/Serviços</span>
                    </div>
                    <FiChevronDown 
                      size={16} 
                      className={`transition-transform ${equipamentosExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                  
                  {equipamentosExpanded && (
                    <div className="ml-6 flex flex-col gap-1 mt-1">
                      <SidebarButton path="/equipamentos" icon={<FiBox size={18} />} label="Produtos" isActive={pathname === '/equipamentos'} menuRecolhido={menuRecolhido || false} />
                      <SidebarButton path="/equipamentos/categorias" icon={<FiGrid size={18} />} label="Categorias" isActive={pathname === '/equipamentos/categorias'} menuRecolhido={menuRecolhido || false} />
                  {catalogoHabilitado && (
                    <SidebarButton path="/catalogo" icon={<FiStar size={18} />} label="Catálogo" isActive={pathname === '/catalogo'} menuRecolhido={menuRecolhido || false} />
                  )}
                    </div>
                  )}
                </>
              )}
              {podeVer('financeiro') && (
                <>
                  <div 
                    className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition font-medium text-base text-white hover:bg-white/10"
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
                  
                </>
              )}
              {podeVer('bancada') && (
                <SidebarButton path="/bancada" icon={<FiTool size={20} />} label="Bancada" isActive={pathname === '/bancada'} menuRecolhido={menuRecolhido} />
              )}
              {usuarioData?.nivel === 'tecnico' && (
                <SidebarButton path="/comissoes" icon={<FiDollarSign size={20} />} label="Comissões" isActive={pathname === '/comissoes'} menuRecolhido={menuRecolhido} />
              )}
              <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" isActive={pathname === '/perfil'} menuRecolhido={menuRecolhido} />
                        {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
            <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" isActive={pathname === '/configuracoes'} menuRecolhido={menuRecolhido} />
          )}
          
          <SidebarButton 
            path="#logout" 
            icon={<FiLogOut size={20} />} 
            label="Sair" 
            isActive={false} 
            menuRecolhido={menuRecolhido}
            onClick={logout} 
          />
            </nav>
            <div className="mt-auto text-center text-xs text-[#D1FE6E] pb-4">
              v1.0.0
            </div>
          </aside>
        </div>
      )}
      {/* Main area with header and content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ml-0 ${menuRecolhido ? 'md:ml-16' : 'md:ml-64'}`}>
        {/* TopHeader */}
        <header className="w-full h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 no-print">
          {/* Botão menu mobile */}
          <div className="flex md:hidden items-center">
            <button onClick={() => setMobileMenuOpen(true)} className="text-zinc-700 p-2">
              <FiMenu size={24} />
            </button>
          </div>
          
          {/* Botão hambúrguer desktop */}
          <div className="hidden md:flex items-center">
            <button
              onClick={toggleMenu}
              className="text-zinc-700 hover:text-[#D1FE6E] transition-colors duration-200 p-2 rounded-lg hover:bg-zinc-100"
              title={menuRecolhido ? "Expandir menu" : "Recolher menu"}
            >
              {menuRecolhido ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Área central - Busca */}
          <div className="flex-1 max-w-md mx-4 hidden sm:flex">
            <div className="flex items-center gap-2 bg-zinc-100 rounded-lg px-3 py-2 w-full">
              <FiSearch className="text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent text-zinc-700 text-sm focus:outline-none w-full"
              />
            </div>
          </div>
          
          {/* Área direita - Usuário e notificações */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Status da assinatura - oculto em mobile */}
            <div className="hidden md:block">
              <SubscriptionStatus />
            </div>
            
            {/* Busca mobile */}
            <div className="sm:hidden">
              <button className="text-zinc-500 p-2">
                <FiSearch size={20} />
              </button>
            </div>
            
            {/* Avatar e nome do usuário */}
            <div className="flex items-center gap-2">
              {usuarioData?.foto_url ? (
                <img
                  src={usuarioData.foto_url}
                  alt="Foto de perfil"
                  className="rounded-full border-2 border-lime-400 object-contain w-8 h-8"
                />
              ) : (
                <div className="rounded-full border-2 border-lime-400 bg-lime-200 w-8 h-8 flex items-center justify-center">
                  <span className="text-base font-bold text-lime-700">
                    {usuarioData?.nome?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="text-zinc-700 text-sm font-medium hidden sm:block">{usuarioData?.nome || 'Usuário'}</span>
            </div>
            
            {/* Notificações */}
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
      
      {/* Menu Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Menu Mobile */}
          <div className="absolute left-0 top-0 h-full w-80 bg-gray-900 shadow-xl transform transition-transform duration-300 flex flex-col">
            {/* Header do menu mobile */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Image src="/assets/imagens/logobranco.png" alt="Consert Logo" width={150} height={32} className="h-8 w-auto" priority />
                <span className="text-white font-semibold">Menu</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-white p-2 hover:bg-gray-800 rounded-lg"
              >
                <FiX size={24} />
              </button>
            </div>
            
            {/* Busca mobile */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <FiSearch className="text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar no menu..."
                  className="w-full bg-transparent text-white placeholder-gray-400 text-sm focus:outline-none"
                />
              </div>
            </div>
            
            {/* Navegação mobile */}
            <nav className="flex flex-col p-4 space-y-2 overflow-y-auto flex-1 min-h-0">
              {/* Dashboard */}
              {(podeVer('dashboard') || usuarioData?.nivel === 'tecnico' || usuarioData?.nivel === 'atendente') && (
                <MobileMenuItem
                  path="/dashboard"
                  icon={<FiHome size={20} />}
                  label="Dashboard"
                  isActive={pathname === '/dashboard'}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )}
              
              {/* Lembretes removidos - agora integrados na dashboard */}
              
              {/* Ordens de Serviço */}
              {podeVer('ordens') && (
                <MobileMenuItem
                  path="/ordens"
                  icon={<FiFileText size={20} />}
                  label="Ordens de Serviço"
                  isActive={pathname === '/ordens'}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )}
              
              {/* Caixa */}
              {podeVer('caixa') && (
                <MobileMenuItem
                  path="/caixa"
                  icon={<FiDollarSign size={20} />}
                  label="Caixa"
                  isActive={pathname === '/caixa'}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )}
              
              {/* Contatos */}
              {podeVer('clientes') && (
                <>
                  <MobileMenuItem
                    path="/clientes"
                    icon={<FiUsers size={20} />}
                    label="Clientes"
                    isActive={pathname === '/clientes'}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                  {podeVer('fornecedores') && (
                    <MobileMenuItem
                      path="/fornecedores"
                      icon={<FiTruck size={20} />}
                      label="Fornecedores"
                      isActive={pathname === '/fornecedores'}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  )}
                </>
              )}
              
              {/* Produtos/Serviços */}
              {podeVer('equipamentos') && (
                <>
                  <MobileMenuItem
                    path="/equipamentos"
                    icon={<FiBox size={20} />}
                    label="Produtos"
                    isActive={pathname === '/equipamentos'}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                                      <MobileMenuItem
                      path="/equipamentos/categorias"
                      icon={<FiGrid size={20} />}
                      label="Categorias"
                      isActive={pathname === '/equipamentos/categorias'}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  {catalogoHabilitado && (
                    <MobileMenuItem
                      path="/catalogo"
                      icon={<FiStar size={20} />}
                      label="Catálogo"
                      isActive={pathname === '/catalogo'}
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  )}
                </>
              )}
              
              {/* Financeiro */}
              {podeVer('financeiro') && (
                <>
                  <MobileMenuItem
                    path="/financeiro/lucro-desempenho"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                    }
                    label="Lucro & Desempenho"
                    isActive={pathname === '/financeiro/lucro-desempenho'}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                  <MobileMenuItem
                    path="/financeiro/vendas"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                      </svg>
                    }
                    label="Vendas"
                    isActive={pathname === '/financeiro/vendas'}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                  <MobileMenuItem
                    path="/financeiro/movimentacoes-caixa"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                    }
                    label="Movimentações Caixa"
                    isActive={pathname === '/financeiro/movimentacoes-caixa'}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                  <MobileMenuItem
                    path="/financeiro/contas-a-pagar"
                    icon={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    }
                    label="Contas a Pagar"
                    isActive={pathname === '/financeiro/contas-a-pagar'}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                </>
              )}
              
              {/* Bancada */}
              {podeVer('bancada') && (
                <MobileMenuItem
                  path="/bancada"
                  icon={<FiTool size={20} />}
                  label="Bancada"
                  isActive={pathname === '/bancada'}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )}
              
              {/* Comissões */}
              {usuarioData?.nivel === 'tecnico' && (
                <MobileMenuItem
                  path="/comissoes"
                  icon={<FiDollarSign size={20} />}
                  label="Comissões"
                  isActive={pathname === '/comissoes'}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )}
              
              
              {/* Meu Perfil */}
              <MobileMenuItem
                path="/perfil"
                icon={<FiUsers size={20} />}
                label="Meu Perfil"
                isActive={pathname === '/perfil'}
                onNavigate={() => setMobileMenuOpen(false)}
              />
              
              {/* Configurações */}
              {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
                <MobileMenuItem
                  path="/configuracoes"
                  icon={<FiTool size={20} />}
                  label="Configurações"
                  isActive={pathname === '/configuracoes'}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              )}
              
              {/* Sair */}
              <MobileMenuItem
                path="#logout"
                icon={<FiLogOut size={20} />}
                label="Sair"
                isActive={false}
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
              />
            </nav>
            
            {/* Footer mobile */}
            <div className="absolute bottom-4 left-4 right-4 text-center text-xs text-gray-400">
              v1.0.0
            </div>
          </div>
        </div>
      )}
      
      {/* Tela de Logout */}
      {isLoggingOut && <LogoutScreen />}
      
      
    </div>
  );
}

function SidebarButton({ 
  path, 
  icon, 
  label, 
  isActive, 
  onClick, 
  menuRecolhido 
}: { 
  path: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick?: () => void; 
  menuRecolhido: boolean; 
}) {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (path && path !== '#' && !path.startsWith('#')) {
      router.push(path); // ✅ Agora usa navegação SPA
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center w-full px-3 py-2 rounded-lg transition font-medium text-base
        ${menuRecolhido ? 'justify-center' : 'justify-start'}
        ${isActive ? 'bg-[#D1FE6E] text-black' : 'hover:bg-white/10 text-white'}`}
      style={{ minHeight: 48 }}
      title={label}
    >
      {icon}
      {!menuRecolhido && <span className="ml-3 whitespace-nowrap">{label}</span>}
    </button>
  );
}

// Componente para itens do menu mobile
function MobileMenuItem({ 
  path, 
  icon, 
  label, 
  isActive, 
  onClick,
  onNavigate
}: { 
  path: string; 
  icon: React.ReactNode; 
  label: string; 
  isActive: boolean; 
  onClick?: () => void; 
  onNavigate?: () => void;
}) {
  const router = useRouter();
  
  const handleClick = () => {

    if (onClick) {
      onClick();
    } else if (path && path !== '#' && !path.startsWith('#')) {
      // Fechar menu mobile antes de navegar
      if (onNavigate) {
        onNavigate();
      }
      router.push(path);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={`flex items-center w-full px-4 py-3 rounded-lg transition font-medium text-base
        ${isActive ? 'bg-[#D1FE6E] text-black' : 'hover:bg-gray-800 text-white'}`}
      style={{ minHeight: 48 }}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </div>
    </button>
  );
}

// Função de upload de foto movida para dentro do componente