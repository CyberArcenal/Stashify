// components/PurchaseOrderForm/PurchaseOrderFormHeader.tsx
import React from "react";
import { Package, X } from "lucide-react";

interface PurchaseOrderFormHeaderProps {
    mode: "add" | "edit";
    onCancel?: () => void;
}

const PurchaseOrderFormHeader: React.FC<PurchaseOrderFormHeaderProps> = ({ mode, onCancel }) => {
    return (
        <div className="border-b border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Package className="w-5 h-5 text-[var(--sidebar-text)] mr-2" />
                    <h2 className="text-sm font-semibold text-[var(--sidebar-text)]">
                        {mode === "add" ? "Create Purchase Order" : "Edit Purchase Order"}
                    </h2>
                </div>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--sidebar-text)] rounded hover:bg-[var(--card-secondary-bg)] transition-colors"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderFormHeader;