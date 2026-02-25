// components/OrderForm/OrderItem.tsx
import React from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { OrderItem as OrderItemType } from "@/renderer/api/order";
import ProductWithVariant from "@/renderer/components/Selects/ProductWithVariant";
import WarehouseSelect from "@/renderer/components/Selects/Warehouse";
import { formatCurrency } from "@/renderer/utils/formatters";

interface OrderItemProps {
  index: number;
  item: OrderItemType;
  isExpanded: boolean;
  isSubmitting: boolean;
  onToggleExpanded: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, item: OrderItemType) => void;
}

const OrderItem: React.FC<OrderItemProps> = ({
  index,
  item,
  isExpanded,
  isSubmitting,
  onToggleExpanded,
  onRemove,
  onUpdate,
}) => {
  const handleProductVariantSelect = (
    productId: number,
    variantId: number | null,
    productName: string,
    variantName: string | null,
    price: number,
  ) => {
    const updatedItem = {
      ...item,
      productId,
      productName,
      variantId: variantId || undefined,
      variantName: variantName || undefined,
      unitPrice: price,
      total: item.quantity * price,
    };

    onUpdate(index, updatedItem);
  };

  const handleWarehouseSelect = (
    warehouseId: number,
    warehouseName: string,
    warehouseLocation: string,
  ) => {
    const updatedItem = {
      ...item,
      warehouseId,
      warehouseName,
    };

    onUpdate(index, updatedItem);
  };

  const handleQuantityChange = (quantity: number) => {
    const updatedItem = {
      ...item,
      quantity,
      total: quantity * item.unitPrice,
    };

    onUpdate(index, updatedItem);
  };

  const getItemSummary = (item: OrderItemType, maxLength = 80) => {
    if (!item.productId) return "No product";

    const truncate = (s = "", n = 30) =>
      s.length > n ? s.slice(0, n - 1) + "…" : s;

    const name = truncate(item.productName || "Unnamed", 30);
    const variant = item.variantName
      ? ` Var:${truncate(item.variantName, 18)}`
      : "";
    const warehouse = item.warehouseName
      ? ` Wh:${truncate(item.warehouseName, 18)}`
      : "";
    const qty = ` x${item.quantity}`;
    const price = ` ${formatCurrency(item.unitPrice || 0)}`;
    const total = ` Tot:${formatCurrency(item.total || 0)}`;

    const str = `${name}${variant}${warehouse}${qty}${price}${total}`;
    return str.length > maxLength ? str.slice(0, maxLength - 1) + "…" : str;
  };

  return (
    <div
      className="rounded border text-xs"
      style={{
        backgroundColor: "var(--input-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Item Header - Always Visible */}
      <div
        className="flex justify-between items-center p-2 cursor-pointer hover:bg-[var(--card-secondary-bg)] transition-colors"
        onClick={() => onToggleExpanded(index)}
      >
        <div className="flex items-center flex-1">
          <span
            className="font-medium mr-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            Item {index + 1}
          </span>
          <span style={{ color: "var(--sidebar-text)" }}>
            {getItemSummary(item)}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="p-1"
            style={{ color: "var(--danger-color)" }}
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(index);
            }}
            className="p-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Item Details - Collapsible */}
      {isExpanded && (
        <div
          className="p-2 border-t"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="grid grid-cols-2 gap-2">
            {/* Product Selection */}
            <div className="col-span-2">
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Product & Variant *
              </label>
              <ProductWithVariant
                value={{ productId: item.productId, variantId: item.variantId }}
                onChange={(
                  productId,
                  variantId,
                  productName,
                  variantName,
                  price,
                ) => {
                  handleProductVariantSelect(
                    productId,
                    variantId,
                    productName,
                    variantName,
                    price,
                  );
                }}
                disabled={isSubmitting}
              />
            </div>

            {/* Warehouse Selection */}
            <div className="col-span-2">
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Warehouse (Optional)
              </label>
              <WarehouseSelect
                value={item.warehouseId || 0}
                onChange={(warehouseId, warehouseName, warehouseLocation) =>
                  handleWarehouseSelect(
                    warehouseId,
                    warehouseName,
                    warehouseLocation,
                  )
                }
                disabled={isSubmitting}
                required={false}
                showStockInfo={true}
                productId={item.productId}
                variantId={item.variantId}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                {item.warehouseId
                  ? `Selected: ${item.warehouseName}`
                  : "Will use default warehouse if not specified"}
              </p>
            </div>

            {/* Quantity */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) =>
                  handleQuantityChange(parseInt(e.target.value) || 1)
                }
                className="w-full p-1 border rounded compact-input"
                style={{
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                }}
              />
            </div>

            {/* Unit Price */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Unit Price
              </label>
              <input
                type="number"
                step="0.01"
                value={item.unitPrice}
                readOnly
                className="w-full p-1 border rounded compact-input"
                style={{
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--card-secondary-bg)",
                  color: "var(--input-text)",
                }}
              />
            </div>

            {/* Total */}
            <div className="col-span-2">
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total
              </label>
              <div
                className="p-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  color: "var(--sidebar-text)",
                }}
              >
                {formatCurrency(item.total || 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderItem;
