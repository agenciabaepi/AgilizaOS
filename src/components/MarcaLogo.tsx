'use client';

import type { ReactNode } from 'react';
import { FiGrid } from 'react-icons/fi';

/** Normaliza slug/nome para casar com logos conhecidos. */
function keyFrom(slug?: string | null, nome?: string | null): string {
  const raw = (slug || nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (raw.includes('iphone') || raw.includes('apple') || raw === 'ios') return 'apple';
  if (raw.includes('samsung') || raw.includes('galaxy')) return 'samsung';
  if (raw.includes('motorola') || raw.includes('moto')) return 'motorola';
  if (raw.includes('xiaomi') || raw.includes('redmi') || raw.includes('poco')) return 'xiaomi';
  if (raw.includes('huawei') || raw.includes('honor')) return 'huawei';
  if (raw === 'lg') return 'lg';
  if (raw.includes('asus') || raw.includes('zenfone') || raw.includes('rog')) return 'asus';
  if (raw.includes('google') || raw.includes('pixel')) return 'google';
  if (raw.includes('sony') || raw.includes('xperia')) return 'sony';
  if (raw.includes('nokia')) return 'nokia';
  if (raw.includes('oneplus')) return 'oneplus';
  if (raw.includes('realme')) return 'realme';
  if (raw.includes('oppo')) return 'oppo';
  if (raw.includes('vivo')) return 'vivo';
  return raw;
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function SamsungLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2.2c4.3 0 7.8 3.5 7.8 7.8s-3.5 7.8-7.8 7.8S4.2 16.3 4.2 12 7.7 4.2 12 4.2zm-4.1 5.3h8.2c.6 0 1.1.5 1.1 1.1v4.8c0 .6-.5 1.1-1.1 1.1H7.9c-.6 0-1.1-.5-1.1-1.1V10.6c0-.6.5-1.1 1.1-1.1zm1.1 1.8v3.4h6v-3.4h-6z" />
    </svg>
  );
}

function MotorolaLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2L4.5 6.5v11L12 22l7.5-4.5v-11L12 2zm0 2.3l5.5 3.3v8.8L12 19.7l-5.5-3.3V7.6L12 4.3zM9.2 9.2v5.6l2.8 1.7V10.9L9.2 9.2zm5.6 0L12 10.9v5.6l2.8-1.7V9.2z" />
    </svg>
  );
}

function XiaomiLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4 4h7.2c3.8 0 6.8 3 6.8 6.8v2.4H12.4V20H4V4zm2.8 2.8v10.4h2.8v-5.2h2.8c2.2 0 4-1.8 4-4s-1.8-4-4-4H6.8zm5.6 2.8h1.2c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2h-1.2V9.6zM19.2 12.4H22V20h-2.8v-7.6z" />
    </svg>
  );
}

function GenericLetter({ letter, className }: { letter: string; className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className || ''}`} aria-hidden>
      {letter}
    </span>
  );
}

const BUILTIN: Record<string, (p: { className?: string }) => ReactNode> = {
  apple: (p) => <AppleLogo {...p} />,
  samsung: (p) => <SamsungLogo {...p} />,
  motorola: (p) => <MotorolaLogo {...p} />,
  xiaomi: (p) => <XiaomiLogo {...p} />,
  lg: (p) => <GenericLetter letter="LG" className={`text-xl ${p.className || ''}`} />,
  huawei: (p) => <GenericLetter letter="H" className={`text-3xl ${p.className || ''}`} />,
  asus: (p) => <GenericLetter letter="ASUS" className={`text-sm ${p.className || ''}`} />,
  google: (p) => <GenericLetter letter="G" className={`text-3xl ${p.className || ''}`} />,
  sony: (p) => <GenericLetter letter="SONY" className={`text-xs ${p.className || ''}`} />,
  nokia: (p) => <GenericLetter letter="N" className={`text-3xl ${p.className || ''}`} />,
  oneplus: (p) => <GenericLetter letter="1+" className={`text-2xl ${p.className || ''}`} />,
  realme: (p) => <GenericLetter letter="R" className={`text-3xl ${p.className || ''}`} />,
  oppo: (p) => <GenericLetter letter="OPPO" className={`text-sm ${p.className || ''}`} />,
  vivo: (p) => <GenericLetter letter="vivo" className={`text-base ${p.className || ''}`} />,
};

export default function MarcaLogo({
  slug,
  nome,
  imagemUrl,
  className = 'w-10 h-10',
}: {
  slug?: string | null;
  nome?: string | null;
  imagemUrl?: string | null;
  className?: string;
}) {
  if (imagemUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imagemUrl} alt={nome || 'Marca'} className={`${className} object-contain`} />
    );
  }

  const key = keyFrom(slug, nome);
  const Builtin = BUILTIN[key];
  if (Builtin) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{Builtin({ className: 'w-full h-full' })}</span>;
  }

  const letter = (nome || slug || '?').trim().charAt(0).toUpperCase();
  if (letter) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <GenericLetter letter={letter} className="text-3xl" />
      </span>
    );
  }

  return <FiGrid className={className} strokeWidth={1.5} />;
}
