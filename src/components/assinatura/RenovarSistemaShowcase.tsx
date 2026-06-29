'use client';

import Image from 'next/image';
import { CheckIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { FiCheckCircle } from 'react-icons/fi';
import { SYSTEM_FEATURES } from '@/config/landing';

const DESTAQUES = [
  'Ordens de serviço, clientes, estoque e financeiro em um só lugar',
  'Comissões e bancada do técnico atualizadas em tempo real',
  'Relatórios, equipe e permissões para crescer com organização',
];

export default function RenovarSistemaShowcase() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-[#f4fce8] p-6 sm:p-8">
      <div
        className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[55%] blur-3xl opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(209, 254, 110, 0.35) 0%, transparent 70%)',
        }}
      />

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
        <div className="order-2 md:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#B8E55A]/40 bg-[#D1FE6E]/15 text-gray-700 mb-4">
            <DevicePhoneMobileIcon className="w-4 h-4 text-[#6B8F2E]" strokeWidth={1.75} />
            <span className="text-xs font-semibold tracking-wide uppercase">App exclusivo</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 leading-snug mb-3">
            O único sistema de assistência técnica com{' '}
            <span className="text-[#6B8F2E]">aplicativo para técnicos</span>
          </h2>

          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Renove e continue com o Gestão Consert completo — painel web para a loja e app no bolso
            da equipe, sem depender só do computador.
          </p>

          <ul className="space-y-2.5">
            {DESTAQUES.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-gray-700">
                <FiCheckCircle className="w-4 h-4 text-[#6B8F2E] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 md:order-2 relative -mb-4 md:-mb-8">
          <div className="hero-phone-float-inner">
            <div
              className="relative mx-auto max-w-[280px] sm:max-w-xs md:max-w-sm"
              style={{
                filter:
                  'drop-shadow(0 25px 50px rgba(0,0,0,0.12)) drop-shadow(0 0 30px rgba(209, 254, 110, 0.25))',
              }}
            >
              <div className="app-showcase-image-fade">
                <Image
                  src="/assets/imagens/celular4.png"
                  alt="App Gestão Consert — comissões e bancada do técnico"
                  width={1400}
                  height={900}
                  className="w-full h-auto block"
                  sizes="(max-width: 768px) 280px, 320px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-8 pt-8 border-t border-gray-200/80">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 mb-6">
          Recursos do sistema
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {SYSTEM_FEATURES.map((item) => (
            <div key={item} className="flex items-center gap-2.5 min-w-0 group">
              <div className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-[#D1FE6E]/15 border border-[#D1FE6E]/25 group-hover:bg-[#D1FE6E]/25 transition-colors">
                <CheckIcon className="w-3 h-3 text-[#6B8F2E]" strokeWidth={2.5} />
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors leading-snug">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
