'use client';

import Link from 'next/link';
import {
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { LANDING_TRIAL } from '@/config/landing';
import { PLANO_SLUGS, PREMIUM_MODULES, premiumModuleStatusBadge } from '@/config/planModules';
import { usePlanosPublicos, formatarPrecoBRL, type PlanoPublico } from '@/hooks/usePlanosPublicos';

const RECURSOS_CORE = [
  'Ordens de serviço, laudos e fotos',
  'Clientes, produtos e estoque',
  'Financeiro completo',
  'Relatórios, comissões e app do técnico',
];

type PricingSectionProps = {
  isDarkMode: boolean;
};

function PlanoCard({
  plano,
  destaque,
  isDarkMode,
}: {
  plano: PlanoPublico;
  destaque?: boolean;
  isDarkMode: boolean;
}) {
  const isCompleto = plano.slug === PLANO_SLUGS.COMPLETO;
  const premiumList = Object.values(PREMIUM_MODULES);
  const cadastroHref = `/cadastro?plano=${plano.slug}`;

  const ctaTitle = isCompleto
    ? `Começar ${LANDING_TRIAL.days} dias grátis no Completo`
    : `Começar ${LANDING_TRIAL.days} dias grátis no Básico`;
  const ctaSubtitle = isCompleto
    ? 'Acesso total no teste: OS, financeiro, app, IA e módulos premium.'
    : 'Monte sua assistência no sistema — sem cartão e sem compromisso.';

  return (
    <div
      className={`relative flex flex-col rounded-[1.75rem] border p-6 sm:p-8 h-full transition-all duration-300 ${
        destaque
          ? isDarkMode
            ? 'border-[#D1FE6E]/40 bg-gradient-to-b from-[#D1FE6E]/10 to-white/[0.03] shadow-[0_0_40px_rgba(209,254,110,0.08)]'
            : 'border-[#B8E55A] bg-gradient-to-b from-[#f4fce8] to-white shadow-xl shadow-black/5 ring-1 ring-[#D1FE6E]/40'
          : isDarkMode
            ? 'border-white/10 bg-white/[0.03]'
            : 'border-gray-200 bg-white shadow-lg shadow-black/5'
      }`}
    >
      {destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full bg-[#D1FE6E] text-black">
          Mais escolhido
        </span>
      )}

      <div className="mb-5">
        <h3 className={`text-xl font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {plano.nome}
        </h3>
        <p className={`text-sm mt-1.5 min-h-[2.5rem] leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
          {plano.descricao}
        </p>
      </div>

      <div className="mb-2">
        <span className={`text-4xl font-light tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {formatarPrecoBRL(plano.preco)}
        </span>
        <span className={`text-sm ml-1 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`}>/mês</span>
      </div>

      <p
        className={`text-xs font-medium mb-6 ${
          isDarkMode ? 'text-[#D1FE6E]/80' : 'text-[#6B8F2E]'
        }`}
      >
        Depois do teste: {formatarPrecoBRL(plano.preco)}/mês · cancele quando quiser
      </p>

      <ul className="space-y-2.5 mb-5 flex-grow">
        {RECURSOS_CORE.map((item) => (
          <li
            key={item}
            className={`flex gap-2.5 text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}
          >
            <CheckIcon className="w-4 h-4 text-[#B8E55A] shrink-0 mt-0.5" strokeWidth={2.5} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-2.5 ${
          isDarkMode ? 'text-white/35' : 'text-gray-400'
        }`}
      >
        Módulos premium
      </p>
      <ul className="space-y-2 mb-6">
        {premiumList.map((mod) => {
          const incluido = isCompleto;
          const badge = premiumModuleStatusBadge(mod.status);
          return (
            <li
              key={mod.label}
              className={`flex gap-2.5 text-sm ${
                incluido
                  ? isDarkMode
                    ? 'text-white/70'
                    : 'text-gray-600'
                  : isDarkMode
                    ? 'text-white/30'
                    : 'text-gray-400'
              }`}
            >
              {incluido ? (
                <CheckIcon className="w-4 h-4 text-[#B8E55A] shrink-0 mt-0.5" strokeWidth={2.5} />
              ) : (
                <XMarkIcon className="w-4 h-4 shrink-0 mt-0.5 opacity-40" strokeWidth={2} />
              )}
              <span>
                {mod.label}
                {badge && (
                  <span
                    className={`ml-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                      mod.status === 'development'
                        ? 'text-amber-500'
                        : isDarkMode
                          ? 'text-sky-400'
                          : 'text-sky-600'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {/* CTA */}
      <div
        className={`mt-auto rounded-2xl border p-4 sm:p-5 ${
          destaque
            ? isDarkMode
              ? 'border-[#D1FE6E]/25 bg-[#D1FE6E]/[0.08]'
              : 'border-[#B8E55A]/50 bg-[#D1FE6E]/15'
            : isDarkMode
              ? 'border-white/10 bg-white/[0.04]'
              : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-start gap-2.5 mb-3">
          <SparklesIcon
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              isDarkMode ? 'text-[#D1FE6E]' : 'text-[#6B8F2E]'
            }`}
            strokeWidth={2}
          />
          <div>
            <p className={`text-sm font-semibold leading-snug ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {LANDING_TRIAL.days} dias grátis com acesso imediato
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
              {ctaSubtitle}
            </p>
          </div>
        </div>

        <Link
          href={cadastroHref}
          className={`group w-full py-3.5 px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] ${
            destaque
              ? 'bg-[#D1FE6E] text-black hover:bg-[#B8E55A]'
              : isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
          style={destaque ? { boxShadow: '0 4px 24px rgba(209, 254, 110, 0.35)' } : undefined}
        >
          <span>{ctaTitle}</span>
          <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
        </Link>

        <ul className="mt-3 space-y-1.5">
          {[
            'Cadastro em menos de 2 minutos',
            'Sem cartão de crédito no teste',
            'Cancele quando quiser, sem multa',
          ].map((item) => (
            <li
              key={item}
              className={`flex items-center gap-2 text-[11px] sm:text-xs ${
                isDarkMode ? 'text-white/45' : 'text-gray-500'
              }`}
            >
              {item.includes('cartão') ? (
                <CreditCardIcon className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={2} />
              ) : (
                <CheckIcon className="w-3.5 h-3.5 shrink-0 text-[#B8E55A]" strokeWidth={2.5} />
              )}
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanosSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 animate-pulse">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`h-[32rem] rounded-[1.75rem] ${
            isDarkMode ? 'bg-white/5' : 'bg-gray-100'
          }`}
        />
      ))}
    </div>
  );
}

export default function PricingSection({ isDarkMode }: PricingSectionProps) {
  const { basico, completo, ready, loading } = usePlanosPublicos();

  return (
    <div className="relative max-w-5xl mx-auto">
      <div className="text-center mb-8 sm:mb-10">
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 ${
            isDarkMode
              ? 'border-[#D1FE6E]/20 bg-[#D1FE6E]/10 text-[#D1FE6E]'
              : 'border-[#B8E55A]/40 bg-[#D1FE6E]/15 text-gray-700'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D1FE6E] animate-pulse" />
          <span className="text-xs font-medium tracking-wide uppercase">
            {LANDING_TRIAL.label} · Sem cartão
          </span>
        </div>
        <p className={`text-base sm:text-lg font-light max-w-lg mx-auto leading-relaxed ${
          isDarkMode ? 'text-white/55' : 'text-gray-500'
        }`}>
          {LANDING_TRIAL.description} Depois escolha o plano ideal para sua assistência.
        </p>
      </div>

      {loading || !ready ? (
        <PlanosSkeleton isDarkMode={isDarkMode} />
      ) : !basico || !completo ? (
        <div
          className={`rounded-2xl border p-6 text-center text-sm ${
            isDarkMode
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          Planos temporariamente indisponíveis. Use o cadastro para começar seu teste grátis.
          <div className="mt-4">
            <Link
              href="/cadastro"
              className="inline-flex px-6 py-2.5 rounded-full bg-[#D1FE6E] text-black text-sm font-semibold hover:bg-[#B8E55A] transition-colors"
            >
              {LANDING_TRIAL.shortLabel}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <PlanoCard plano={basico} isDarkMode={isDarkMode} />
          <PlanoCard plano={completo} destaque isDarkMode={isDarkMode} />
        </div>
      )}
    </div>
  );
}
