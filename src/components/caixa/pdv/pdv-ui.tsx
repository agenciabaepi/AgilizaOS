import React from 'react';
import { cn } from '@/lib/utils';

export const pdv = {
  page: 'min-h-screen h-screen bg-[#e8eaef] flex flex-col overflow-hidden',
  shell: 'flex-1 flex flex-col h-full p-4 gap-4 min-h-0 max-w-[1920px] mx-auto w-full overflow-hidden',
  grid: 'flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0 overflow-hidden',
  card: 'flex flex-col h-full bg-white rounded-2xl shadow-[0_4px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] overflow-hidden',
  label: 'block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2',
  kbd: 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-400 border border-zinc-200/80',
  input:
    'w-full h-11 px-3.5 bg-[#f4f5f7] border border-transparent rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 transition-all focus:outline-none focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/25',
  inputReadonly:
    'w-full h-11 px-3.5 bg-zinc-100/80 border border-zinc-200/60 rounded-xl text-sm text-zinc-600',
  btnPrimary:
    'inline-flex items-center justify-center h-11 px-5 bg-zinc-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]',
  btnBrand:
    'inline-flex items-center justify-center h-11 px-5 bg-brand hover:bg-brand-hover text-black text-sm font-bold rounded-xl transition-all shadow-sm border border-black/5 active:scale-[0.98]',
  btnGhost:
    'inline-flex items-center justify-center h-9 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-lg transition-colors',
  section: 'rounded-xl bg-[#f8f9fb] border border-zinc-100/80 p-4',
  statBox:
    'flex flex-col items-center justify-center rounded-xl bg-[#f4f5f7] border border-zinc-100 px-3 py-3 min-h-[72px]',
  dropdown:
    'absolute z-50 mt-2 w-full bg-white border border-zinc-100 rounded-xl shadow-[0_12px_40px_rgba(15,23,42,0.12)] max-h-64 overflow-y-auto py-1',
} as const;

export function PDVSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(pdv.section, className)}>
      {title && <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{title}</h3>}
      {children}
    </div>
  );
}

export function PDVLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className={pdv.label}>
      {children}
      {hint && <span className="normal-case tracking-normal font-normal text-zinc-300 ml-1.5">{hint}</span>}
    </label>
  );
}

export function PDVStat({ label, value, highlight }: { label: string; value: string; highlight?: 'brand' | 'warn' | 'ok' }) {
  return (
    <div
      className={cn(
        pdv.statBox,
        highlight === 'brand' && 'bg-brand/20 border-brand/30',
        highlight === 'warn' && 'bg-amber-50 border-amber-100',
        highlight === 'ok' && 'bg-emerald-50 border-emerald-100'
      )}
    >
      <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      <span
        className={cn(
          'text-base font-bold text-zinc-900 mt-0.5 tabular-nums',
          highlight === 'warn' && 'text-amber-800',
          highlight === 'ok' && 'text-emerald-800'
        )}
      >
        {value}
      </span>
    </div>
  );
}
