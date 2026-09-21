import { cn } from '@/lib/utils';
import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'urgent' | 'priority' | 'success' | 'streak';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-surface-container text-on-surface-variant',
    urgent: 'bg-status-urgent-bg text-status-urgent',
    priority: 'bg-status-attention-bg text-status-attention',
    success: 'bg-status-success-bg text-status-success',
    streak: 'bg-status-streak-bg text-status-streak font-semibold border border-status-streak/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
