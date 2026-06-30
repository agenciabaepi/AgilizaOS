'use client';

import Image from 'next/image';
import Link from 'next/link';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { FiCheckCircle } from 'react-icons/fi';
import { SiApple } from 'react-icons/si';
import { APP_STORE_URL } from '@/config/appStore';

const QR_CODE_SRC = '/assets/imagens/qrcodeapp.svg';
const PHONE_MOCKUP_SRC = '/assets/imagens/celular4.png';

const DESTAQUES = [
  'Comissões e bancada em tempo real',
  'OS e status no bolso do técnico',
];

export default function DashboardAppPromoBanner() {
  return (
    <section
      className="relative mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-700 bg-gradient-to-br from-gray-50 via-white to-[#f4fce8] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/95 px-3 py-3 sm:px-4 sm:py-4"
      role="region"
      aria-label="Baixar app Gestão Consert"
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[45%] blur-3xl opacity-25 dark:opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(209, 254, 110, 0.35) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#B8E55A]/40 dark:border-[#D1FE6E]/25 bg-[#D1FE6E]/15 dark:bg-[#D1FE6E]/10 text-gray-700 dark:text-[#D1FE6E] mb-2">
            <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-[#6B8F2E] dark:text-[#B8E55A]" strokeWidth={1.75} />
            <span className="text-[10px] font-semibold tracking-wide uppercase">App exclusivo</span>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug">
            Gestão Consert no iPhone{' '}
            <span className="text-[#6B8F2E] dark:text-[#B8E55A]">· Android em breve</span>
          </h2>

          <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1 mb-2">
            Baixe na App Store ou escaneie o QR Code.
          </p>

          <ul className="space-y-1 mb-3">
            {DESTAQUES.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-gray-700 dark:text-zinc-300">
                <FiCheckCircle className="w-3.5 h-3.5 text-[#6B8F2E] dark:text-[#B8E55A] shrink-0 mt-px" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FE6E] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#B8E55A] transition-colors"
            >
              <SiApple className="h-3.5 w-3.5" aria-hidden />
              App Store
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-4 w-full md:flex-1 md:min-w-0 shrink-0">
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200/90 dark:border-zinc-600 bg-white/95 dark:bg-zinc-800/90 p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={QR_CODE_SRC}
              alt="QR Code para baixar o app Gestão Consert na App Store"
              width={96}
              height={96}
              className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-md"
            />
            <p className="text-[11px] sm:text-xs font-medium text-gray-600 dark:text-zinc-300 text-center leading-tight">
              Escaneie para baixar
            </p>
          </div>

          <div className="w-[220px] sm:w-[260px] lg:w-[300px]">
            <div className="hero-phone-float-inner">
              <div
                className="relative"
                style={{
                  filter:
                    'drop-shadow(0 12px 24px rgba(0,0,0,0.1)) drop-shadow(0 0 16px rgba(209, 254, 110, 0.2))',
                }}
              >
                <div className="app-showcase-image-fade">
                  <Image
                    src={PHONE_MOCKUP_SRC}
                    alt="App Gestão Consert no iPhone"
                    width={1400}
                    height={900}
                    className="w-full h-auto block"
                    sizes="(max-width: 640px) 220px, 300px"
                    priority={false}
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
