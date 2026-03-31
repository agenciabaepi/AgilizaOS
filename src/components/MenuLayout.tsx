'use client';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useMemo, useContext, createContext, type ReactNode } from 'react';

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
  FiChevronRight,
  FiMenu,
  FiX,
  FiGrid,
  FiTruck,
  FiStar,
  FiMessageCircle,
  FiBarChart,
  FiTrendingUp,
  FiMessageSquare,
  FiSun,
  FiMoon,
  FiCreditCard,
} from 'react-icons/fi';
import { supabase, forceLogout } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ThemeContext } from '@/context/ThemeContext';
import { useToast } from '@/components/Toast';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import LogoutScreen from '@/components/LogoutScreen';
import { useWhatsAppNotification } from '@/hooks/useWhatsAppNotification';
import { useLogout } from '@/hooks/useLogout';
import AvisosBanner from '@/components/AvisosBanner';
import FinanceiroAlertsBanner from '@/components/FinanceiroAlertsBanner';
import { TECNICO_DEFAULT_PERMISSIONS } from '@/config/tecnicoAllowedPaths';
import { getMenuAccentColor, MENU_ACCENT_DEFAULT } from '@/lib/menuTheme';

type MenuTheme = { accentColor: string; inverted: boolean };
const MenuAccentContext = createContext<MenuTheme>({ accentColor: MENU_ACCENT_DEFAULT, inverted: false });
const SidebarMobileCloseContext = createContext<(() => void) | null>(null);

