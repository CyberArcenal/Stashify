// components/OrderForm/OrderFormHeader.tsx
import React from "react";
import { ShoppingCart, X } from "lucide-react";

interface OrderFormHeaderProps {
    mode: "add" | "edit";
    onCancel?: () => void;
}

const OrderFormHeader: React.FC<OrderFormHeaderProps> = ({ mode, onCancel }) => {
    return (
        <div style={{ borderBottomColor: 'var(--border-color)' }} className="px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" style={{ color: 'var(--sidebar-text)' }} />
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--sidebar-text)' }}>
                        {mode === "add" ? "Create New Order" : "Edit Order"}
                    </h2>
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="p-1 rounded hover:bg-[var(--card-secondary-bg)]"
                        style={{ color: 'var(--sidebar-text)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default OrderFormHeader;