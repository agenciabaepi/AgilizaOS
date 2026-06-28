'use client';

import type { ComponentType, SVGProps } from 'react';
import Image, { type StaticImageData } from 'next/image';
import {
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ChartPieIcon,
  CubeIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import ordensImage from '@/assets/imagens/ordens.png';
import dashboardImage from '@/assets/imagens/dashboard.png';
import comissoesImage from '@/assets/imagens/comissoes.png';
import financeiroImage from '@/assets/imagens/financeiro.png';
import produtosImage from '@/assets/imagens/produtos.png';
import contasPagarImage from '@/assets/imagens/contas a pagar.png';

type SystemSlide = {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  image?: StaticImageData;
  imageAlt?: string;
  extraFeatures?: string[];
};

const SYSTEM_SLIDES: SystemSlide[] = [
  {
    id: 'ordens',
    label: 'Ordens de Serviço',
    icon: ClipboardDocumentListIcon,
    image: ordensImage,
    imageAlt: 'Ordens de serviço no Consert',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ChartBarIcon,
    image: dashboardImage,
    imageAlt: 'Dashboard do sistema Consert',
  },
  {
    id: 'comissoes',
    label: 'Comissões',
    icon: CurrencyDollarIcon,
    image: comissoesImage,
    imageAlt: 'Módulo de comissões do Consert',
  },
  {
    id: 'contas',
    label: 'Contas a Pagar',
    icon: DocumentTextIcon,
    image: contasPagarImage,
    imageAlt: 'Contas a pagar no Consert',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: ChartPieIcon,
    image: financeiroImage,
    imageAlt: 'Módulo financeiro do Consert',
  },
  {
    id: 'produtos',
    label: 'Produtos',
    icon: CubeIcon,
    image: produtosImage,
    imageAlt: 'Gestão de produtos no Consert',
  },
  {
    id: 'mais',
    label: 'Muito mais',
    icon: BoltIcon,
    extraFeatures: ['Laudos com IA', 'App mobile', 'WhatsApp', 'Checklist', 'Caixa', 'Notas fiscais'],
  },
];

function BrowserChrome({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 border-b ${
        isDarkMode ? 'bg-zinc-900/90 border-white/10' : 'bg-gray-100 border-gray-200'
      }`}
    >
      <div className="flex gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-red-400/70" />
        <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
        <span className="w-2 h-2 rounded-full bg-green-400/70" />
      </div>
      <div
        className={`flex-1 h-6 rounded-md flex items-center justify-center text-[11px] ${
          isDarkMode ? 'bg-white/[0.06] text-white/25' : 'bg-white text-gray-400 border border-gray-200'
        }`}
      >
        gestaoconsert.com.br
      </div>
    </div>
  );
}

function SlideCard({ slide, isDarkMode }: { slide: SystemSlide; isDarkMode: boolean }) {
  const Icon = slide.icon;

  return (
    <article
      className={`group shrink-0 w-[min(88vw,720px)] rounded-2xl border overflow-hidden transition-all duration-300 hover:border-[#D1FE6E]/30 ${
        isDarkMode
          ? 'bg-white/[0.03] border-white/10'
          : 'bg-white border-gray-200 shadow-lg shadow-black/5'
      }`}
    >
      <BrowserChrome isDarkMode={isDarkMode} />

      {slide.image ? (
        <div className="relative w-full bg-white">
          <Image
            src={slide.image}
            alt={slide.imageAlt ?? slide.label}
            className="w-full h-auto"
            quality={90}
            sizes="(max-width: 768px) 88vw, 720px"
          />
        </div>
      ) : (
        <div
          className={`px-6 py-10 sm:py-12 min-h-[280px] sm:min-h-[320px] flex flex-col items-center justify-center gap-5 ${
            isDarkMode
              ? 'bg-gradient-to-br from-zinc-900/80 to-black/60'
              : 'bg-gradient-to-br from-gray-50 to-white'
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${
              isDarkMode
                ? 'border-[#D1FE6E]/25 bg-[#D1FE6E]/10'
                : 'border-[#D1FE6E]/40 bg-[#D1FE6E]/15'
            }`}
          >
            <Icon className="w-6 h-6 text-[#B8E55A]" strokeWidth={1.75} />
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {slide.extraFeatures?.map((feature) => (
              <span
                key={feature}
                className={`px-3.5 py-1.5 rounded-full text-sm ${
                  isDarkMode
                    ? 'bg-white/[0.06] text-white/70 border border-white/10'
                    : 'bg-white text-gray-600 border border-gray-200 shadow-sm'
                }`}
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className={`flex items-center gap-2.5 px-4 py-3 border-t ${
          isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-gray-100 bg-gray-50/80'
        }`}
      >
        <div
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
            isDarkMode ? 'bg-[#D1FE6E]/10' : 'bg-[#D1FE6E]/15'
          }`}
        >
          <Icon className="w-4 h-4 text-[#B8E55A]" strokeWidth={1.75} />
        </div>
        <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
          {slide.label}
        </span>
      </div>
    </article>
  );
}

export default function SystemShowcaseSlider({ isDarkMode }: { isDarkMode: boolean }) {
  const track = [...SYSTEM_SLIDES, ...SYSTEM_SLIDES];

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 md:w-28 z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to right, rgb(0 0 0) 0%, transparent 100%)'
            : 'linear-gradient(to right, rgb(255 255 255) 0%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 md:w-28 z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to left, rgb(0 0 0) 0%, transparent 100%)'
            : 'linear-gradient(to left, rgb(255 255 255) 0%, transparent 100%)',
        }}
      />

      <div className="system-showcase-marquee overflow-hidden">
        <div className="system-showcase-track flex gap-5 sm:gap-6 w-max px-4 sm:px-6">
          {track.map((slide, index) => (
            <SlideCard key={`${slide.id}-${index}`} slide={slide} isDarkMode={isDarkMode} />
          ))}
        </div>
      </div>
    </div>
  );
}