function SidebarSubmenuPanel({ children }: { children: ReactNode }) {
  const { inverted } = useContext(MenuAccentContext);
  return (
    <div
      className={`mt-1 min-w-0 rounded-lg border p-1.5 flex flex-col gap-0.5 ${
        inverted ? 'border-gray-200 bg-gray-50/90' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      {children}
    </div>
  );
}

function SidebarSectionHeader({
  icon,
  label,
  expanded,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { inverted } = useContext(MenuAccentContext);
  return (
    <button
      type="button"
      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg cursor-pointer transition font-medium text-[15px] min-h-[48px] text-left ${
        inverted ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/10'
      }`}
      onClick={onToggle}
      title={label}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 flex size-[22px] items-center justify-center text-current [&_svg]:size-[22px] [&_svg]:shrink-0">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      {expanded ? (
        <FiChevronDown size={18} className="shrink-0 opacity-65 text-current" aria-hidden />
      ) : (
        <FiChevronRight size={18} className="shrink-0 opacity-65 text-current" aria-hidden />
      )}
    </button>
  );
}

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
export default function MenuLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { signOut, usuarioData, empresaData, lastUpdate, userDataReady, catalogoHabilitado } = useAuth();
  const { addToast } = useToast();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme ?? 'light';
  const toggleTheme = themeContext?.toggleTheme ?? (() => {});
  const { logout, isLoggingOut } = useLogout();

  const [menuExpandido, setMenuExpandido] = useState<boolean | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showFinanceiroSub, setShowFinanceiroSub] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [financeiroExpanded, setFinanceiroExpanded] = useState(false);
  const [equipamentosExpanded, setEquipamentosExpanded] = useState(false);
  const [contatosExpanded, setContatosExpanded] = useState(false);
  const [caixaExpanded, setCaixaExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificacoesTickets, setNotificacoesTickets] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [menuAccentColor, setMenuAccentColor] = useState<string>(MENU_ACCENT_DEFAULT);

  useEffect(() => {
    setMenuAccentColor(getMenuAccentColor(empresaData?.id));
  }, [empresaData?.id]);
  useEffect(() => {
    const handler = () => setMenuAccentColor(getMenuAccentColor(empresaData?.id));
    window.addEventListener('menu-color-changed', handler);
    return () => window.removeEventListener('menu-color-changed', handler);
  }, [empresaData?.id]);

  const avatarUrl = useMemo(() => {
    if (!usuarioData?.foto_url) return null;
    const base = usuarioData.foto_url.split('?')[0];
    const cacheKey = Math.floor(lastUpdate || 0);
    return `${base}?t=${cacheKey}`;
  }, [usuarioData?.foto_url, lastUpdate]);

  const empresaLogoUrl = useMemo(() => {
    if (!empresaData?.logo_url) return null;
    const base = empresaData.logo_url.split('?')[0];
    const cacheKey = Math.floor(lastUpdate || 0);
    return `${base}?t=${cacheKey}`;
  }, [empresaData?.logo_url, lastUpdate]);

  // ✅ FIX: Garantir que servidor e cliente renderizem a mesma coisa inicialmente
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // ✅ DESABILITADO TEMPORARIAMENTE: Hook muito pesado, causando lentidão
  // useWhatsAppNotification();

  // Buscar notificações de tickets
  useEffect(() => {
    if (!empresaData?.id) return;

    const buscarNotificacoes = async () => {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .eq('empresa_id', empresaData.id)
          .in('tipo', ['ticket_resposta', 'ticket_status', 'ticket_comentario'])
          .eq('lida', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          // Evitar quebrar a UI com erro de console; log mais amigável.
          console.warn(
            'Aviso: erro ao buscar notificações de tickets:',
            error?.message || error?.code || error
          );
          return;
        }

        setNotificacoesTickets(data || []);
      } catch (error: any) {
        console.warn(
          'Aviso: exceção ao buscar notificações de tickets:',
          error?.message || error
        );
      }
    };

    buscarNotificacoes();

    // Atualizar a cada 30 segundos
    const interval = setInterval(buscarNotificacoes, 30000);

    // Escutar mudanças em tempo real (INSERT e UPDATE para quando marcar como lida)
    const channel = supabase
      .channel(`notificacoes_tickets_${empresaData.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `empresa_id=eq.${empresaData.id}`
      }, () => {
        buscarNotificacoes();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificacoes',
        filter: `empresa_id=eq.${empresaData.id}`
      }, () => {
        buscarNotificacoes();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [empresaData?.id]);

  // Função para marcar notificação como lida
  const marcarNotificacaoLida = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', notificacaoId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return;
      }

      // Atualizar a lista local removendo a notificação lida
      setNotificacoesTickets(prev => prev.filter(n => n.id !== notificacaoId));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const isNovaOSFullScreen = pathname === '/nova-os';

  useEffect(() => {
    const stored = localStorage.getItem('menuExpandido') === 'true';
    setMenuExpandido(stored);
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

  // Técnico: só vê itens cuja permissão está em usuarioData.permissoes; se vazio, usa padrão (dashboard, bancada, comissoes).
  const isTecnico = usuarioData?.nivel === 'tecnico';
  const rawPermissoes = usuarioData?.permissoes ?? [];
  const permissoesTecnico = isTecnico && rawPermissoes.length === 0 ? TECNICO_DEFAULT_PERMISSIONS : rawPermissoes;
  const podeVer = (area: string) => isTecnico ? permissoesTecnico.includes(area) : true;
  const podeVerModulo = (area: string, _recurso?: string) => isTecnico ? permissoesTecnico.includes(area) : true;

  // ❌ REMOVIDO: Esta linha impedia a renderização do menu
  // if (menuExpandido === null) return null;
  
  // ✅ SOLUÇÃO: Usar valores padrão em vez de bloquear a renderização
  const menuExpandidoFinal = menuExpandido ?? false;

  // Filtro de busca do menu lateral
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const isSearching = normalizedSearch.length > 0;
  const matchesSearch = (label: string) =>
    !isSearching || label.toLowerCase().includes(normalizedSearch);
  
  return (
    <MenuAccentContext.Provider value={{ accentColor: menuAccentColor, inverted: isTecnico }}>
    <div className="flex min-h-screen bg-white dark:bg-zinc-900">
        {/* Sidebar Desktop - invertido (fundo claro) para técnico */}
        <aside
          className={`w-64 hidden md:flex flex-col py-8 px-4 h-screen fixed top-0 left-0 z-40 transition-all duration-300 overflow-y-auto no-print ${isNovaOSFullScreen ? '!hidden' : ''} ${isTecnico ? 'bg-white border-r border-gray-200' : 'bg-black border-r border-white/20'}`}
          style={{ ['--menu-accent' as string]: menuAccentColor }}
        >
        {/* Busca */}
        <div className="flex items-center gap-2 mb-8">
          <FiSearch className={isTecnico ? 'text-gray-500' : 'text-white/60'} size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar no menu..."
            className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--menu-accent)] focus:border-[color:var(--menu-accent)] transition ${isTecnico ? 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500' : 'bg-white/10 border border-white/20 text-white placeholder-white/50'}`}
          />
        </div>
        {/* Menu */}
        <nav className="flex flex-col gap-1.5 flex-1">
          {!isMounted || !userDataReady ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className={`h-12 rounded-lg animate-pulse ${isTecnico ? 'bg-gray-200' : 'bg-white/10'}`} />
              ))}
            </>
          ) : (
            <>
          {/* Dashboard - técnico vai para dashboard-tecnico */}
          {(podeVer('dashboard') || usuarioData?.nivel === 'atendente') && matchesSearch('Dashboard') && (
            <SidebarButton path={isTecnico ? '/dashboard-tecnico' : '/dashboard'} icon={<FiHome size={22} strokeWidth={1.75} />} label="Dashboard" isActive={isTecnico ? pathname === '/dashboard-tecnico' : pathname === '/dashboard'} menuRecolhido={false} />
          )}
                  {/* Lembretes */}
                  {podeVer('lembretes') && matchesSearch('Lembretes') && (
                    <SidebarButton path="/lembretes" icon={<FiBell size={22} strokeWidth={1.75} />} label="Lembretes" isActive={pathname === '/lembretes'} menuRecolhido={false} />
                  )}
          {podeVer('ordens') && matchesSearch('Ordens de Serviço') && (
            <SidebarButton path="/ordens" icon={<FiFileText size={22} strokeWidth={1.75} />} label="Ordens de Serviço" isActive={pathname === '/ordens'} menuRecolhido={false} />
          )}
          {podeVer('caixa') && (matchesSearch('Caixa') || matchesSearch('Fluxo de Caixa')) && (
            <>
              <SidebarSectionHeader
                icon={<FiDollarSign size={22} strokeWidth={1.75} />}
                label="Caixa"
                expanded={caixaExpanded}
                onToggle={() => setCaixaExpanded(!caixaExpanded)}
              />
              {caixaExpanded && (
                <SidebarSubmenuPanel>
                  {podeVerModulo('movimentacao-caixa', 'financeiro') && (
                    <SidebarButton
                      path="/fluxo-caixa"
                      label="Fluxo de Caixa"
                      isActive={pathname === '/fluxo-caixa'}
                      menuRecolhido={false}
                      isSubmenu
                    />
                  )}
                </SidebarSubmenuPanel>
              )}
            </>
          )}
          {podeVer('clientes') && (matchesSearch('Contatos') || matchesSearch('Clientes') || matchesSearch('Fornecedores')) && (
            <>
              <SidebarSectionHeader
                icon={<FiUsers size={22} strokeWidth={1.75} />}
                label="Contatos"
                expanded={contatosExpanded}
                onToggle={() => setContatosExpanded(!contatosExpanded)}
              />
              {contatosExpanded && (
                <SidebarSubmenuPanel>
                  <SidebarButton path="/clientes" label="Clientes" isActive={pathname === '/clientes'} menuRecolhido={false} isSubmenu />
                  {podeVer('fornecedores') && (
                    <SidebarButton path="/fornecedores" label="Fornecedores" isActive={pathname === '/fornecedores'} menuRecolhido={false} isSubmenu />
                  )}
                </SidebarSubmenuPanel>
              )}
            </>
          )}
          {podeVer('equipamentos') && (matchesSearch('Produtos/Serviços') || matchesSearch('Produtos') || matchesSearch('Categorias') || matchesSearch('Catálogo')) && (
            <>
              <SidebarSectionHeader
                icon={<FiBox size={22} strokeWidth={1.75} />}
                label="Produtos/Serviços"
                expanded={equipamentosExpanded}
                onToggle={() => setEquipamentosExpanded(!equipamentosExpanded)}
              />
              {equipamentosExpanded && (
                <SidebarSubmenuPanel>
                  <SidebarButton path="/equipamentos" label="Produtos" isActive={pathname === '/equipamentos'} menuRecolhido={false} isSubmenu />
                  <SidebarButton path="/equipamentos/categorias" label="Categorias" isActive={pathname === '/equipamentos/categorias'} menuRecolhido={false} isSubmenu />
                  {catalogoHabilitado && podeVer('catalogo') && (
                    <SidebarButton path="/catalogo" label="Catálogo" isActive={pathname === '/catalogo'} menuRecolhido={false} isSubmenu />
                  )}
                </SidebarSubmenuPanel>
              )}
            </>
          )}
          {/* Catálogo independente - se usuário tem permissão de catálogo mas não de equipamentos */}
          {!podeVer('equipamentos') && podeVer('catalogo') && catalogoHabilitado && matchesSearch('Catálogo') && (
            <SidebarButton path="/catalogo" icon={<FiStar size={22} strokeWidth={1.75} />} label="Catálogo" isActive={pathname === '/catalogo'} menuRecolhido={false} />
          )}
          {podeVerModulo('financeiro', 'financeiro') && (matchesSearch('Financeiro') || matchesSearch('Lucro & Desempenho') || matchesSearch('Vendas') || matchesSearch('Movimentações Caixa') || matchesSearch('Contas a Pagar') || matchesSearch('Comissões dos Técnicos')) && (
            <>
              <SidebarSectionHeader
                icon={<FiBarChart size={22} strokeWidth={1.75} />}
                label="Financeiro"
                expanded={financeiroExpanded}
                onToggle={() => setFinanceiroExpanded(!financeiroExpanded)}
              />
              {financeiroExpanded && (
                <SidebarSubmenuPanel>
                  {podeVerModulo('lucro-desempenho', 'financeiro') && (
                    <SidebarButton
                      path="/financeiro/lucro-desempenho"
                      label="Lucro & Desempenho"
                      isActive={pathname === '/financeiro/lucro-desempenho'}
                      menuRecolhido={false}
                      isSubmenu
                    />
                  )}
                  {podeVerModulo('vendas', 'financeiro') && (
                    <SidebarButton
                      path="/financeiro/vendas"
                      label="Vendas"
                      isActive={pathname === '/financeiro/vendas'}
                      menuRecolhido={false}
                      isSubmenu
                    />
                  )}
                  {podeVerModulo('movimentacao-caixa', 'financeiro') && (
                    <SidebarButton
                      path="/financeiro/movimentacoes-caixa"
                      label="Movimentações Caixa"
                      isActive={pathname === '/financeiro/movimentacoes-caixa'}
                      menuRecolhido={false}
                      isSubmenu
                    />
                  )}
                  {podeVerModulo('contas-a-pagar', 'financeiro') && (
                    <SidebarButton
                      path="/financeiro/contas-a-pagar"
                      label="Contas a Pagar"
                      isActive={pathname === '/financeiro/contas-a-pagar'}
                      menuRecolhido={false}
                      isSubmenu
                    />
                  )}
                  {!isTecnico && podeVerModulo('lucro-desempenho', 'financeiro') && (
                    <SidebarButton
                      path="/financeiro/comissoes-tecnicos"
                      label="Comissões dos Técnicos"
                      isActive={pathname === '/financeiro/comissoes-tecnicos'}
                      menuRecolhido={false}
                      isSubmenu
                    />
                  )}
                </SidebarSubmenuPanel>
              )}
            </>
          )}
          {podeVer('bancada') && matchesSearch('Bancada') && (
            <SidebarButton path="/bancada" icon={<FiTool size={22} strokeWidth={1.75} />} label="Bancada" isActive={pathname === '/bancada'} menuRecolhido={false} />
          )}
          {isTecnico && podeVer('comissoes') && matchesSearch('Comissões') && (
            <SidebarButton path="/comissoes" icon={<FiDollarSign size={22} strokeWidth={1.75} />} label="Comissões" isActive={pathname === '/comissoes'} menuRecolhido={false} />
          )}
          {matchesSearch('Suporte') && (
            <SidebarButton path="/suporte" icon={<FiMessageSquare size={22} strokeWidth={1.75} />} label="Suporte" isActive={pathname === '/suporte'} menuRecolhido={false} />
          )}
          {!isTecnico && matchesSearch('Assinatura') && (
            <SidebarButton path="/assinatura" icon={<FiCreditCard size={22} strokeWidth={1.75} />} label="Assinatura" isActive={pathname === '/assinatura'} menuRecolhido={false} />
          )}
          {matchesSearch('Meu Perfil') && (
            <SidebarButton path="/perfil" icon={<FiUsers size={22} strokeWidth={1.75} />} label="Meu Perfil" isActive={pathname === '/perfil'} menuRecolhido={false} />
          )}
          {podeVer('configuracoes') && matchesSearch('Configurações') && (
            <SidebarButton path="/configuracoes" icon={<FiTool size={22} strokeWidth={1.75} />} label="Configurações" isActive={pathname === '/configuracoes' || pathname.startsWith('/configuracoes/')} menuRecolhido={false} />
          )}
          {matchesSearch('Sair') && (
            <SidebarButton path="#logout" icon={<FiLogOut size={22} strokeWidth={1.75} />} label="Sair" isActive={false} menuRecolhido={false} onClick={logout} />
          )}
            </>
          )}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2 pb-2">
          <Image
            src="/assets/imagens/logobranco.png"
            alt="Consert Logo"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            style={isTecnico ? { filter: 'invert(1)' } : undefined}
            priority
          />
          <div className={`text-center text-xs ${isTecnico ? 'text-black' : ''}`} style={!isTecnico ? { color: menuAccentColor } : undefined}>
            v2.7.9
          </div>
        </div>
        
      </aside>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex no-print md:hidden">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          {/* Drawer */}
          <aside className={`relative flex h-screen min-h-0 w-64 flex-col py-8 px-4 animate-slide-in ${isTecnico ? 'bg-white border-r border-gray-200' : 'bg-black border-r border-white/20'}`} style={{ ['--menu-accent' as string]: menuAccentColor }}>
            <SidebarMobileCloseContext.Provider value={() => setMobileMenuOpen(false)}>
            <button className={`absolute top-4 right-4 ${isTecnico ? 'text-gray-900' : 'text-white'}`} onClick={() => setMobileMenuOpen(false)}>
              <FiX size={28} />
            </button>
            <div className="flex items-center gap-2 mb-6">
              <FiSearch className={isTecnico ? 'text-gray-500' : 'text-white/60'} size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar no menu..."
                className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--menu-accent)] focus:border-[color:var(--menu-accent)] transition ${isTecnico ? 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500' : 'bg-white/10 border border-white/20 text-white placeholder-white/50'}`}
              />
            </div>
            <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
              {!isMounted || !userDataReady ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-12 rounded-lg animate-pulse ${isTecnico ? 'bg-gray-200' : 'bg-white/10'}`} />
                  ))}
                </>
              ) : (
                <>
              {/* Dashboard - técnico vai para dashboard-tecnico */}
              {(podeVer('dashboard') || usuarioData?.nivel === 'atendente') && (
                <SidebarButton path={isTecnico ? '/dashboard-tecnico' : '/dashboard'} icon={<FiHome size={22} strokeWidth={1.75} />} label="Dashboard" isActive={isTecnico ? pathname === '/dashboard-tecnico' : pathname === '/dashboard'} menuRecolhido={false} />
              )}
              {/* Lembretes */}
              {podeVer('lembretes') && (
                <SidebarButton path="/lembretes" icon={<FiBell size={22} strokeWidth={1.75} />} label="Lembretes" isActive={pathname === '/lembretes'} menuRecolhido={false} />
              )}
              {podeVer('ordens') && (
                <SidebarButton path="/ordens" icon={<FiFileText size={22} strokeWidth={1.75} />} label="Ordens de Serviço" isActive={pathname === '/ordens'} menuRecolhido={false} />
              )}
              {podeVer('caixa') && (
                <>
                  <SidebarSectionHeader
                    icon={<FiDollarSign size={22} strokeWidth={1.75} />}
                    label="Caixa"
                    expanded={caixaExpanded}
                    onToggle={() => setCaixaExpanded(!caixaExpanded)}
                  />
                  {caixaExpanded && (
                    <SidebarSubmenuPanel>
                      {podeVerModulo('movimentacao-caixa', 'financeiro') && (
                        <SidebarButton
                          path="/fluxo-caixa"
                          label="Fluxo de Caixa"
                          isActive={pathname === '/fluxo-caixa'}
                          menuRecolhido={false}
                          isSubmenu
                        />
                      )}
                    </SidebarSubmenuPanel>
                  )}
                </>
              )}
              {podeVer('clientes') && (
                <>
                  <SidebarSectionHeader
                    icon={<FiUsers size={22} strokeWidth={1.75} />}
                    label="Contatos"
                    expanded={contatosExpanded}
                    onToggle={() => setContatosExpanded(!contatosExpanded)}
                  />
                  {contatosExpanded && (
                    <SidebarSubmenuPanel>
                      <SidebarButton path="/clientes" label="Clientes" isActive={pathname === '/clientes'} menuRecolhido={false} isSubmenu />
                      {podeVer('fornecedores') && (
                        <SidebarButton path="/fornecedores" label="Fornecedores" isActive={pathname === '/fornecedores'} menuRecolhido={false} isSubmenu />
                      )}
                    </SidebarSubmenuPanel>
                  )}
                </>
              )}
              {podeVer('equipamentos') && (
                <>
                  <SidebarSectionHeader
                    icon={<FiBox size={22} strokeWidth={1.75} />}
                    label="Produtos/Serviços"
                    expanded={equipamentosExpanded}
                    onToggle={() => setEquipamentosExpanded(!equipamentosExpanded)}
                  />
                  {equipamentosExpanded && (
                    <SidebarSubmenuPanel>
                      <SidebarButton path="/equipamentos" label="Produtos" isActive={pathname === '/equipamentos'} menuRecolhido={false} isSubmenu />
                      <SidebarButton path="/equipamentos/categorias" label="Categorias" isActive={pathname === '/equipamentos/categorias'} menuRecolhido={false} isSubmenu />
                      {catalogoHabilitado && podeVer('catalogo') && (
                        <SidebarButton path="/catalogo" label="Catálogo" isActive={pathname === '/catalogo'} menuRecolhido={false} isSubmenu />
                      )}
                    </SidebarSubmenuPanel>
                  )}
                </>
              )}
              {!podeVer('equipamentos') && podeVer('catalogo') && catalogoHabilitado && matchesSearch('Catálogo') && (
                <SidebarButton path="/catalogo" icon={<FiStar size={22} strokeWidth={1.75} />} label="Catálogo" isActive={pathname === '/catalogo'} menuRecolhido={false} />
              )}
              {podeVerModulo('financeiro', 'financeiro') && (
                <>
                  <SidebarSectionHeader
                    icon={<FiBarChart size={22} strokeWidth={1.75} />}
                    label="Financeiro"
                    expanded={financeiroExpanded}
                    onToggle={() => setFinanceiroExpanded(!financeiroExpanded)}
                  />
                  {financeiroExpanded && (
                    <SidebarSubmenuPanel>
                      {podeVerModulo('lucro-desempenho', 'financeiro') && (
                        <SidebarButton
                          path="/financeiro/lucro-desempenho"
                          label="Lucro & Desempenho"
                          isActive={pathname === '/financeiro/lucro-desempenho'}
                          menuRecolhido={false}
                          isSubmenu
                        />
                      )}
                      {podeVerModulo('vendas', 'financeiro') && (
                        <SidebarButton
                          path="/financeiro/vendas"
                          label="Vendas"
                          isActive={pathname === '/financeiro/vendas'}
                          menuRecolhido={false}
                          isSubmenu
                        />
                      )}
                      {podeVerModulo('movimentacao-caixa', 'financeiro') && (
                        <SidebarButton
                          path="/financeiro/movimentacoes-caixa"
                          label="Movimentações Caixa"
                          isActive={pathname === '/financeiro/movimentacoes-caixa'}
                          menuRecolhido={false}
                          isSubmenu
                        />
                      )}
                      {podeVerModulo('contas-a-pagar', 'financeiro') && (
                        <SidebarButton
                          path="/financeiro/contas-a-pagar"
                          label="Contas a Pagar"
                          isActive={pathname === '/financeiro/contas-a-pagar'}
                          menuRecolhido={false}
                          isSubmenu
                        />
                      )}
                      {!isTecnico && podeVerModulo('lucro-desempenho', 'financeiro') && (
                        <SidebarButton
                          path="/financeiro/comissoes-tecnicos"
                          label="Comissões dos Técnicos"
                          isActive={pathname === '/financeiro/comissoes-tecnicos'}
                          menuRecolhido={false}
                          isSubmenu
                        />
                      )}
                    </SidebarSubmenuPanel>
                  )}
                </>
              )}
              {podeVer('bancada') && (
                <SidebarButton path="/bancada" icon={<FiTool size={22} strokeWidth={1.75} />} label="Bancada" isActive={pathname === '/bancada'} menuRecolhido={false} />
              )}
              {isTecnico && podeVer('comissoes') && (
                <SidebarButton path="/comissoes" icon={<FiDollarSign size={22} strokeWidth={1.75} />} label="Comissões" isActive={pathname === '/comissoes'} menuRecolhido={false} />
              )}
              <SidebarButton path="/suporte" icon={<FiMessageSquare size={22} strokeWidth={1.75} />} label="Suporte" isActive={pathname === '/suporte'} menuRecolhido={false} />
              {!isTecnico && (
                <SidebarButton path="/assinatura" icon={<FiCreditCard size={22} strokeWidth={1.75} />} label="Assinatura" isActive={pathname === '/assinatura'} menuRecolhido={false} />
              )}
              <SidebarButton path="/perfil" icon={<FiUsers size={22} strokeWidth={1.75} />} label="Meu Perfil" isActive={pathname === '/perfil'} menuRecolhido={false} />
              {podeVer('configuracoes') && (
                <SidebarButton path="/configuracoes" icon={<FiTool size={22} strokeWidth={1.75} />} label="Configurações" isActive={pathname === '/configuracoes' || pathname.startsWith('/configuracoes/')} menuRecolhido={false} />
              )}
              <SidebarButton
                path="#logout"
                icon={<FiLogOut size={22} strokeWidth={1.75} />}
                label="Sair"
                isActive={false}
                menuRecolhido={false}
                onClick={logout}
              />
                </>
              )}
            </nav>
            <div className={`mt-auto text-center text-xs pb-4 ${isTecnico ? 'text-black' : ''}`} style={!isTecnico ? { color: menuAccentColor } : undefined}>
              v2.7.9
            </div>
            </SidebarMobileCloseContext.Provider>
          </aside>
        </div>
      )}
      {/* Main area - largura limitada para não cortar à direita (sidebar 16rem = 256px) */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 min-w-0 bg-white dark:bg-zinc-900 ${isNovaOSFullScreen ? 'md:ml-0 w-full md:max-w-full' : 'ml-0 w-full md:ml-64 md:max-w-[calc(100vw-16rem)]'}`}>
        {/* TopHeader - oculto na tela cheia de Nova OS (só fica o botão Voltar na própria página) */}
        {!isNovaOSFullScreen && (
        <header className="w-full h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 no-print">
          {/* Esquerda: botão menu mobile + logo da empresa */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-zinc-700 dark:text-zinc-300 p-2 -ml-2">
              <FiMenu size={24} />
            </button>
            <div className="h-9 flex items-center shrink-0" style={{ minWidth: 0 }}>
              {!userDataReady ? (
                <div className="h-9 w-24 rounded bg-zinc-200 animate-pulse" aria-hidden />
              ) : empresaLogoUrl ? (
                <img
                  src={empresaLogoUrl}
                  alt={empresaData?.nome || 'Logo da empresa'}
                  className="h-9 w-auto max-w-[160px] md:max-w-[180px] object-contain object-left"
                />
              ) : (
                <Image
                  src={theme === 'dark' ? '/assets/imagens/logobranco.png' : '/assets/imagens/logopreto.png'}
                  alt="Consert"
                  width={120}
                  height={36}
                  className="h-9 w-auto object-contain object-left"
                  priority
                />
              )}
            </div>
            {isTecnico && (
              <span className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 hidden sm:block ml-2 truncate">
                Área do técnico
              </span>
            )}
          </div>
          
          {/* Área direita - Usuário e notificações */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Toggle modo escuro - desativado temporariamente */}
            {/* <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            >
              {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button> */}
            {/* Status da assinatura - oculto em mobile */}
            <div className="hidden md:block">
              <SubscriptionStatus />
            </div>
            
            {/* Avatar e nome do usuário */}
            <div className="flex items-center gap-2">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
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
              <span className="text-zinc-700 dark:text-zinc-300 text-sm font-medium hidden sm:block">{usuarioData?.nome || 'Usuário'}</span>
            </div>
            
            {/* Notificações */}
            <div className="relative">
              <div className="relative">
                <FiBell
                  className={`${
                    notificacoesTickets.length > 0 
                      ? 'text-red-500 hover:text-red-600' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-lime-500 dark:hover:text-lime-400'
                  } cursor-pointer transition-colors`}
                  size={20}
                  onClick={() => setShowNotifications(!showNotifications)}
                />
                {notificacoesTickets.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full">
                    {notificacoesTickets.length > 9 ? '9+' : notificacoesTickets.length}
                  </span>
                )}
              </div>
              {showNotifications && (
                <div className="absolute right-0 top-8 w-80 z-50 max-h-96 overflow-y-auto">
                  <div className="bg-white dark:bg-zinc-800 text-black dark:text-zinc-100 rounded-xl shadow-xl p-4 border border-black/10 dark:border-zinc-600">
                    <h4 className="font-semibold text-sm mb-3">Notificações</h4>
                    {notificacoesTickets.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4 text-center">Nenhuma notificação</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {notificacoesTickets.map((notif) => (
                          <li 
                            key={notif.id} 
                            className={`border-b border-gray-200 pb-2 last:border-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors ${
                              !notif.lida ? 'bg-red-50 border-l-4 border-l-red-500' : ''
                            }`}
                            onClick={() => {
                              // Marcar como lida ao clicar
                              if (!notif.lida) {
                                marcarNotificacaoLida(notif.id);
                              }
                              router.push('/suporte');
                              setShowNotifications(false);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-base flex-shrink-0">
                                {notif.tipo === 'ticket_resposta' ? '📩' : 
                                 notif.tipo === 'ticket_status' ? '🔄' : 
                                 notif.tipo === 'ticket_comentario' ? '💬' : '📋'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`${!notif.lida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                  {notif.mensagem}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(notif.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              {!notif.lida && (
                                <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        )}
        {/* Banner de Avisos - oculto na tela cheia de Nova OS para mais espaço */}
        {!isNovaOSFullScreen && (
          <div className="w-full sticky top-16 z-20 space-y-2 no-print">
            <AvisosBanner />
            <FinanceiroAlertsBanner />
          </div>
        )}
        {/* Conteúdo principal - min-w-0 para permitir scroll horizontal em tabelas em qualquer resolução */}
        <main className={`flex-1 w-full min-w-0 ${isNovaOSFullScreen ? 'pb-6 pt-0 px-0' : 'pb-6 px-4 md:px-6 pt-6'}`}>
          <div className="w-full min-w-0 max-w-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Tela de Logout */}
      {isLoggingOut && <LogoutScreen />}
      
      
    </div>
    </MenuAccentContext.Provider>
  );
}

function SidebarButton({
  path,
  icon,
  label,
  isActive,
  onClick,
  menuRecolhido,
  isSubmenu = false,
}: {
  path: string;
  icon?: ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  menuRecolhido: boolean;
  isSubmenu?: boolean;
}) {
  const router = useRouter();
  const { accentColor, inverted } = useContext(MenuAccentContext);
  const closeMobileDrawer = useContext(SidebarMobileCloseContext);

  const handleClick = () => {
    if (onClick) {
      onClick();
      closeMobileDrawer?.();
    } else if (path && path !== '#' && !path.startsWith('#')) {
      router.push(path);
      closeMobileDrawer?.();
    }
  };

  const inactiveMain = inverted ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-white/10';
  const inactiveSub = inverted
    ? 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
    : 'text-white/65 hover:bg-white/[0.06] hover:text-white/95';

  const activeBg = inverted ? 'bg-gray-100' : 'bg-white/[0.12]';
  const activeText = inverted ? 'text-gray-900' : 'text-white';

  const rowClass = [
    'relative flex items-center justify-start w-full min-w-0 rounded-lg transition font-medium text-left min-h-[48px]',
    isSubmenu ? 'text-sm py-2.5 px-3' : 'text-[15px] py-2.5 px-3',
    isActive ? `${activeBg} ${activeText}` : isSubmenu ? inactiveSub : inactiveMain,
  ].join(' ');

  return (
    <button onClick={handleClick} className={rowClass} title={label} type="button">
      {isActive && (
        <span
          className="absolute left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full pointer-events-none"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
      )}
      <span className={`flex min-w-0 flex-1 items-center gap-3 ${menuRecolhido ? 'justify-center' : ''} ${isActive ? 'pl-2' : ''}`}>
        {isSubmenu ? (
          <span
            className={`shrink-0 rounded-full w-1.5 h-1.5 ${
              isActive
                ? inverted
                  ? 'bg-gray-900'
                  : 'bg-white'
                : inverted
                  ? 'bg-gray-400'
                  : 'bg-white/45'
            }`}
            aria-hidden
          />
        ) : (
          <span
            className="shrink-0 flex size-[22px] items-center justify-center text-current [&_svg]:size-[22px] [&_svg]:shrink-0"
            aria-hidden
          >
            {icon}
          </span>
        )}
        {!menuRecolhido && <span className="min-w-0 truncate">{label}</span>}
      </span>
    </button>
  );
}

// Função de upload de foto movida para dentro do componente