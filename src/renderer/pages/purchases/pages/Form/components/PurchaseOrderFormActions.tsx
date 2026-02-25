// components/PurchaseOrderForm/PurchaseOrderFormActions.tsx
import React from "react";
import { Save } from "lucide-react";

interface PurchaseOrderFormActionsProps {
    mode: "add" | "edit";
    isSubmitting: boolean;
    onCancel: () => void;
}

const PurchaseOrderFormActions: React.FC<PurchaseOrderFormActionsProps> = ({
    mode,
    isSubmitting,
    onCancel,
}) => {
    return (
        <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-[var(--border-color)]">
            <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2 border border-[var(--input-border)] rounded-md text-[var(--sidebar-text)] hover:bg-[var(--card-secondary-bg)] transition-colors disabled:opacity-50 text-sm"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors text-sm"
            >
                <Save className="w-3 h-3 mr-1" />
                {isSubmitting
                    ? "Saving..."
                    : mode === "add"
                        ? "Create Purchase Order"
                        : "Update Purchase Order"}
            </button>
        </div>
    );
};

export default PurchaseOrderFormActions;