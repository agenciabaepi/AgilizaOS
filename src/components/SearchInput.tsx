import React, { InputHTMLAttributes, forwardRef } from 'react';
import { FiSearch } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div className={cn('relative w-full', containerClassName)}>
      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-5 h-5 pointer-events-none" />
      <input
        ref={ref}
        type="text"
        className={cn(
          'h-12 w-full pl-12 pr-4 rounded-lg border border-gray-300 bg-white text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400 transition dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500',
          className
        )}
        {...props}
      />
    </div>
  )
);

SearchInput.displayName = 'SearchInput'; 