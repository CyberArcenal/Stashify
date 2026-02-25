// components/WarehouseTypeBadge.tsx
import React from 'react';
import { Warehouse, Store, Globe } from 'lucide-react';

export type LocationType = 'warehouse' | 'store' | 'online';

interface WarehouseTypeBadgeProps {
    type: LocationType;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
    className?: string;
}

const WarehouseTypeBadge: React.FC<WarehouseTypeBadgeProps> = ({
    type,
    size = 'sm',
    showIcon = true,
    className = ''
}) => {
    // Type configuration - Modern Style
    const typeConfig = {
        warehouse: {
            label: 'Warehouse',
            icon: <Warehouse className="icon-sm" />,
            class: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
            dotColor: 'bg-emerald-500'
        },
        store: {
            label: 'Store',
            icon: <Store className="icon-sm" />,
            class: 'bg-green-50 text-green-700 border border-green-200 shadow-xs dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
            dotColor: 'bg-green-500'
        },
        online: {
            label: 'Online Store',
            icon: <Globe className="icon-sm" />,
            class: 'bg-purple-50 text-purple-700 border border-purple-200 shadow-xs dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
            dotColor: 'bg-purple-500'
        }
    };

    const config = typeConfig[type];

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
        sm: 'w-3 h-3',
        md: 'w-3.5 h-3.5',
        lg: 'w-4 h-4'
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
            {showIcon ? (
                <div className={iconSize[size]}>
                    {config.icon}
                </div>
            ) : (
                <div
                    className={`rounded-full ${config.dotColor} ${dotSize[size]}`}
                />
            )}
            {config.label}
        </span>
    );
};

export default WarehouseTypeBadge;