import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ className, hoverable = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-[0_4px_20px_-2px_rgba(74,53,37,0.05),0_2px_6px_-1px_rgba(74,53,37,0.02)] transition-all',
        hoverable &&
          'hover:-translate-y-1 hover:shadow-[0_12px_36px_-4px_rgba(74,53,37,0.08),0_4px_12px_-2px_rgba(74,53,37,0.04)] hover:border-outline-variant/60 cursor-pointer',
        className,
      )}
      {...props}
    />
  );
}
