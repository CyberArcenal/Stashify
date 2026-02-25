// components/InventoryStatusBadge.tsx
import React from 'react';

interface InventoryStatusBadgeProps {
  processed: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({
  processed,
  size = 'sm',
  className = ''
}) => {
  const config = processed
    ? {
      label: 'Processed',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      dotColor: 'bg-emerald-500',
      icon: '✓'
    }
    : {
      label: 'Pending',
      class: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500',
      icon: '⏳'
    };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs font-semibold',
    md: 'px-3 py-1.5 text-sm font-semibold',
    lg: 'px-4 py-2 text-base font-semibold'
  };

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-2 rounded-lg
        ${sizeClasses[size]}
        ${config.class}
        ${className}
      `}
    >
      <div
        className={`rounded-full ${config.dotColor} ${dotSize[size]}`}
      />
      {config.label}
    </span>
  );
};

export default InventoryStatusBadge;