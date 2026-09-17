'use client';

import type { ReactNode } from 'react';

interface NovaOSSectionProps {
  step: number;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  optional?: boolean;
}

export default function NovaOSSection({
  step,
  title,
  description,
  icon,
  children,
  optional,
}: NovaOSSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 dark:from-zinc-800 dark:to-zinc-900 dark:border-zinc-700">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
          {step}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            {icon && <span className="text-gray-500 dark:text-zinc-400">{icon}</span>}
            <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">{title}</h4>
            {optional && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
                opcional
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
