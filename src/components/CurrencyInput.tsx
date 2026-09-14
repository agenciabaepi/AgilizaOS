'use client';

import { forwardRef, useCallback, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import {
  formatCurrencyInputValue,
  maskCurrencyInput,
  parseCurrencyNumber,
} from '@/lib/currencyMask';

export type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value?: string | number | null;
  onValueChange?: (value: number) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  withSymbol?: boolean;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value,
      onValueChange,
      onChange,
      withSymbol = false,
      className,
      placeholder = '0,00',
      inputMode = 'numeric',
      ...props
    },
    ref
  ) {
    const display = formatCurrencyInputValue(value, { withSymbol });

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const masked = maskCurrencyInput(event.target.value, { withSymbol });
        event.target.value = masked;
        onValueChange?.(parseCurrencyNumber(masked));
        onChange?.(event);
      },
      [onChange, onValueChange, withSymbol]
    );

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode={inputMode}
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(className)}
      />
    );
  }
);
