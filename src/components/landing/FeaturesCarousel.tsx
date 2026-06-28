'use client';

import type { ComponentType, SVGProps } from 'react';
import {
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartPieIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

type FeatureItem = {
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const LANDING_FEATURES: FeatureItem[] = [
  {
    title: 'Ordens de Serviço',
    description: 'Crie, acompanhe e finalize OS com fluxo completo em tempo real.',
    icon: ClipboardDocumentListIcon,
  },
  {
    title: 'Gestão de Clientes',
    description: 'Histórico de serviços, equipamentos e contato sempre à mão.',
    icon: UsersIcon,
  },
  {
    title: 'Controle Financeiro',
    description: 'Receitas, despesas e lucro com visão clara do negócio.',
    icon: ChartPieIcon,
  },
  {
    title: 'Dashboard BI',
    description: 'Indicadores e gráficos interativos para decisões rápidas.',
    icon: ChartBarIcon,
  },
  {
    title: 'App para Técnicos',
    description: 'O único app do mercado feito para quem conserta no dia a dia.',
    icon: DevicePhoneMobileIcon,
  },
  {
    title: 'Comissões',
    description: 'Regras automáticas e acompanhamento por técnico e período.',
    icon: CurrencyDollarIcon,
  },
  {
    title: 'Notas Fiscais',
    description: 'Emissão e gestão de NFC integrada ao fluxo da assistência.',
    icon: DocumentTextIcon,
  },
  {
    title: 'Laudos com IA',
    description: 'Gere laudos técnicos com inteligência artificial em segundos.',
    icon: SparklesIcon,
  },
  {
    title: 'WhatsApp',
    description: 'Comunicação integrada com clientes e equipe.',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    title: 'Checklist Digital',
    description: 'Padronize entradas e saídas com checklists personalizados.',
    icon: ClipboardDocumentCheckIcon,
  },
  {
    title: 'Caixa e PDV',
    description: 'Fluxo de caixa, vendas e movimentações em um só lugar.',
    icon: BanknotesIcon,
  },
  {
    title: 'Segurança na Nuvem',
    description: 'Backup automático, criptografia e dados sempre protegidos.',
    icon: ShieldCheckIcon,
  },
];

function FeatureCard({
  feature,
  isDarkMode,
}: {
  feature: FeatureItem;
  isDarkMode: boolean;
}) {
  const Icon = feature.icon;

  return (
    <article
      className={`group relative shrink-0 w-[300px] sm:w-[320px] rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
        isDarkMode
          ? 'bg-white/[0.04] border-white/10 hover:border-[#D1FE6E]/30 hover:bg-white/[0.06]'
          : 'bg-white border-gray-200/80 shadow-sm hover:border-[#D1FE6E]/50 hover:shadow-lg hover:shadow-[#D1FE6E]/10'
      }`}
    >
      <div
        className={`mb-5 inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-colors duration-300 ${
          isDarkMode
            ? 'border-[#D1FE6E]/20 bg-[#D1FE6E]/10 group-hover:border-[#D1FE6E]/40 group-hover:bg-[#D1FE6E]/15'
            : 'border-[#D1FE6E]/30 bg-[#D1FE6E]/10 group-hover:bg-[#D1FE6E]/15'
        }`}
      >
        <Icon className="w-5 h-5 text-[#B8E55A]" strokeWidth={1.75} />
      </div>
      <h3
        className={`text-base font-medium mb-2 tracking-tight ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        {feature.title}
      </h3>
      <p
        className={`text-sm leading-relaxed ${
          isDarkMode ? 'text-white/55' : 'text-gray-500'
        }`}
      >
        {feature.description}
      </p>
    </article>
  );
}

function MarqueeRow({
  items,
  isDarkMode,
  reverse = false,
}: {
  items: FeatureItem[];
  isDarkMode: boolean;
  reverse?: boolean;
}) {
  const track = [...items, ...items];

  return (
    <div className="features-marquee-row overflow-hidden">
      <div
        className={`features-marquee-track flex gap-4 sm:gap-5 w-max ${
          reverse ? 'features-marquee-reverse' : ''
        }`}
      >
        {track.map((feature, index) => (
          <FeatureCard
            key={`${feature.title}-${index}`}
            feature={feature}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
}

export default function FeaturesCarousel({ isDarkMode }: { isDarkMode: boolean }) {
  const midpoint = Math.ceil(LANDING_FEATURES.length / 2);
  const rowOne = LANDING_FEATURES.slice(0, midpoint);
  const rowTwo = LANDING_FEATURES.slice(midpoint);

  return (
    <div className="relative space-y-4 sm:space-y-5">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to right, rgb(0 0 0) 0%, transparent 100%)'
            : 'linear-gradient(to right, rgb(255 255 255) 0%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 z-10"
        style={{
          background: isDarkMode
            ? 'linear-gradient(to left, rgb(0 0 0) 0%, transparent 100%)'
            : 'linear-gradient(to left, rgb(255 255 255) 0%, transparent 100%)',
        }}
      />

      <MarqueeRow items={rowOne} isDarkMode={isDarkMode} />
      <MarqueeRow items={rowTwo} isDarkMode={isDarkMode} reverse />
    </div>
  );
}
