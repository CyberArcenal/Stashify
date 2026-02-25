// components/OrderForm/OrderStatusDisplay.tsx
import React from "react";
import { User } from "lucide-react";

interface OrderStatusDisplayProps {
    status: 'pending' | 'confirmed' | 'complete' | 'cancelled';
    itemCount: number;
}

const OrderStatusDisplay: React.FC<OrderStatusDisplayProps> = ({ status, itemCount }) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-[var(--accent-orange-light)] text-[var(--accent-orange)]';
            case 'confirmed':
                return 'bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)]';
            case 'complete':
                return 'bg-[var(--accent-green-light)] text-[var(--accent-green)]';
            case 'cancelled':
                return 'bg-[var(--accent-red-light)] text-[var(--accent-red)]';
            default:
                return 'bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Pending';
            case 'confirmed':
                return 'Confirmed';
            case 'complete':
                return 'Complete';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status;
        }
    };

    return (
        <div className="compact-stats rounded p-3" style={{ backgroundColor: 'var(--card-secondary-bg)' }}>
            <h3 className="text-xs font-medium mb-2 flex items-center" style={{ color: 'var(--sidebar-text)' }}>
                <User className="w-4 h-4 mr-2" />
                Current Status
            </h3>
            <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
                    {getStatusText(status)}
                </span>
                <span className="text-xs" style={{ color: 'var(--sidebar-text)' }}>
                    {itemCount} item(s)
                </span>
            </div>
        </div>
    );
};

export default OrderStatusDisplay;