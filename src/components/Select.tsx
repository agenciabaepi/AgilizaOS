'use client';

import { Listbox } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface ModernSelectProps {
  options: Option[];
  value: Option;
  onChange: (option: Option) => void;
  label?: string;
}

export function Select({ options, value, onChange, label }: ModernSelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      <Listbox value={value} onChange={onChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#cffb6d] sm:text-sm">
            <span className="block truncate">{value?.label || 'Selecione'}</span>
            <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDown size={18} className="text-gray-500" />
            </span>
          </Listbox.Button>

          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            {Array.isArray(options) && options.map((option) => (
              <Listbox.Option
                key={option.value}
                className={({ active }) =>
                  cn(
                    'cursor-pointer select-none relative py-2 pl-10 pr-4',
                    active ? 'bg-[#cffb6d] text-black' : 'text-gray-900'
                  )
                }
                value={option}
              >
                {({ selected }) => (
                  <>
                    <span className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-black">
                        <Check size={16} />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}