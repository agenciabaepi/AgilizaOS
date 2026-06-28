'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { CONTATO, abrirWhatsApp } from '@/config/contato';

const BENEFICIOS = [
  {
    icon: DevicePhoneMobileIcon,
    title: 'App para técnicos',
    desc: 'O único app do mercado feito para quem conserta no dia a dia.',
  },
  {
    icon: SparklesIcon,
    title: 'Proposta personalizada',
    desc: 'Plano sob medida para o tamanho e a rotina da sua assistência.',
  },
  {
    icon: CheckCircleIcon,
    title: 'Sem compromisso',
    desc: 'Converse com nossa equipe e tire todas as dúvidas antes de decidir.',
  },
];

const PASSOS = [
  'Conte sobre sua assistência',
  'Receba uma proposta personalizada',
  'Comece a usar o Gestão Consert',
];

export default function FaleConoscoPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(209, 254, 110, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(209, 254, 110, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl h-64 blur-3xl pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(ellipse, rgba(209, 254, 110, 0.25) 0%, transparent 70%)',
        }}
      />

      <header className="relative z-10 px-6 py-6 lg:px-12 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeftIcon className="w-4 h-4" />
            Voltar ao site
          </Link>
          <Link href="/">
            <Image
              src="/assets/imagens/logobranco.png"
              alt="Gestão Consert"
              width={120}
              height={120}
              className="hover:opacity-90 transition-opacity"
            />
          </Link>
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-6 py-12 md:py-16 lg:px-12">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D1FE6E]/25 bg-[#D1FE6E]/10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D1FE6E] animate-pulse" />
            <span className="text-xs font-medium tracking-wide uppercase text-[#D1FE6E]">
              Atendimento humanizado
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-6">
            Vamos conversar sobre
            <span className="block mt-2 font-normal text-gradient-accent">sua assistência?</span>
          </h1>

          <p className="text-base sm:text-lg text-white/55 font-light leading-relaxed max-w-xl mx-auto mb-10">
            Nossa equipe responde pelo WhatsApp e monta uma proposta personalizada
            com tudo que sua operação precisa — do app do técnico ao financeiro completo.
          </p>

          <button
            onClick={() => abrirWhatsApp()}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-medium text-base sm:text-lg bg-[#D1FE6E] text-black hover:bg-[#B8E55A] transition-all duration-300 hover:scale-[1.03] mb-4"
            style={{ boxShadow: '0 4px 32px rgba(209, 254, 110, 0.4)' }}
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" strokeWidth={1.75} />
            Chamar no WhatsApp
          </button>

          <p className="text-sm text-white/40 mb-14">
            {CONTATO.whatsappDisplay} · Resposta em horário comercial
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14 text-left">
            {BENEFICIOS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#D1FE6E]/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D1FE6E]/10 border border-[#D1FE6E]/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[#B8E55A]" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-medium text-white mb-1.5">{title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 text-left">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40 mb-6 text-center">
              Como funciona
            </p>
            <ol className="space-y-4 max-w-md mx-auto">
              {PASSOS.map((passo, i) => (
                <li key={passo} className="flex items-center gap-4">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#D1FE6E]/15 border border-[#D1FE6E]/25 flex items-center justify-center text-sm font-medium text-[#B8E55A]">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white/75">{passo}</span>
                </li>
              ))}
            </ol>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => abrirWhatsApp()}
                className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-medium border border-[#D1FE6E]/40 text-[#D1FE6E] hover:bg-[#D1FE6E]/10 transition-colors"
              >
                Iniciar conversa
              </button>
              <a
                href={`mailto:${CONTATO.email}`}
                className="text-sm text-white/45 hover:text-white/70 transition-colors"
              >
                {CONTATO.email}
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
