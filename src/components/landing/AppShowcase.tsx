'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  DevicePhoneMobileIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { LANDING_TRIAL } from '@/config/landing';

const APP_HIGHLIGHTS = [
  {
    icon: WrenchScrewdriverIcon,
    title: 'Minha bancada',
    desc: 'Veja pendentes, finalizados e detalhes de cada OS na hora.',
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Comissões',
    desc: 'Acompanhe valores previstos e pagos por entrega em tempo real.',
  },
  {
    icon: ClipboardDocumentListIcon,
    title: 'OS completa',
    desc: 'Relatos, equipamento e status — tudo no bolso do técnico.',
  },
];

type AppShowcaseProps = {
  isDarkMode: boolean;
};

export default function AppShowcase({ isDarkMode }: AppShowcaseProps) {
  const router = useRouter();

  return (
    <section id="app-mobile" className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[50%] blur-3xl opacity-20 pointer-events-none"
        style={{
          background: isDarkMode
            ? 'radial-gradient(ellipse, rgba(209, 254, 110, 0.18) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(209, 254, 110, 0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-16 items-center">
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 ${
                isDarkMode
                  ? 'border-[#D1FE6E]/20 bg-[#D1FE6E]/10 text-[#D1FE6E]'
                  : 'border-[#B8E55A]/40 bg-[#D1FE6E]/15 text-gray-700'
              }`}
            >
              <DevicePhoneMobileIcon className="w-4 h-4" strokeWidth={1.75} />
              <span className="text-xs font-medium tracking-wide uppercase">App para técnicos</span>
            </div>

            <h2
              className={`text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-tight mb-5 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              O app que coloca a
              <span className={`block mt-1 font-normal ${isDarkMode ? 'text-gradient-accent' : 'text-[#6B8F2E]'}`}>
                assistência no bolso do técnico
              </span>
            </h2>

            <p
              className={`text-base md:text-lg font-light leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 ${
                isDarkMode ? 'text-white/55' : 'text-gray-600'
              }`}
            >
              Comissões, bancada e ordens de serviço atualizadas em tempo real —
              sem depender do computador da loja.
            </p>

            <ul className="space-y-4 mb-8 max-w-md mx-auto lg:mx-0 text-left">
              {APP_HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-3">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
                      isDarkMode
                        ? 'border-[#D1FE6E]/20 bg-[#D1FE6E]/10'
                        : 'border-[#D1FE6E]/30 bg-[#D1FE6E]/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-[#B8E55A]" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => router.push('/fale-conosco')}
              className="inline-flex px-7 py-3 rounded-full font-medium text-sm sm:text-base bg-[#D1FE6E] text-black hover:bg-[#B8E55A] transition-all duration-300 hover:scale-[1.02]"
              style={{ boxShadow: '0 4px 24px rgba(209, 254, 110, 0.35)' }}
            >
              {LANDING_TRIAL.shortLabel}
            </button>
          </div>

          <div className="order-1 lg:order-2 relative pb-0 -mb-6 sm:-mb-10 md:-mb-14">
            <div className="hero-phone-float-inner">
              <div
                className="relative mx-auto max-w-xl lg:max-w-none"
                style={{
                  filter: isDarkMode
                    ? 'drop-shadow(0 30px 60px rgba(0,0,0,0.5)) drop-shadow(0 0 40px rgba(209, 254, 110, 0.15)'
                    : 'drop-shadow(0 25px 50px rgba(0,0,0,0.15)) drop-shadow(0 0 30px rgba(209, 254, 110, 0.2)',
                }}
              >
                <div className="app-showcase-image-fade">
                  <Image
                    src="/assets/imagens/celular4.png"
                    alt="App Gestão Consert — telas de Comissões e Minha bancada"
                    width={1400}
                    height={900}
                    className="w-full h-auto block"
                    sizes="(max-width: 1024px) 90vw, 560px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
