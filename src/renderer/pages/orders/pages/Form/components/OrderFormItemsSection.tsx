// components/OrderForm/OrderFormItemsSection.tsx
import React, { useState } from "react";
import { ShoppingCart, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { OrderFormSectionProps } from "@/renderer/api/order";
import OrderItem from "./OrderItem";
import OrderStatusDisplay from "./OrderStatus";

const OrderFormItemsSection: React.FC<
  OrderFormSectionProps & { isSubmitting: boolean }
> = ({ formData, errors, isSubmitting, onFormDataChange, onErrorsChange }) => {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const addOrderItem = () => {
    const newItem = {
      productId: 0,
      productName: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
      warehouseId: 0,
    };

    const updatedItems = [...formData.items, newItem];
    onFormDataChange({
      ...formData,
      items: updatedItems,
    });

    setExpandedItems((prev) => [...prev, prev.length]);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    onFormDataChange({
      ...formData,
      items: updatedItems,
    });

    setExpandedItems((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    );
  };

  const updateOrderItem = (index: number, updatedItem: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = updatedItem;

    const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal;

    onFormDataChange({
      ...formData,
      items: updatedItems,
      subtotal,
      total,
    });
  };

  const expandAllItems = () => {
    setExpandedItems(formData.items.map((_, index) => index));
  };

  const collapseAllItems = () => {
    setExpandedItems([]);
  };

  const toggleItemExpanded = (index: number) => {
    setExpandedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <div className="space-y-4">
      {/* Order Items Section */}
      <div
        className="compact-stats rounded p-3"
        style={{ backgroundColor: "var(--card-secondary-bg)" }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3
            className="text-xs font-medium flex items-center"
            style={{ color: "var(--sidebar-text)" }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Order Items ({formData.items.length})
          </h3>
          <div className="flex space-x-1">
            {formData.items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={expandAllItems}
                  className="flex items-center text-xs compact-button"
                  style={{
                    backgroundColor: "var(--text-tertiary)",
                    color: "white",
                  }}
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAllItems}
                  className="flex items-center text-xs compact-button"
                  style={{
                    backgroundColor: "var(--text-tertiary)",
                    color: "white",
                  }}
                >
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Collapse All
                </button>
              </>
            )}
            <button
              type="button"
              onClick={addOrderItem}
              className="flex items-center text-xs compact-button"
              style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Item
            </button>
          </div>
        </div>

        {errors.items && (
          <p className="mt-1 text-xs text-red-600 mb-2">{errors.items}</p>
        )}

        {formData.items.length === 0 ? (
          <div
            className="text-center py-2 text-xs"
            style={{ color: "var(--sidebar-text)" }}
          >
            No items added to the order
          </div>
        ) : (
          <div className="space-y-2">
            {formData.items.map((item, index) => (
              <OrderItem
                key={index}
                index={index}
                item={item}
                isExpanded={expandedItems.includes(index)}
                isSubmitting={isSubmitting}
                onToggleExpanded={toggleItemExpanded}
                onRemove={removeOrderItem}
                onUpdate={updateOrderItem}
              />
            ))}
          </div>
        )}
      </div>

      <OrderStatusDisplay
        status={formData.status}
        itemCount={formData.items.length}
      />
    </div>
  );
};

export default OrderFormItemsSection;
