import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-container',
    secondary: 'bg-surface-dim text-primary border border-outline-variant hover:bg-surface-variant',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-variant hover:text-primary',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-8 text-base',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
