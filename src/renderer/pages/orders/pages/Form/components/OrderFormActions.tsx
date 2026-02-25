// components/OrderForm/OrderFormActions.tsx
import React from "react";
import { Save } from "lucide-react";

interface OrderFormActionsProps {
    mode: "add" | "edit";
    isSubmitting: boolean;
    onCancel: () => void;
}

const OrderFormActions: React.FC<OrderFormActionsProps> = ({
    mode,
    isSubmitting,
    onCancel,
}) => {
    return (
        <div className="flex justify-end space-x-2 mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border rounded text-sm compact-button hover:bg-[var(--cancel-button-hover)]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--sidebar-text)' }}
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-[var(--sidebar-text)] rounded text-sm compact-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-[var(--submit-button-hover)]"
                style={{ backgroundColor: 'var(--accent-blue)' }}
            >
                <Save className="w-3 h-3 mr-1" />
                {isSubmitting
                    ? "Saving..."
                    : mode === "add"
                        ? "Create Order"
                        : "Update Order"}
            </button>
        </div>
    );
};

export default OrderFormActions;