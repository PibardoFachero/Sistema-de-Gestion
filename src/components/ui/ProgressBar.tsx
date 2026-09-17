import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  progress: number; // 0 to 100
  color?: 'primary' | 'amber' | 'green' | 'red';
  height?: 'sm' | 'md';
}

export function ProgressBar({ progress, color = 'amber', height = 'md', className, ...props }: ProgressBarProps) {
  const colors = {
    primary: 'bg-primary',
    amber: 'bg-accent-amber',
    green: 'bg-status-success',
    red: 'bg-status-urgent',
  };

  const heights = {
    sm: 'h-1',
    md: 'h-1.5',
  };

  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-outline-variant/20', heights[height], className)} {...props}>
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', colors[color])}
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  );
}
