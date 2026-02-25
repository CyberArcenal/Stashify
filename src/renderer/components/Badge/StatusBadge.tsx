// components/StatusBadge.tsx
import React from 'react';

export type Statuses = 'pending' | 'confirmed' | 'completed' | 'received' | 'cancelled' | 'refunded';

interface StatusBadgeProps {
  status: Statuses;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = false,
  className = ''
}) => {
  // Status configuration - Modern & Professional
  const statusConfig = {
    pending: {
      label: 'Pending',
      icon: '⏳',
      class: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500'
    },
    confirmed: {
      label: 'Confirmed',
      icon: '✅',
      class: 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      dotColor: 'bg-blue-500'
    },
    completed: {
      label: 'Completed',
      icon: '🎉',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      dotColor: 'bg-emerald-500'
    },
    received: {
      label: 'Received',
      icon: '📦',
      class: 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
      dotColor: 'bg-teal-500'
    },
    cancelled: {
      label: 'Cancelled',
      icon: '❌',
      class: 'bg-red-50 text-red-700 border border-red-200 shadow-xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500'
    },
    refunded: {
      label: 'Refunded',
      icon: '↩️',
      class: 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      dotColor: 'bg-purple-500'
    },

    unknown: {
      label: 'Unknown',
      icon: '❓',
      class: 'bg-gray-50 text-gray-700 border border-gray-200 shadow-xs dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
      dotColor: 'bg-gray-500'
        }
  };

  const config = statusConfig[status] || statusConfig['unknown'];

  // Size classes
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

  const iconSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
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
      {showIcon && (
        <span className={iconSize[size]}>
          {config.icon}
        </span>
      )}
      {!showIcon && (
        <div
          className={`rounded-full ${config.dotColor} ${dotSize[size]}`}
        />
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;