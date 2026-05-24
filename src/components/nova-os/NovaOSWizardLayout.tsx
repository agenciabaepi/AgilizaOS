'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';
import { Button } from '@/components/Button';

export interface NovaOSContextChip {
  label: string;
  value: string;
}

interface NovaOSWizardLayoutProps {
  etapas: string[];
  etapaAtual: number;
  onEtapaClick?: (etapa: number) => void;
  contextChips?: NovaOSContextChip[];
  children: ReactNode;
  onAnterior: () => void;
  onProxima: () => void;
  proximaLabel?: string;
  disableAnterior?: boolean;
  disableProxima?: boolean;
  proximaClassName?: string;
  proximaTitle?: string;
}

const SCROLL_THRESHOLD = 72;

function WizardNavButtons({
  etapaAtual,
  etapas,
  proximaLabel,
  disableAnterior,
  disableProxima,
  proximaClassName,
  proximaTitle,
  onAnterior,
  onProxima,
  className = '',
}: {
  etapaAtual: number;
  etapas: string[];
  proximaLabel: string;
  disableAnterior?: boolean;
  disableProxima?: boolean;
  proximaClassName?: string;
  proximaTitle?: string;
  onAnterior: () => void;
  onProxima: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:gap-3 sm:px-4 sm:py-3 ${className}`}
    >
      <Button
        variant="secondary"
        onClick={onAnterior}
        disabled={disableAnterior}
        className="min-w-0 flex-1 gap-1.5 sm:min-w-[110px] sm:flex-none"
      >
        <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        <span>Anterior</span>
      </Button>
      <div className="flex shrink-0 flex-col items-center px-1 text-center sm:px-3">
        <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-[11px]">
          Etapa {etapaAtual}/{etapas.length}
        </span>
        <span className="max-w-[88px] truncate text-xs font-semibold text-gray-800 sm:max-w-none sm:text-sm">
          {etapas[etapaAtual - 1]}
        </span>
      </div>
      <Button
        variant="default"
        onClick={onProxima}
        disabled={disableProxima}
        className={`min-w-0 flex-1 gap-1.5 sm:min-w-[120px] sm:flex-none ${proximaClassName || ''}`}
        title={proximaTitle}
      >
        <span className="truncate">{proximaLabel}</span>
        <FiArrowRight className="h-4 w-4 shrink-0" aria-hidden />
      </Button>
    </div>
  );
}

export default function NovaOSWizardLayout({
  etapas,
  etapaAtual,
  onEtapaClick,
  contextChips = [],
  children,
  onAnterior,
  onProxima,
  proximaLabel = 'Próxima',
  disableAnterior,
  disableProxima,
  proximaClassName,
  proximaTitle,
}: NovaOSWizardLayoutProps) {
  const progress = Math.round((etapaAtual / etapas.length) * 100);
  const [showFloatingNav, setShowFloatingNav] = useState(false);

  const navProps = {
    etapaAtual,
    etapas,
    proximaLabel,
    disableAnterior,
    disableProxima,
    proximaClassName,
    proximaTitle,
    onAnterior,
    onProxima,
  };

  const updateScrollState = useCallback(() => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight > window.innerHeight + 32;
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    setShowFloatingNav(scrollable && scrolled);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, etapaAtual]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const t = setTimeout(updateScrollState, 400);
    return () => clearTimeout(t);
  }, [etapaAtual, updateScrollState]);

  return (
    <div className={`relative mx-auto w-full max-w-3xl lg:max-w-4xl ${showFloatingNav ? 'pb-28' : 'pb-6'}`}>
      {/* Mobile: passo atual */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm md:hidden">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            Passo {etapaAtual} de {etapas.length}
          </p>
          <p className="text-base font-semibold text-gray-900">{etapas[etapaAtual - 1]}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{progress}%</p>
        </div>
      </div>

      {/* Desktop: stepper */}
      <nav className="mb-6 hidden md:block" aria-label="Etapas da ordem de serviço">
        <ol className="flex items-center justify-between gap-1">
          {etapas.map((label, idx) => {
            const num = idx + 1;
            const isActive = etapaAtual === num;
            const isDone = etapaAtual > num;
            const canClick = onEtapaClick && num <= etapaAtual;

            return (
              <li key={label} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {idx > 0 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors duration-300 ${
                        isDone || isActive ? 'bg-gray-900' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <button
                    type="button"
                    disabled={!canClick}
                    onClick={() => canClick && onEtapaClick(num)}
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'scale-110 bg-gray-900 text-white ring-4 ring-gray-900/10'
                        : isDone
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-gray-100 text-gray-400'
                    } ${canClick && !isActive ? 'cursor-pointer' : 'cursor-default'}`}
                    title={canClick ? `Ir para ${label}` : undefined}
                  >
                    {isDone ? <FiCheck className="h-4 w-4" strokeWidth={3} /> : num}
                  </button>
                  {idx < etapas.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-colors duration-300 ${
                        isDone ? 'bg-gray-900' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`mt-2 w-full truncate px-0.5 text-center text-[11px] font-medium ${
                    isActive ? 'text-gray-900' : isDone ? 'text-gray-600' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {contextChips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {contextChips.map((chip) => (
            <span
              key={`${chip.label}-${chip.value}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs shadow-sm"
            >
              <span className="font-medium text-gray-500">{chip.label}:</span>
              <span className="truncate font-semibold text-gray-800">{chip.value}</span>
            </span>
          ))}
        </div>
      )}

      <div
        key={etapaAtual}
        className="mb-6 animate-nova-os-fade-slide rounded-2xl border border-gray-100 bg-white p-5 shadow-md sm:p-7 md:p-8"
      >
        {children}
      </div>

      {/* Navegação no fluxo — visível no topo da página ou quando não há scroll */}
      {!showFloatingNav && <WizardNavButtons {...navProps} className="mt-2" />}

      {/* Barra flutuante — só após rolar */}
      <div
        role="navigation"
        aria-label="Navegação entre etapas"
        aria-hidden={!showFloatingNav}
        className={`fixed bottom-0 left-0 right-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300 ease-out ${
          showFloatingNav
            ? 'pointer-events-none translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-full opacity-0'
        }`}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4 sm:px-6 lg:max-w-4xl">
          <WizardNavButtons
            {...navProps}
            className="mb-3 border-gray-200/90 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md"
          />
        </div>
      </div>
    </div>
  );
}
