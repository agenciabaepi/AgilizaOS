'use client';

import Link from 'next/link';
import { FiCheck, FiX, FiArrowRight } from 'react-icons/fi';
import { usePlanosPublicos, formatarPrecoBRL } from '@/hooks/usePlanosPublicos';
import { useSubscription } from '@/hooks/useSubscription';
import { PLANO_SLUGS, PREMIUM_MODULES, premiumModuleStatusBadge } from '@/config/planModules';
import type { PlanoPublico } from '@/hooks/usePlanosPublicos';

const RECURSOS_CORE = [
  'Ordens de serviço, laudos e fotos',
  'Clientes, produtos e estoque',
  'Financeiro completo',
  'Relatórios, comissões e app do técnico',
];

function PlanoCard({
  plano,
  destaque,
  planoAtualSlug,
  precisaRenovar,
}: {
  plano: PlanoPublico;
  destaque?: boolean;
  planoAtualSlug: string | null;
  /** Assinatura/trial vencido: permite pagar de novo o plano atual */
  precisaRenovar: boolean;
}) {
  const isAtual = planoAtualSlug === plano.slug;
  const isCompleto = plano.slug === PLANO_SLUGS.COMPLETO;
  const premiumList = Object.values(PREMIUM_MODULES);

  // Plano atual ativo → só informa; plano atual vencido → renovar; outros → assinar/upgrade
  const podeAssinar = !isAtual || precisaRenovar;
  const ctaLabel = isAtual
    ? precisaRenovar
      ? 'Renovar agora'
      : 'Plano atual'
    : isCompleto && planoAtualSlug === PLANO_SLUGS.BASICO
      ? 'Fazer upgrade'
      : 'Assinar este plano';

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 sm:p-6 h-full transition-shadow ${
        destaque
          ? 'border-[#B8E55A] bg-gradient-to-b from-[#f4fce8] to-white shadow-md ring-1 ring-[#D1FE6E]/40'
          : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
      }`}
    >
      {destaque && !isAtual && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold rounded-full bg-[#D1FE6E] text-gray-900">
          Recomendado
        </span>
      )}
      {isAtual && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
          {precisaRenovar ? 'Renovar' : 'Seu plano'}
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plano.nome}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 min-h-[2.5rem]">
          {plano.descricao}
        </p>
      </div>

      <div className="mb-5">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatarPrecoBRL(plano.preco)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/mês</span>
        {plano.personalizado && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
            Valor personalizado da sua empresa
            {plano.preco_catalogo != null &&
              Math.abs(plano.preco_catalogo - plano.preco) > 0.009 && (
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  {' '}
                  (catálogo {formatarPrecoBRL(plano.preco_catalogo)})
                </span>
              )}
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-4 flex-grow">
        {RECURSOS_CORE.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
            <FiCheck className="w-4 h-4 text-[#6B8F2E] shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        Módulos premium
      </p>
      <ul className="space-y-1.5 mb-6">
        {premiumList.map((mod) => {
          const incluido = isCompleto;
          const badge = premiumModuleStatusBadge(mod.status);
          return (
            <li
              key={mod.label}
              className={`flex gap-2 text-sm ${
                incluido ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {incluido ? (
                <FiCheck className="w-4 h-4 text-[#6B8F2E] shrink-0 mt-0.5" />
              ) : (
                <FiX className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
              )}
              <span>
                {mod.label}
                {badge && (
                  <span
                    className={`ml-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                      mod.status === 'development'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-sky-700 dark:text-sky-400'
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

      {!podeAssinar ? (
        <button
          type="button"
          disabled
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-gray-100 text-gray-500 cursor-default dark:bg-zinc-700 dark:text-zinc-400"
        >
          {ctaLabel}
        </button>
      ) : (
        <Link
          href={`/assinatura/pagar/${plano.slug}`}
          className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
            destaque || (isAtual && precisaRenovar)
              ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-[#D1FE6E] dark:text-gray-900 dark:hover:bg-[#B8E55A]'
              : 'border border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:text-white dark:hover:bg-zinc-700'
          }`}
        >
          {ctaLabel}
          <FiArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function PlanosSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
      <div className="h-96 bg-gray-100 dark:bg-zinc-800 rounded-2xl" />
      <div className="h-96 bg-gray-100 dark:bg-zinc-800 rounded-2xl" />
    </div>
  );
}

interface PlanosAssinaturaCardsProps {
  id?: string;
  titulo?: string;
  subtitulo?: string;
}

export default function PlanosAssinaturaCards({
  id = 'planos-assinatura',
  titulo = 'Escolha seu plano',
  subtitulo = 'Básico com gestão completa ou Completo com Nota Fiscal, IA e CRM WhatsApp (em desenvolvimento).',
}: PlanosAssinaturaCardsProps) {
  const { basico, completo, ready, loading } = usePlanosPublicos();
  const { planoSlug, assinatura, isAssinaturaVencida, isTrialExpired } = useSubscription();

  const planoAtualSlug =
    planoSlug && planoSlug !== PLANO_SLUGS.TRIAL ? planoSlug : null;
  const precisaRenovar = isAssinaturaVencida() || isTrialExpired();

  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{titulo}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitulo}</p>
        {assinatura?.plano?.nome && (
          <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
            Plano atual:{' '}
            <span className="font-semibold">{assinatura.plano.nome}</span>
            {precisaRenovar && (
              <span className="ml-2 text-amber-700 dark:text-amber-400 font-medium">
                — vencido, renove para continuar
              </span>
            )}
          </p>
        )}
      </div>

      {loading || !ready ? (
        <PlanosSkeleton />
      ) : !basico || !completo ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Planos indisponíveis no momento. Execute a migration{' '}
          <code className="text-xs bg-white/80 dark:bg-zinc-900 px-1 rounded">planos_dois_tiers.sql</code>{' '}
          no Supabase ou configure em Admin SaaS → Planos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <PlanoCard
            plano={basico}
            planoAtualSlug={planoAtualSlug}
            precisaRenovar={precisaRenovar}
          />
          <PlanoCard
            plano={completo}
            destaque
            planoAtualSlug={planoAtualSlug}
            precisaRenovar={precisaRenovar}
          />
        </div>
      )}
    </section>
  );
}
