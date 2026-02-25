// components/ActionBadge.tsx
import React from 'react';

export type ActionType = 
  | 'order_allocation' | 'order_cancellation' | 'order_confirmation' | 'order_completed' | 'order_refund'
  | 'manual_adjustment' | 'return' | 'transfer_in' | 'transfer_out' | 'damage' | 'replenishment'
  | 'stock_take' | 'expiry' | 'found' | 'theft' | 'correction' | 'quick_increase' | 'quick_decrease'
  | 'bulk_increase' | 'bulk_decrease' | 'variant_adjustment' | 'quarantine' | 'consignment'
  | 'donation' | 'production' | 'recall' | 'purchase_receive' | 'purchase_cancel';

interface ActionBadgeProps {
  action: ActionType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const ActionBadge: React.FC<ActionBadgeProps> = ({
  action,
  size = 'sm',
  showIcon = false,
  className = ''
}) => {
  // Action configuration - Modern Style
  const actionConfig = {
    // Order related - Blue shades
    order_allocation: {
      label: 'Order Allocation',
      icon: '📦',
      class: 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      dotColor: 'bg-blue-500'
    },
    order_cancellation: {
      label: 'Order Cancellation',
      icon: '❌',
      class: 'bg-red-50 text-red-700 border border-red-200 shadow-xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500'
    },
    order_confirmation: {
      label: 'Order Confirmation',
      icon: '✅',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      dotColor: 'bg-emerald-500'
    },
    order_completed: {
      label: 'Order Completion',
      icon: '🎉',
      class: 'bg-green-50 text-green-700 border border-green-200 shadow-xs dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      dotColor: 'bg-green-500'
    },
    order_refund: {
      label: 'Order Refund',
      icon: '↩️',
      class: 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      dotColor: 'bg-purple-500'
    },

    // Manual adjustments - Amber shades
    manual_adjustment: {
      label: 'Manual Adjustment',
      icon: '⚙️',
      class: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500'
    },

    // Returns & Transfers - Teal shades
    return: {
      label: 'Return / Restock',
      icon: '🔄',
      class: 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
      dotColor: 'bg-teal-500'
    },
    transfer_in: {
      label: 'Stock Transfer In',
      icon: '📥',
      class: 'bg-teal-50 text-teal-700 border border-teal-200 shadow-xs dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
      dotColor: 'bg-teal-500'
    },
    transfer_out: {
      label: 'Stock Transfer Out',
      icon: '📤',
      class: 'bg-orange-50 text-orange-700 border border-orange-200 shadow-xs dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      dotColor: 'bg-orange-500'
    },

    // Negative actions - Red shades
    damage: {
      label: 'Stock Damage',
      icon: '💥',
      class: 'bg-red-50 text-red-700 border border-red-200 shadow-xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500'
    },
    theft: {
      label: 'Theft',
      icon: '🚨',
      class: 'bg-red-50 text-red-700 border border-red-200 shadow-xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500'
    },

    // Positive actions - Green shades
    replenishment: {
      label: 'Stock Replenishment',
      icon: '📈',
      class: 'bg-green-50 text-green-700 border border-green-200 shadow-xs dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      dotColor: 'bg-green-500'
    },
    found: {
      label: 'Found',
      icon: '🔍',
      class: 'bg-green-50 text-green-700 border border-green-200 shadow-xs dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      dotColor: 'bg-green-500'
    },

    // Stock operations - Indigo shades
    stock_take: {
      label: 'Stock Take',
      icon: '📋',
      class: 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
      dotColor: 'bg-indigo-500'
    },
    expiry: {
      label: 'Expiry',
      icon: '📅',
      class: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500'
    },

    // Quick operations - Cyan shades
    quick_increase: {
      label: 'Quick Increase',
      icon: '⚡',
      class: 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-xs dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800',
      dotColor: 'bg-cyan-500'
    },
    quick_decrease: {
      label: 'Quick Decrease',
      icon: '⚡',
      class: 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800',
      dotColor: 'bg-rose-500'
    },

    // Bulk operations - Violet shades
    bulk_increase: {
      label: 'Bulk Increase',
      icon: '📊',
      class: 'bg-violet-50 text-violet-700 border border-violet-200 shadow-xs dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
      dotColor: 'bg-violet-500'
    },
    bulk_decrease: {
      label: 'Bulk Decrease',
      icon: '📊',
      class: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 shadow-xs dark:bg-fuchsia-900/20 dark:text-fuchsia-400 dark:border-fuchsia-800',
      dotColor: 'bg-fuchsia-500'
    },

    // Other adjustments
    variant_adjustment: {
      label: 'Variant Adjustment',
      icon: '🔄',
      class: 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
      dotColor: 'bg-sky-500'
    },
    correction: {
      label: 'Correction',
      icon: '✏️',
      class: 'bg-sky-50 text-sky-700 border border-sky-200 shadow-xs dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
      dotColor: 'bg-sky-500'
    },

    // Special cases
    quarantine: {
      label: 'Quarantine',
      icon: '🚫',
      class: 'bg-orange-50 text-orange-700 border border-orange-200 shadow-xs dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      dotColor: 'bg-orange-500'
    },
    consignment: {
      label: 'Consignment Stock',
      icon: '🤝',
      class: 'bg-lime-50 text-lime-700 border border-lime-200 shadow-xs dark:bg-lime-900/20 dark:text-lime-400 dark:border-lime-800',
      dotColor: 'bg-lime-500'
    },
    donation: {
      label: 'Donation',
      icon: '🎁',
      class: 'bg-pink-50 text-pink-700 border border-pink-200 shadow-xs dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800',
      dotColor: 'bg-pink-500'
    },
    production: {
      label: 'Production',
      icon: '🏭',
      class: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500'
    },
    recall: {
      label: 'Product Recall',
      icon: '⚠️',
      class: 'bg-red-50 text-red-700 border border-red-200 shadow-xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500'
    },

    // Purchase operations
    purchase_receive: {
      label: 'Purchase Receive',
      icon: '📥',
      class: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
      dotColor: 'bg-emerald-500'
    },
    purchase_cancel: {
      label: 'Purchase Cancelled',
      icon: '❌',
      class: 'bg-red-50 text-red-700 border border-red-200 shadow-xs dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500'
    }
  };

  const config = actionConfig[action] || {
    label: action,
    icon: '📝',
    class: 'bg-gray-50 text-gray-700 border border-gray-200 shadow-xs dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
    dotColor: 'bg-gray-500'
  };

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

export default ActionBadge;