'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isPublicPath } from '@/config/publicPaths';
import PricingCalculatorModal from '@/components/PricingCalculatorModal';
import { Calculator } from 'lucide-react';

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin-login') || pathname.startsWith('/admin-saas');
}

export default function PricingCalculatorFAB() {
  const pathname = usePathname() || '';
  const { session, usuarioData } = useAuth();
  const [open, setOpen] = useState(false);

  const visivel =
    !!session &&
    !!usuarioData &&
    !isPublicPath(pathname) &&
    !isAdminRoute(pathname);

  if (!visivel) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all"
        aria-label="Abrir calculadora de precificação"
        title="Calculadora de precificação"
      >
        <Calculator size={22} />
      </button>

      <PricingCalculatorModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
