'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Calculator, MessagesSquare, Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isPublicPath } from '@/config/publicPaths';
import PricingCalculatorModal from '@/components/PricingCalculatorModal';
import SupportWhatsAppModal from '@/components/SupportWhatsAppModal';

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin-login') || pathname.startsWith('/admin-saas');
}

/** Telas com campo de envio fixo no rodapé, onde o botão flutuante cobriria o botão de enviar */
function isChatRoute(pathname: string): boolean {
  return pathname.startsWith('/whatsapp');
}

type SpeedAction = {
  id: string;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  className: string;
  badge?: number;
  icon: ReactNode;
};

export default function FloatingActionsMenu() {
  const pathname = usePathname() || '';
  const { session, usuarioData } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [suporteOpen, setSuporteOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const visivel =
    !!session &&
    !!usuarioData &&
    !isPublicPath(pathname) &&
    !isAdminRoute(pathname) &&
    !isChatRoute(pathname);

  useEffect(() => {
    const onUnread = (e: Event) => {
      const ce = e as CustomEvent<{ total?: number }>;
      setChatUnread(typeof ce.detail?.total === 'number' ? ce.detail.total : 0);
    };
    window.addEventListener('os-chat-unread', onUnread as EventListener);
    return () => window.removeEventListener('os-chat-unread', onUnread as EventListener);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const openChat = useCallback(() => {
    closeMenu();
    window.dispatchEvent(new CustomEvent('os-chat-toggle-inbox'));
  }, [closeMenu]);

  const openCalculator = useCallback(() => {
    closeMenu();
    setCalcOpen(true);
  }, [closeMenu]);

  const openWhatsApp = useCallback(() => {
    closeMenu();
    setSuporteOpen(true);
  }, [closeMenu]);

  if (!visivel) return null;

  const actions: SpeedAction[] = [
    {
      id: 'chat',
      label: 'Chat interno',
      ariaLabel: 'Abrir chats internos das O.S.',
      onClick: openChat,
      className: 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-white/90',
      badge: chatUnread,
      icon: <MessagesSquare className="h-5 w-5" strokeWidth={2.25} />,
    },
    {
      id: 'calc',
      label: 'Calculadora',
      ariaLabel: 'Abrir calculadora de precificação',
      onClick: openCalculator,
      className: 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-white/90',
      icon: <Calculator className="h-5 w-5" strokeWidth={2.25} />,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp suporte',
      ariaLabel: 'Abrir WhatsApp de suporte',
      onClick: openWhatsApp,
      className: 'bg-[#25D366] hover:bg-[#1ebe57] text-white ring-2 ring-white/90',
      icon: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/icons/whatsapp.png"
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] object-contain brightness-0 invert"
          draggable={false}
        />
      ),
    },
  ];

  return (
    <>
      {menuOpen ? (
        <button
          type="button"
          aria-label="Fechar menu de atalhos"
          className="fixed inset-0 z-[56] bg-black/45 backdrop-blur-[1px]"
          onClick={closeMenu}
        />
      ) : null}

      <div
        ref={rootRef}
        className="fixed bottom-5 right-5 z-[57] flex flex-col items-end gap-3 max-sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-sm:right-4"
      >
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ${
            menuOpen
              ? 'pointer-events-auto opacity-100 translate-y-0'
              : 'pointer-events-none opacity-0 translate-y-2'
          }`}
          aria-hidden={!menuOpen}
        >
          {actions.map((action, index) => (
            <div
              key={action.id}
              className="flex items-center gap-2.5"
              style={{
                transitionDelay: menuOpen ? `${(actions.length - 1 - index) * 40}ms` : '0ms',
              }}
            >
              <span className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-lg whitespace-nowrap">
                {action.label}
              </span>
              <button
                type="button"
                onClick={action.onClick}
                tabIndex={menuOpen ? 0 : -1}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95 ${action.className}`}
                aria-label={action.ariaLabel}
                title={action.label}
              >
                {action.icon}
                {action.badge && action.badge > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {action.badge > 9 ? '9+' : action.badge}
                  </span>
                ) : null}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-all hover:scale-105 active:scale-95 ring-2 ring-white/80 ${
            menuOpen ? 'bg-slate-700 hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          aria-label={menuOpen ? 'Fechar menu de atalhos' : 'Abrir menu de atalhos'}
          aria-expanded={menuOpen}
          title="Atalhos"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          {!menuOpen && chatUnread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {chatUnread > 9 ? '9+' : chatUnread}
            </span>
          ) : null}
        </button>
      </div>

      <PricingCalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />
      <SupportWhatsAppModal isOpen={suporteOpen} onClose={() => setSuporteOpen(false)} />
    </>
  );
}
