'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  APP_BANNER_STORAGE_KEY,
  APP_ICON_PATH,
  APP_STORE_URL,
  isIOSDevice,
} from '@/config/appStore';

function shouldShowBanner() {
  if (typeof window === 'undefined') return false;

  // iOS: Smart App Banner nativo (layout.tsx) — sabe se o app já está instalado
  if (isIOSDevice()) return false;

  try {
    if (localStorage.getItem(APP_BANNER_STORAGE_KEY) === '1') return false;
  } catch {
    // ignore
  }

  if (window.matchMedia('(display-mode: standalone)').matches) return false;

  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isMobileViewport = window.innerWidth < 1024;

  return isAndroid || isMobileViewport;
}

type AppStoreBannerProps = {
  className?: string;
  placement?: 'login' | 'app';
};

export default function AppStoreBanner({ className = '', placement = 'app' }: AppStoreBannerProps) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVisible(shouldShowBanner());
    setReady(true);
  }, []);

  // Evita flash antes de detectar iOS
  if (!ready || !visible) return null;

  const isLogin = placement === 'login';

  const banner = (
    <div
      className={`${isLogin ? 'fixed top-0 left-0 right-0 z-[100]' : 'w-full'} ${className}`}
      role="region"
      aria-label="Baixar app Gestão Consert"
    >
      <div
        className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 border-b backdrop-blur-md ${
          isLogin
            ? 'bg-black/90 border-white/10 text-white'
            : 'bg-zinc-900 dark:bg-zinc-950 border-zinc-800 text-white'
        }`}
      >
        <Image
          src={APP_ICON_PATH}
          alt=""
          width={44}
          height={44}
          className="rounded-[10px] shrink-0 shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">Gestão Consert</p>
          <p className="text-[11px] sm:text-xs text-white/55 leading-snug truncate">
            App gratuito na App Store para iPhone
          </p>
        </div>

        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#D1FE6E] text-black text-xs font-semibold hover:bg-[#B8E55A] transition-colors"
        >
          App Store
        </a>

        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(APP_BANNER_STORAGE_KEY, '1');
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          aria-label="Fechar aviso do app"
          className="shrink-0 p-1.5 rounded-full text-white/45 hover:text-white hover:bg-white/10 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  if (isLogin) {
    return (
      <>
        {banner}
        <div className="h-[57px] sm:h-[61px] shrink-0" aria-hidden />
      </>
    );
  }

  return banner;
}
