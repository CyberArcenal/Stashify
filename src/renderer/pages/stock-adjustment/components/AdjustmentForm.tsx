// src/renderer/pages/stock-adjustment/components/AdjustmentForm.tsx
import React from "react";
import { Plus, Minus, AlertTriangle } from "lucide-react";
import ProductSelect from "../../../components/Selects/Product";
import ProductVariantSelect from "../../../components/Selects/ProductVariant";
import WarehouseSelect from "../../../components/Selects/Warehouse";
import type { UseAdjustmentFormReturn } from "../hooks/useAdjustmentForm";
import type { Product } from "../../../api/core/product";
import type { Warehouse } from "../../../api/core/warehouse";

interface AdjustmentFormProps {
  form: UseAdjustmentFormReturn;
  products: Product[];
  warehouses: Warehouse[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const AdjustmentForm: React.FC<AdjustmentFormProps> = ({
  form,
  products,
  warehouses,
  onSubmit,
}) => {
  const {
    productId,
    variantId,
    warehouseId,
    quantity,
    reason,
    adjustmentType,
    submitting,
    currentStock,
    stockItemId,
    quickActions,
    adjustmentTypes,
    setField,
    handleQuickAction,
  } = form;

  return (
    <div
      className="compact-card rounded-md mb-4 p-3"
      style={{
        backgroundColor: "var(--card-secondary-bg)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="font-semibold text-sm flex items-center gap-2"
          style={{ color: "var(--sidebar-text)" }}
        >
          <Plus className="icon-sm" />
          Add Stock Adjustment
        </h3>
        <div className="flex gap-1">
          {quickActions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickAction(action.value)}
              disabled={!productId || !warehouseId}
              className="compact-button text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor:
                  action.value > 0
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
                color: "var(--sidebar-text)",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-sm"
      >
        {/* Product */}
        <div className="lg:col-span-2">
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Product *
          </label>
          <ProductSelect
            value={productId}
            onChange={(id) => setField("productId", id)}
            disabled={submitting}
            placeholder="Select product..."
          />
        </div>

        {/* Variant */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Variant
          </label>
          <ProductVariantSelect
            value={variantId}
            onChange={(id) => setField("variantId", id)}
            productId={productId || undefined}
            disabled={submitting || !productId}
            placeholder="Select variant (optional)"
          />
        </div>

        {/* Warehouse */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Warehouse *
          </label>
          <WarehouseSelect
            value={warehouseId}
            onChange={(id) => setField("warehouseId", id)}
            disabled={submitting}
            placeholder="Select warehouse..."
          />
        </div>

        {/* Current Stock */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Current Stock
          </label>
          <div className="relative">
            <input
              type="number"
              value={currentStock}
              readOnly
              className="compact-input w-full rounded-md pr-8"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
            {currentStock <= 10 && currentStock > 0 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <AlertTriangle
                  className="icon-xs"
                  style={{ color: "var(--accent-red)" }}
                />
              </div>
            )}
          </div>
          {currentStock <= 10 && currentStock > 0 && (
            <div
              className="text-xs mt-1 flex items-center gap-1"
              style={{ color: "var(--accent-red)" }}
            >
              <AlertTriangle className="icon-xs" />
              Low stock warning
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Quantity *
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) =>
              setField("quantity", parseInt(e.target.value) || 0)
            }
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor:
                quantity > 0
                  ? "var(--accent-green)"
                  : quantity < 0
                    ? "var(--accent-red)"
                    : "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
            placeholder="Enter quantity"
            required
          />
          {quantity < 0 && (
            <div
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Max decrease: {currentStock} units
            </div>
          )}
        </div>

        {/* Adjustment Type */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Type
          </label>
          <select
            value={adjustmentType}
            onChange={(e) => setField("adjustmentType", e.target.value as any)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
          >
            {adjustmentTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div className="lg:col-span-2">
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            Reason *
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setField("reason", e.target.value)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
            placeholder="e.g., Inventory count correction"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2 lg:col-span-6">
          <button
            type="submit"
            disabled={
              submitting ||
              !productId ||
              !warehouseId ||
              quantity === 0 ||
              !reason.trim() ||
              (quantity < 0 && Math.abs(quantity) > currentStock) ||
              !stockItemId
            }
            className="compact-button w-full text-[var(--sidebar-text)] rounded-md font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
            style={{
              backgroundColor:
                quantity > 0
                  ? "var(--accent-green)"
                  : quantity < 0
                    ? "var(--accent-red)"
                    : "var(--accent-blue)",
            }}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : quantity > 0 ? (
              <>
                <Plus className="icon-sm mr-xs" />
                Increase Stock ({quantity} units)
              </>
            ) : quantity < 0 ? (
              <>
                <Minus className="icon-sm mr-xs" />
                Decrease Stock ({Math.abs(quantity)} units)
              </>
            ) : (
              "Adjust Stock"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdjustmentForm;
