// components/PurchaseOrderForm/PurchaseOrderItemsSection.tsx
import React, { useState } from "react";
import { Package, Plus, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

import PurchaseOrderItem from "./PurchaseOrderItem";
import { PurchaseOrderFormData } from "./Form";

interface PurchaseOrderItemsSectionProps {
    formData: PurchaseOrderFormData;
    errors: any;
    isSubmitting: boolean;
    products: any[];
    supplierTax: any;
    subtotal: number;
    taxAmount: number;
    total: number;
    onFormDataChange: (data: PurchaseOrderFormData) => void;
}

const PurchaseOrderItemsSection: React.FC<PurchaseOrderItemsSectionProps> = ({
    formData,
    errors,
    isSubmitting,
    products,
    supplierTax,
    subtotal,
    taxAmount,
    total,
    onFormDataChange,
}) => {
    const [expandedItems, setExpandedItems] = useState<number[]>([]);

    const addOrderItem = () => {
        const newItem = {
            productId: 0,
            qty: 1,
            cost: 0,
        };

        const updatedItems = [...formData.items, newItem];
        onFormDataChange({
            ...formData,
            items: updatedItems
        });

        setExpandedItems(prev => [...prev, prev.length]);
    };

    const removeOrderItem = (index: number) => {
        const updatedItems = formData.items.filter((_, i) => i !== index);
        onFormDataChange({
            ...formData,
            items: updatedItems
        });

        setExpandedItems(prev =>
            prev.filter(i => i !== index).map(i => i > index ? i - 1 : i)
        );
    };

    const updateOrderItem = (index: number, updatedItem: any) => {
        const updatedItems = [...formData.items];
        updatedItems[index] = updatedItem;
        onFormDataChange({
            ...formData,
            items: updatedItems
        });
    };

    const expandAllItems = () => {
        setExpandedItems(formData.items.map((_, index) => index));
    };

    const collapseAllItems = () => {
        setExpandedItems([]);
    };

    const toggleItemExpanded = (index: number) => {
        setExpandedItems(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            {/* Order Items Section */}
            <div className="compact-stats rounded p-3" style={{ backgroundColor: 'var(--card-secondary-bg)' }}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-medium flex items-center" style={{ color: 'var(--sidebar-text)' }}>
                        <Package className="w-4 h-4 mr-2" />
                        Order Items ({formData.items.length})
                    </h3>
                    <div className="flex space-x-1">
                        {formData.items.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={expandAllItems}
                                    className="flex items-center text-xs compact-button px-2 py-1 rounded"
                                    style={{ backgroundColor: 'var(--text-tertiary)', color: 'white' }}
                                >
                                    <ChevronDown className="w-3 h-3 mr-1" />
                                    Expand All
                                </button>
                                <button
                                    type="button"
                                    onClick={collapseAllItems}
                                    className="flex items-center text-xs compact-button px-2 py-1 rounded"
                                    style={{ backgroundColor: 'var(--text-tertiary)', color: 'white' }}
                                >
                                    <ChevronUp className="w-3 h-3 mr-1" />
                                    Collapse All
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={addOrderItem}
                            className="flex items-center text-xs compact-button px-2 py-1 rounded"
                            style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Item
                        </button>
                    </div>
                </div>

                {errors.items && (
                    <div className="mb-3 p-2 bg-[var(--accent-red-light)] border border-[var(--accent-red-dark)] rounded-md">
                        <p className="text-xs text-[var(--danger-color)] flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                            {errors.items}
                        </p>
                    </div>
                )}

                {formData.items.length === 0 ? (
                    <div className="text-center py-2 text-xs" style={{ color: 'var(--sidebar-text)' }}>
                        No items added to the purchase order
                    </div>
                ) : (
                    <div className="space-y-2">
                        {formData.items.map((item, index) => (
                            <PurchaseOrderItem
                                key={index}
                                index={index}
                                item={item}
                                isExpanded={expandedItems.includes(index)}
                                isSubmitting={isSubmitting}
                                products={products}
                                onToggleExpanded={toggleItemExpanded}
                                onRemove={removeOrderItem}
                                onUpdate={updateOrderItem}
                            />
                        ))}
                    </div>
                )}

                {/* Total Summary */}
                <div className="mt-4 p-3 bg-[var(--card-bg)] rounded-md border border-[var(--border-color)]">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-[var(--sidebar-text)]">Subtotal:</span>
                            <span className="text-[var(--sidebar-text)] font-medium">
                                {formatCurrency(subtotal)}
                            </span>
                        </div>

                        {supplierTax?.enabled? (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[var(--sidebar-text)]">Tax ({supplierTax.rate}%):</span>
                                <span className="text-[var(--sidebar-text)] font-medium">
                                    {formatCurrency(taxAmount)}
                                </span>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-[var(--sidebar-text)]">Tax:</span>
                                <span className="text-[var(--sidebar-text)] font-medium text-[var(--text-tertiary)]">
                                    Not activated
                                </span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-1 border-t border-[var(--border-color)]">
                            <span className="text-sm font-semibold text-[var(--sidebar-text)]">Total:</span>
                            <span className="text-base font-bold text-[var(--sidebar-text)]">
                                {formatCurrency(total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderItemsSection;