// src/renderer/pages/sales/components/SalesFormDialog/components/ItemRow.tsx
import React from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import ProductSelect from "../../../../../components/Selects/Product";
import ProductVariantSelect from "../../../../../components/Selects/ProductVariant";
import WarehouseSelect from "../../../../../components/Selects/Warehouse";
import { formatCurrency } from "../../../../../utils/formatters";
import type { OrderItemForm } from "../types";

interface ItemRowProps {
  index: number;
  item: OrderItemForm;
  fieldId: string;
  isExpanded: boolean;
  available: number;
  isLoading: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<OrderItemForm>) => void;
  onProductChange: (id: number | null, product?: any) => void;
  onVariantChange: (id: number | null, variant?: any) => void;
  onWarehouseChange: (id: number | null, wh?: any) => void;
  onFetchStock: (warehouseId: number | null) => void;
}

export const ItemRow: React.FC<ItemRowProps> = ({
  index,
  item,
  fieldId,
  isExpanded,
  available,
  isLoading,
  onToggleExpand,
  onRemove,
  onUpdate,
  onProductChange,
  onVariantChange,
  onWarehouseChange,
  onFetchStock,
}) => {
  return (
    <div className="border rounded-md" style={{ borderColor: "var(--border-color)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 cursor-pointer hover:bg-[var(--card-hover-bg)]"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium" style={{ color: "var(--sidebar-text)" }}>
            Item {index + 1}
          </span>
          {item.productName && (
            <span className="truncate max-w-[150px]" style={{ color: "var(--text-secondary)" }}>
              {item.productName} {item.variantName && `- ${item.variantName}`}
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            x{item.quantity} = {formatCurrency(item.lineNetTotal)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 rounded-full hover:bg-red-100 text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button type="button" className="p-1">
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-3 border-t space-y-3" style={{ borderColor: "var(--border-color)" }}>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Product *</label>
              <ProductSelect
                value={item.productId}
                onChange={(id, product) => onProductChange(id, product)}
                placeholder="Select product"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Variant (optional)</label>
              <ProductVariantSelect
                value={item.variantId}
                onChange={(id, variant) => onVariantChange(id, variant)}
                productId={item.productId || undefined}
                placeholder="Select variant"
                disabled={!item.productId}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Warehouse (optional)</label>
              <WarehouseSelect
                value={item.warehouseId}
                onChange={(id, wh) => {
                  onWarehouseChange(id, wh);
                  onFetchStock(id);
                }}
                placeholder="Select warehouse"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Quantity</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
                    className="compact-input w-full border rounded-md"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--sidebar-text)",
                    }}
                  />
                  {isLoading ? (
                    <span className="text-xs text-gray-500 whitespace-nowrap">Checking...</span>
                  ) : (
                    <span
                      className={`text-xs whitespace-nowrap ${
                        item.quantity > available ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      Avail: {available}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Unit Price (net)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => onUpdate({ unit_price: parseFloat(e.target.value) || 0 })}
                  className="compact-input w-full border rounded-md"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--sidebar-text)",
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Discount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={item.quantity * item.unit_price}
                value={item.discount}
                onChange={(e) => onUpdate({ discount: parseFloat(e.target.value) || 0 })}
                className="compact-input w-full border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>
            <div className="flex justify-end">
              <span className="text-sm font-medium" style={{ color: "var(--accent-green)" }}>
                Line Net Total: {formatCurrency(item.lineNetTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};