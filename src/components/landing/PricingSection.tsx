'use client';

import { CheckIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

import { LANDING_TRIAL } from '@/config/landing';

type PricingSectionProps = {
  isDarkMode: boolean;
  features: string[];
  onContact: () => void;
};

export default function PricingSection({ isDarkMode, features, onContact }: PricingSectionProps) {
  return (
    <div className="relative max-w-6xl mx-auto">
      <div
        className={`relative rounded-[2rem] border overflow-hidden ${
          isDarkMode
            ? 'border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]'
            : 'border-gray-200 bg-white shadow-xl shadow-black/5'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: isDarkMode
              ? 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(209,254,110,0.12) 0%, transparent 70%)'
              : 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(209,254,110,0.08) 0%, transparent 70%)',
          }}
        />

        {/* CTA */}
        <div className="relative px-6 sm:px-10 md:px-14 pt-10 sm:pt-12 md:pt-14 pb-8 sm:pb-10 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 ${
              isDarkMode
                ? 'border-[#D1FE6E]/20 bg-[#D1FE6E]/10 text-[#D1FE6E]'
                : 'border-[#B8E55A]/40 bg-[#D1FE6E]/15 text-gray-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D1FE6E] animate-pulse" />
            <span className="text-xs font-medium tracking-wide uppercase">
              {LANDING_TRIAL.label} · {features.length}+ funcionalidades
            </span>
          </div>

          <h3
            className={`text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-tight mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Fale com nossa equipe
          </h3>

          <p
            className={`text-base sm:text-lg font-light max-w-lg mx-auto mb-8 leading-relaxed ${
              isDarkMode ? 'text-white/55' : 'text-gray-500'
            }`}
          >
            Receba uma proposta personalizada e comece com {LANDING_TRIAL.label.toLowerCase()} — sem compromisso.
          </p>

          <button
            onClick={onContact}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-medium text-sm sm:text-base bg-[#D1FE6E] text-black hover:bg-[#B8E55A] transition-all duration-300 hover:scale-[1.03]"
            style={{ boxShadow: '0 4px 24px rgba(209, 254, 110, 0.35)' }}
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" strokeWidth={1.75} />
            {LANDING_TRIAL.shortLabel}
          </button>

          <p className={`mt-4 text-xs ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>
            {LANDING_TRIAL.note}
          </p>
        </div>

        {/* Divisor */}
        <div className="relative px-6 sm:px-10 md:px-14">
          <div className={`h-px ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />
        </div>

        {/* Funcionalidades */}
        <div className="relative px-6 sm:px-10 md:px-14 py-8 sm:py-10 md:py-12">
          <p
            className={`text-center text-xs font-medium uppercase tracking-[0.2em] mb-8 ${
              isDarkMode ? 'text-white/40' : 'text-gray-400'
            }`}
          >
            Tudo incluído no sistema
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 max-w-5xl mx-auto">
            {features.map((item) => (
              <div key={item} className="flex items-center gap-3 min-w-0 group">
                <div
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isDarkMode
                      ? 'bg-[#D1FE6E]/10 border border-[#D1FE6E]/15 group-hover:bg-[#D1FE6E]/15'
                      : 'bg-[#D1FE6E]/15 border border-[#D1FE6E]/25'
                  }`}
                >
                  <CheckIcon className="w-3.5 h-3.5 text-[#B8E55A]" strokeWidth={2.5} />
                </div>
                <span
                  className={`text-sm leading-snug ${
                    isDarkMode ? 'text-white/70 group-hover:text-white/90' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
