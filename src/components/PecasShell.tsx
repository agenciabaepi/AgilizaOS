'use client';

import Link from 'next/link';

export default function PecasShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex flex-col">
      <header className="sticky top-0 z-20 bg-black border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <Link href="/pecas" className="flex items-center" aria-label="Gestão Consert — Peças">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/imagens/logobranco.png"
              alt="Gestão Consert"
              width={140}
              height={36}
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col">{children}</div>

      <footer className="mt-auto bg-black text-white">
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/imagens/logobranco.png"
            alt="Gestão Consert"
            width={120}
            height={32}
            className="h-7 w-auto object-contain mx-auto opacity-90"
          />
          <p className="text-xs text-white/50 mt-4">Catálogo de peças</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-xs text-white/60">
            <Link href="/sobre" className="hover:text-white transition-colors">
              Sobre
            </Link>
            <Link href="/termos" className="hover:text-white transition-colors">
              Termos
            </Link>
            <Link href="/politicas-privacidade" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <Link href="/fale-conosco" className="hover:text-white transition-colors">
              Contato
            </Link>
          </div>
          <p className="text-[11px] text-white/35 mt-5">
            © 2026 Gestão Consert. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
