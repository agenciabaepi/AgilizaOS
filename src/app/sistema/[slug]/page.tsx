import type { ComponentType, SVGProps } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { LANDING_TRIAL } from '@/config/landing';
import {
  getSystemShowcaseSlide,
  getSystemShowcaseSlugs,
  SYSTEM_SHOWCASE_SLIDES,
  type SystemShowcaseIconId,
} from '@/lib/landing/system-showcase';

const ICONS: Record<SystemShowcaseIconId, ComponentType<SVGProps<SVGSVGElement>>> = {
  ordens: ClipboardDocumentListIcon,
  dashboard: ChartBarIcon,
  financeiro: ChartPieIcon,
  contas: DocumentTextIcon,
  comissoes: CurrencyDollarIcon,
  'chat-os': ChatBubbleLeftRightIcon,
  anexos: PhotoIcon,
  mais: BoltIcon,
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getSystemShowcaseSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slide = getSystemShowcaseSlide(slug);
  if (!slide) {
    return { title: 'Recurso | Gestão Consert' };
  }
  return {
    title: `${slide.label} | Gestão Consert`,
    description: slide.summary,
  };
}

export default async function SistemaDetalhePage({ params }: PageProps) {
  const { slug } = await params;
  const slide = getSystemShowcaseSlide(slug);
  if (!slide) notFound();

  const Icon = ICONS[slide.id];
  const otherSlides = SYSTEM_SHOWCASE_SLIDES.filter((item) => item.id !== slide.id).slice(0, 4);

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
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl h-72 blur-3xl pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(ellipse, rgba(209, 254, 110, 0.25) 0%, transparent 70%)',
        }}
      />

      <header className="relative z-10 px-6 py-6 lg:px-12 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/#solucoes"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Voltar ao carrossel
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

      <main className="relative z-10 px-6 py-10 md:py-14 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D1FE6E]/25 bg-[#D1FE6E]/10 mb-6">
            <Icon className="w-4 h-4 text-[#D1FE6E]" strokeWidth={1.75} />
            <span className="text-xs font-medium tracking-wide uppercase text-[#D1FE6E]">
              Tela do sistema
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-4">
            {slide.label}
          </h1>
          <p className="text-base sm:text-lg text-white/55 font-light leading-relaxed max-w-3xl mb-10">
            {slide.detailIntro ?? slide.summary}
          </p>

          {slide.image ? (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03] mb-10 shadow-2xl shadow-black/40">
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-zinc-900/90">
                <div className="flex gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-red-400/70" />
                  <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
                  <span className="w-2 h-2 rounded-full bg-green-400/70" />
                </div>
                <div className="flex-1 h-6 rounded-md flex items-center justify-center text-[11px] bg-white/[0.06] text-white/25">
                  gestaoconsert.com.br
                </div>
              </div>
              <div className="relative w-full bg-white">
                <Image
                  src={slide.image}
                  alt={slide.imageAlt ?? slide.label}
                  className="w-full h-auto"
                  quality={90}
                  priority
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-black/60 px-6 py-14 mb-10 flex flex-wrap justify-center gap-2">
              {slide.extraFeatures?.map((feature) => (
                <span
                  key={feature}
                  className="px-3.5 py-1.5 rounded-full text-sm bg-white/[0.06] text-white/70 border border-white/10"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}

          <section className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-6">
              O que você faz nessa tela
            </h2>
            <ul className="grid gap-3 sm:gap-4">
              {slide.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm sm:text-base text-white/75 leading-relaxed"
                >
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#D1FE6E] shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 mb-12 text-center">
            <p className="text-xs font-medium tracking-wide uppercase text-[#D1FE6E] mb-3">
              {LANDING_TRIAL.label}
            </p>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-3">
              Quer ver isso na prática?
            </h2>
            <p className="text-white/55 font-light max-w-xl mx-auto mb-6">
              {LANDING_TRIAL.description} Experimente a tela de {slide.label.toLowerCase()} e o restante do sistema.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/cadastro"
                className="px-8 py-3.5 rounded-full bg-[#D1FE6E] text-black font-medium hover:bg-[#B8E55A] transition-colors"
              >
                {LANDING_TRIAL.shortLabel}
              </Link>
              <Link
                href="/#solucoes"
                className="px-8 py-3.5 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                Ver outras telas
              </Link>
            </div>
          </section>

          {otherSlides.length > 0 && (
            <section>
              <h2 className="text-xl sm:text-2xl font-light tracking-tight mb-5">
                Outras telas do sistema
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {otherSlides.map((item) => {
                  const ItemIcon = ICONS[item.id];
                  return (
                    <Link
                      key={item.id}
                      href={`/sistema/${item.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 hover:border-[#D1FE6E]/35 hover:bg-[#D1FE6E]/5 transition-all"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#D1FE6E]/10 shrink-0">
                        <ItemIcon className="w-4 h-4 text-[#B8E55A]" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white/90">{item.label}</span>
                        <span className="block text-xs text-white/45 truncate">{item.summary}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
