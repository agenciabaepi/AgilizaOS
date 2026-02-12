// src/components/Select.tsx
import { cn } from '@/lib/utils'; // caso use utilitário de classes
import { forwardRef, SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, children, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700 dark:text-zinc-300">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-zinc-500 transition',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
);

Select.displayName = 'Select';