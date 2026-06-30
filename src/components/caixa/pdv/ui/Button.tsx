import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Button as SystemButton, type ButtonProps as SystemButtonProps } from '@/components/Button';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantMap: Record<ButtonVariant, NonNullable<SystemButtonProps['variant']>> = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
  outline: 'outline',
};

const sizeMap: Record<ButtonSize, NonNullable<SystemButtonProps['size']>> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => (
    <SystemButton
      ref={ref}
      type={type}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      className={cn(fullWidth && 'w-full', 'gap-2', className)}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </SystemButton>
  )
);
Button.displayName = 'Button';
