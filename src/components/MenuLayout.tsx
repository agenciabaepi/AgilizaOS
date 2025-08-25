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
  FiMenu,
  FiX,
  FiGrid,
  FiTruck,
  FiStar,
  FiMessageCircle,
} from 'react-icons/fi';
import { Toaster } from 'react-hot-toast';
import { supabase, forceLogout } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import LogoutScreen from '@/components/LogoutScreen';
import { useWhatsAppNotification } from '@/hooks/useWhatsAppNotification';
import { useLogout } from '@/hooks/useLogout';
// import TestFeatureFlags from './TestFeatureFlags'; // Removido
import DebugAuth from './DebugAuth';

// Import direto para debug
import * as FeatureFlags from '@/config/featureFlags';

// Funções locais como fallback
const isUsuarioTesteLocal = (usuario: any) => {
  console.log('🔍 isUsuarioTesteLocal chamada com:', usuario);
  return usuario?.nivel === 'usuarioteste';
};

const podeUsarFuncionalidadeLocal = (usuario: any, nomeFuncionalidade: string) => {
  console.log('🔍 podeUsarFuncionalidadeLocal chamada com:', usuario, nomeFuncionalidade);
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

  // ✅ OTIMIZADO: Debug reduzido para melhorar performance
  useEffect(() => {
    if (empresaData?.id) {
      console.log('🔍 MenuLayout: Empresa ID carregado:', empresaData.id);
    }
  }, [empresaData?.id]);

  // DEBUG: Verificar feature flags
  useEffect(() => {
    if (usuarioData) {
      console.log('🔍 DEBUG - usuarioData:', usuarioData);
      console.log('🔍 DEBUG - nivel:', usuarioData.nivel);
      console.log('🔍 DEBUG - isUsuarioTeste:', FeatureFlags.isUsuarioTeste ? FeatureFlags.isUsuarioTeste(usuarioData) : isUsuarioTesteLocal(usuarioData));
      console.log('🔍 DEBUG - podeUsarFuncionalidade conversas:', FeatureFlags.podeUsarFuncionalidade ? FeatureFlags.podeUsarFuncionalidade(usuarioData, "conversas_whatsapp") : podeUsarFuncionalidadeLocal(usuarioData, "conversas_whatsapp"));
      
      // Teste direto
      console.log('🔍 TESTE DIRETO - usuarioData?.nivel === "usuarioteste":', usuarioData?.nivel === 'usuarioteste');
      console.log('🔍 TESTE DIRETO - String(usuarioData?.nivel):', String(usuarioData?.nivel));
      console.log('🔍 TESTE DIRETO - typeof usuarioData?.nivel:', typeof usuarioData?.nivel);
    } else {
      console.log('🔍 DEBUG - usuarioData é null/undefined');
    }
  }, [usuarioData]);

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  // ✅ VERSÃO SIMPLIFICADA: Pular carregamento de configurações para debug
  useEffect(() => {
    console.log('🔍 MenuLayout: PULANDO carregamento de configurações para debug');
    return;
    
    (async () => {
      try {
        if (!empresaData?.id) return;
        const { data } = await supabase
          .from('configuracoes_empresa')
          .select('catalogo_habilitado')
          .eq('empresa_id', empresaData.id)
          .single();
        if (data && typeof data.catalogo_habilitado === 'boolean') {
          setCatalogoHabilitado(data.catalogo_habilitado);
        }
      } catch {}
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
    // Expandir automaticamente se estiver na página de categorias
    if (pathname === '/equipamentos/categorias') {
      setEquipamentosExpanded(true);
    }
    // Expandir automaticamente se estiver nas páginas de contatos
    if (pathname === '/clientes' || pathname === '/fornecedores') {
      setContatosExpanded(true);
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
      console.log(`🔍 podeVer(${area}) - usuário de teste, retornando TRUE`);
      return true; // ✅ Acesso total garantido
    }
    
    // Técnicos sempre podem ver dashboard
    if (area === 'dashboard' && usuarioData?.nivel === 'tecnico') {
      return true;
    }
    
    const resultado = usuarioData?.nivel === 'admin' || usuarioData?.permissoes?.includes(area);
    console.log(`🔍 podeVer(${area}) - resultado: ${resultado}`);
    return resultado;
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
            <Image src={logobranco} alt="Consert Logo" className="h-12 w-auto object-contain" />
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
          {/* Dashboard - Mostrar dashboard do técnico se for técnico, senão dashboard admin */}
          {(podeVer('dashboard') || usuarioData?.nivel === 'tecnico' || usuarioData?.nivel === 'atendente') && (
            usuarioData?.nivel === 'tecnico' ? (
              <SidebarButton path="/dashboard-tecnico" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard-tecnico'} menuRecolhido={menuRecolhidoFinal} />
            ) : usuarioData?.nivel === 'atendente' ? (
              <SidebarButton path="/dashboard-atendente" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard-atendente'} menuRecolhido={menuRecolhidoFinal} />
            ) : (
              <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} menuRecolhido={menuRecolhidoFinal} />
            )
          )}
          {podeVer('lembretes') && (
            <SidebarButton path="/lembretes" icon={<FiFileText size={20} />} label="Lembretes" isActive={pathname === '/lembretes'} menuRecolhido={menuRecolhidoFinal} />
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
                  {podeVer('vendas') && (
                    <SidebarButton path="/financeiro/vendas" icon={<FiFileText size={18} />} label="Vendas" isActive={pathname === '/financeiro/vendas'} menuRecolhido={menuRecolhido} />
                  )}
                  {podeVer('movimentacao-caixa') && (
                    <SidebarButton path="/movimentacao-caixa" icon={<FiDollarSign size={18} />} label="Movimentações Caixa" isActive={pathname === '/movimentacao-caixa'} menuRecolhido={menuRecolhido} />
                  )}
                  {podeVer('contas-a-pagar') && (
                    <SidebarButton path="/financeiro/contas-a-pagar" icon={<FiFileText size={18} />} label="Contas a Pagar" isActive={pathname === '/financeiro/contas-a-pagar'} menuRecolhido={menuRecolhido} />
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
          {podeVer('termos') && (
            <SidebarButton path="#" icon={<FiFileText size={20} />} label="Termos" isActive={pathname === '/termos'} menuRecolhido={menuRecolhido} />
          )}
          <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" isActive={pathname === '/perfil'} menuRecolhido={menuRecolhido} />
          {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
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
              <Image src={logobranco} alt="Consert Logo" className="h-12 w-auto object-contain" />
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
              {/* Dashboard - Mostrar dashboard específico baseado no nível do usuário */}
              {(podeVer('dashboard') || usuarioData?.nivel === 'tecnico' || usuarioData?.nivel === 'atendente') && (
                usuarioData?.nivel === 'tecnico' ? (
                  <SidebarButton path="/dashboard-tecnico" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard-tecnico'} menuRecolhido={menuRecolhido || false} />
                ) : usuarioData?.nivel === 'atendente' ? (
                  <SidebarButton path="/dashboard-atendente" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard-atendente'} menuRecolhido={menuRecolhido || false} />
                ) : (
                  <SidebarButton path="/dashboard" icon={<FiHome size={20} />} label="Dashboard" isActive={pathname === '/dashboard'} menuRecolhido={menuRecolhido || false} />
                )
              )}
              {podeVer('lembretes') && (
                <SidebarButton path="/lembretes" icon={<FiFileText size={20} />} label="Lembretes" isActive={pathname === '/lembretes'} menuRecolhido={menuRecolhido || false} />
              )}
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
                  
                  {financeiroExpanded && (
                    <div className="ml-6 flex flex-col gap-1 mt-1">
                      {podeVer('vendas') && (
                        <SidebarButton path="/financeiro/vendas" icon={<FiFileText size={18} />} label="Vendas" isActive={pathname === '/financeiro/vendas'} menuRecolhido={menuRecolhido} />
                      )}
                      {podeVer('movimentacao-caixa') && (
                        <SidebarButton path="/financeiro/movimentacoes-caixa" icon={<FiDollarSign size={18} />} label="Movimentações Caixa" isActive={pathname === '/financeiro/movimentacoes-caixa'} menuRecolhido={menuRecolhido} />
                      )}
                      {podeVer('contas-a-pagar') && (
                        <SidebarButton path="/financeiro/contas-a-pagar" icon={<FiFileText size={18} />} label="Contas a Pagar" isActive={pathname === '/financeiro/contas-a-pagar'} menuRecolhido={menuRecolhido} />
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
              {podeVer('termos') && (
                <SidebarButton path="#" icon={<FiFileText size={20} />} label="Termos" isActive={false} menuRecolhido={menuRecolhido} />
              )}
              <SidebarButton path="/perfil" icon={<FiUsers size={20} />} label="Meu Perfil" isActive={pathname === '/perfil'} menuRecolhido={menuRecolhido} />
                        {podeVer('configuracoes') && usuarioData?.nivel !== 'atendente' && (
            <SidebarButton path="/configuracoes" icon={<FiTool size={20} />} label="Configurações" isActive={pathname === '/configuracoes'} menuRecolhido={menuRecolhido} />
          )}
          
          {/* Funcionalidades de teste para usuários de teste */}
          {/* DEBUG: Mostrar sempre para ver se está funcionando */}
          <div className="border-t border-white/20 my-2"></div>
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 DEBUG - Nível: ${usuarioData?.nivel || 'N/A'}`}
          </div>
          
          {/* Status das Feature Flags - Sempre visível */}
          <div className={`px-3 py-2 text-xs font-medium ${menuRecolhido ? 'text-center' : ''} ${
            usuarioData?.nivel === 'usuarioteste' ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {!menuRecolhido && `🔬 FEATURE FLAGS: ${usuarioData?.nivel === 'usuarioteste' ? 'ATIVADO' : 'DESATIVADO'}`}
          </div>
          
          {/* DEBUG: Teste direto */}
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 TESTE DIRETO: ${usuarioData?.nivel === 'usuarioteste' ? 'TRUE' : 'FALSE'}`}
          </div>
          
          {/* DEBUG: Teste da função */}
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 FUNÇÃO isUsuarioTeste: ${isUsuarioTesteLocal(usuarioData) ? 'TRUE' : 'FALSE'}`}
          </div>
          
          {/* DEBUG: Teste da função podeUsarFuncionalidade */}
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 FUNÇÃO podeUsarFuncionalidade: ${podeUsarFuncionalidadeLocal(usuarioData, "conversas_whatsapp") ? 'TRUE' : 'FALSE'}`}
          </div>
          
          {/* DEBUG: Teste direto das funções locais */}
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 TESTE LOCAL - isUsuarioTesteLocal: ${isUsuarioTesteLocal(usuarioData) ? 'TRUE' : 'FALSE'}`}
          </div>
          
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 TESTE LOCAL - podeUsarFuncionalidadeLocal: ${podeUsarFuncionalidadeLocal(usuarioData, "conversas_whatsapp") ? 'TRUE' : 'FALSE'}`}
          </div>
          
          {/* DEBUG: Teste simples de renderização */}
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 TESTE SIMPLES - usuarioData?.nivel: ${usuarioData?.nivel || 'N/A'}`}
          </div>
          
          <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
            {!menuRecolhido && `🔍 TESTE SIMPLES - usuarioData?.nivel === 'usuarioteste': ${usuarioData?.nivel === 'usuarioteste' ? 'TRUE' : 'FALSE'}`}
          </div>
          
          {isUsuarioTesteLocal(usuarioData) && (
            <>
              <div className={`px-3 py-2 text-xs font-medium text-white/60 ${menuRecolhido ? 'text-center' : ''}`}>
                {!menuRecolhido && "🔬 USUÁRIO DE TESTE - ACESSO TOTAL"}
              </div>
              
              {podeUsarFuncionalidadeLocal(usuarioData, "conversas_whatsapp") && (
                <SidebarButton 
                  path="/teste/conversas-whatsapp" 
                  icon={<FiMessageCircle size={20} />} 
                  label="Conversas WhatsApp" 
                  isActive={pathname === '/teste/conversas-whatsapp'} 
                  menuRecolhido={menuRecolhido} 
                />
              )}
              
              {podeUsarFuncionalidadeLocal(usuarioData, "relatorio_novo") && (
                <SidebarButton 
                  path="/teste/relatorio-novo" 
                  icon={<FiFileText size={20} />} 
                  label="Relatório Novo" 
                  isActive={pathname === '/teste/relatorio-novo'} 
                  menuRecolhido={menuRecolhido} 
                />
              )}
              
              {podeUsarFuncionalidadeLocal(usuarioData, "dashboard_avancado") && (
                <SidebarButton 
                  path="/teste/dashboard-avancado" 
                  icon={<FiGrid size={20} />} 
                  label="Dashboard Avançado" 
                  isActive={pathname === '/teste/dashboard-avancado'} 
                  menuRecolhido={menuRecolhido} 
                />
              )}
            </>
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
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${menuRecolhido ? 'ml-16' : 'ml-64'}`}>
        {/* TopHeader */}
        <header className="w-full h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 sticky top-0 z-30 no-print">
          {/* Botão menu mobile */}
          <div className="md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="text-zinc-700">
              <FiMenu size={28} />
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
                // Ícone hambúrguer
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                // Ícone seta esquerda
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <SubscriptionStatus />
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
                  className="rounded-full border-2 border-lime-400 object-contain w-8 h-8"
                />
              ) : (
                <div className="rounded-full border-2 border-lime-400 bg-lime-200 w-8 h-8 flex items-center justify-center">
                  <span className="text-base font-bold text-lime-700">
                    {usuarioData?.nome?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="text-zinc-700 text-sm font-medium">{usuarioData?.nome || 'Usuário'}</span>
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
      
      {/* Tela de Logout */}
      {isLoggingOut && <LogoutScreen />}
      
      {/* Componente de teste temporário removido */}
      {/* <DebugAuth /> */}
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

// Função de upload de foto movida para dentro do componente