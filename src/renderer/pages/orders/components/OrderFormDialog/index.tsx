// src/renderer/pages/sales/components/SalesFormDialog/index.tsx
import React from "react";
import Modal from "../../../../components/UI/Modal";
import Button from "../../../../components/UI/Button";
import { dialogs } from "../../../../utils/dialogs";
import { useSalesForm } from "./hooks/useSalesForm";
import { useStockValidation } from "./hooks/useStockValidation";
import { CustomerSection } from "./components/CustomerSection";
import { OrderSummary } from "./components/OrderSummary";
import { ItemRow } from "./components/ItemRow";
import type { SalesFormDialogProps } from "./types";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

export const SalesFormDialog: React.FC<SalesFormDialogProps> = (props) => {
  const { isOpen, mode, orderId, initialData, onClose, onSuccess } = props;

  const {
    register,
    handleSubmit,
    control,
    errors,
    isSubmitting,
    fields,
    items,
    customerId,
    subtotal,
    tax_amount,
    totalBeforePoints,
    finalTotal,
    usePoints,
    pointsAmount,
    customerBalance,
    pointsError,
    loyalty_points_enabled,
    handleUsePointsChange,
    handleUseAllPoints,
    expandedItems,
    addItem,
    removeItem,
    toggleExpand,
    expandAll,
    collapseAll,
    updateItem,
    loadProductTaxes,
    loadVariantTaxes,
    setPointsAmount,
    setValue,
    onSubmit,
  } = useSalesForm(mode, orderId, initialData, onSuccess, onClose);

  const {
    itemStock,
    loadingStock,
    fetchStockQuantity,
    hasStockError,
    isAnyStockLoading,
  } = useStockValidation(items, fields, finalTotal);

  const handleProductChange = (
    index: number,
    id: number | null,
    product?: any,
  ) => {
    updateItem(index, {
      productId: id,
      productName: product?.name,
      variantId: null,
      variantName: undefined,
      unit_price: product?.net_price || 0,
      discount: 0,
    });
    if (id) {
      loadProductTaxes(id, index);
      // Also fetch stock for this product (no variant)
      fetchStockQuantity(
        fields[index].id,
        id,
        null,
        items[index]?.warehouseId ?? null,
      );
    }
  };

  const handleVariantChange = (
    index: number,
    id: number | null,
    variant?: any,
  ) => {
    updateItem(index, {
      variantId: id,
      variantName: variant?.name,
      unit_price: variant?.net_price || items[index].unit_price,
    });
    if (id && items[index].productId) {
      loadVariantTaxes(id, index);
      fetchStockQuantity(
        fields[index].id,
        items[index].productId!,
        id,
        items[index]?.warehouseId ?? null,
      );
    }
  };

  const handleWarehouseChange = (index: number, id: number | null) => {
    updateItem(index, { warehouseId: id });
    if (items[index].productId) {
      fetchStockQuantity(
        fields[index].id,
        items[index].productId!,
        items[index].variantId ?? null,
        id,
      );
    }
  };

  const handleClose = async () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      safetyClose={true}
      onClose={handleClose}
      title={mode === "add" ? "Create Order" : "Edit Order"}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <CustomerSection
                mode={mode}
                customerId={customerId}
                onCustomerChange={(id) => setValue("customerId", id)}
                customerBalance={customerBalance}
                usePoints={usePoints}
                pointsAmount={pointsAmount}
                totalBeforePoints={totalBeforePoints}
                pointsError={pointsError}
                loyaltyPointsEnabled={loyalty_points_enabled}
                onUsePointsChange={handleUsePointsChange}
                onPointsAmountChange={setPointsAmount}
                onUseAllPoints={handleUseAllPoints}
              />
              {/* Notes */}
              <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Order Notes
                </label>
                <textarea
                  {...register("notes")}
                  rows={3}
                  className="compact-input w-full border rounded-md"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--sidebar-text)",
                  }}
                  placeholder="Enter notes or special instructions"
                />
              </div>
              <OrderSummary
                itemsCount={items.length}
                subtotal={subtotal}
                tax_amount={tax_amount}
                totalBeforePoints={totalBeforePoints}
                usePoints={usePoints}
                pointsAmount={pointsAmount}
                finalTotal={finalTotal}
              />
            </div>

            {/* Right Column: Items */}
            <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Items ({items.length})
                </h3>
                <div className="flex gap-1">
                  {items.length > 1 && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={expandAll}
                        icon={ChevronDown}
                      >
                        <span className="hidden sm:inline">Expand</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={collapseAll}
                        icon={ChevronUp}
                      >
                        <span className="hidden sm:inline">Collapse</span>
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={addItem}
                    icon={Plus}
                  >
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="min-h-[200px] max-h-[400px] overflow-y-auto pr-1 space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[var(--text-secondary)]">
                    No items added. Click "Add Item" to start.
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <ItemRow
                      key={field.id}
                      index={index}
                      item={items[index]}
                      fieldId={field.id}
                      isExpanded={expandedItems.includes(index)}
                      available={itemStock[field.id] || 0}
                      isLoading={!!loadingStock[field.id]}
                      onToggleExpand={() => toggleExpand(index)}
                      onRemove={() => removeItem(index)}
                      onUpdate={(updates) => updateItem(index, updates)}
                      onProductChange={(id, product) =>
                        handleProductChange(index, id, product)
                      }
                      onVariantChange={(id, variant) =>
                        handleVariantChange(index, id, variant)
                      }
                      onWarehouseChange={(id) =>
                        handleWarehouseChange(index, id)
                      }
                      onFetchStock={(whId) => {
                        if (items[index].productId) {
                          fetchStockQuantity(
                            field.id,
                            items[index].productId!,
                            items[index].variantId ?? null,
                            whId,
                          );
                        }
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-color)] shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              if (
                !(await dialogs.confirm({
                  title: "Close Order Dialog",
                  message: "Are you sure you want to close this dialog?",
                }))
              )
                return;
              handleClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={
              isSubmitting ||
              // !!pointsError ||
              hasStockError ||
              isAnyStockLoading
            }
          >
            {isSubmitting
              ? "Saving..."
              : mode === "add"
                ? "Create Order"
                : "Update Order"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SalesFormDialog;
