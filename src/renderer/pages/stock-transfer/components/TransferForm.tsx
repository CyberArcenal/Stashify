// src/renderer/pages/stock-transfer/components/TransferForm.tsx
import React from "react";
import { Truck, Package, AlertTriangle, Plus } from "lucide-react";
import ProductSelect from "../../../components/Selects/Product";
import ProductVariantSelect from "../../../components/Selects/ProductVariant";
import WarehouseSelect from "../../../components/Selects/Warehouse";
import type { UseTransferFormReturn } from "../hooks/useTransferForm";
import type { Product } from "../../../api/core/product";
import type { Warehouse } from "../../../api/core/warehouse";

interface TransferFormProps {
  form: UseTransferFormReturn;
  products: Product[];
  warehouses: Warehouse[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const TransferForm: React.FC<TransferFormProps> = ({
  form,
  products,
  warehouses,
  onSubmit,
}) => {
  const {
    productId,
    variantId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    notes,
    submitting,
    sourceStock,
    destStock,
    sourceStockItemId,
    destStockItemId,
    quickActions,
    setField,
    handleQuickAction,
  } = form;

  // Filter destination warehouses (exclude source)
  const destinationWarehouses = warehouses.filter(w => w.id !== fromWarehouseId);

  return (
    <div
      className="compact-card rounded-md mb-4 p-3"
      style={{ backgroundColor: "var(--card-secondary-bg)", border: "1px solid var(--border-color)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--sidebar-text)" }}>
          <Truck className="icon-sm" />
          Create New Transfer
        </h3>
        <div className="flex gap-1">
          {quickActions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleQuickAction(action.value)}
              disabled={!productId || !fromWarehouseId}
              className="compact-button text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent-green)",
                color: "var(--sidebar-text)",
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-sm">
        {/* Product */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
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
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
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

        {/* From Warehouse */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            From Warehouse *
          </label>
          <WarehouseSelect
            value={fromWarehouseId}
            onChange={(id) => setField("fromWarehouseId", id)}
            disabled={submitting}
            placeholder="Select source"
          />
        </div>

        {/* To Warehouse */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            To Warehouse *
          </label>
           <WarehouseSelect
            value={toWarehouseId}
            onChange={(id) => setField("toWarehouseId", id)}
            disabled={submitting}
            placeholder="Select destination"
          />
        </div>

        {/* Source Stock */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Source Stock
          </label>
          <div className="relative">
            <input
              type="number"
              value={sourceStock}
              readOnly
              className="compact-input w-full rounded-md pr-8"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
            {sourceStock <= 10 && sourceStock > 0 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <AlertTriangle className="icon-xs" style={{ color: "var(--accent-red)" }} />
              </div>
            )}
          </div>
        </div>

        {/* Destination Stock */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Destination Stock
          </label>
          <input
            type="number"
            value={destStock}
            readOnly
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Quantity *
          </label>
          <input
            type="number"
            min="1"
            max={sourceStock}
            value={quantity}
            onChange={(e) => setField("quantity", parseInt(e.target.value) || 0)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: quantity > 0 ? "var(--accent-green)" : "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
            placeholder="Enter quantity"
            required
            disabled={!fromWarehouseId}
          />
        </div>

        {/* Notes */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Remarks / Reference
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setField("notes", e.target.value)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
            placeholder="e.g., Stock replenishment"
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2 lg:col-span-6">
          <button
            type="submit"
            disabled={
              submitting ||
              !productId ||
              !fromWarehouseId ||
              !toWarehouseId ||
              quantity <= 0 ||
              quantity > sourceStock ||
              !sourceStockItemId ||
              !destStockItemId
            }
            className="compact-button w-full text-[var(--sidebar-text)] rounded-md font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Truck className="icon-sm mr-xs" />
                Transfer {quantity} Units
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransferForm;