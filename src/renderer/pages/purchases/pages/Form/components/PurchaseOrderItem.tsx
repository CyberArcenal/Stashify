// components/PurchaseOrderForm/PurchaseOrderItem.tsx
import React from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import ProductSelect from "@/renderer/components/Selects/product";
import { PurchaseOrderItem as PurchaseOrderItemType } from "./Form";
import { formatCurrency } from "@/renderer/utils/formatters";

interface PurchaseOrderItemProps {
  index: number;
  item: PurchaseOrderItemType;
  isExpanded: boolean;
  isSubmitting: boolean;
  products: any[];
  onToggleExpanded: (index: number) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, item: PurchaseOrderItemType) => void;
}

const PurchaseOrderItem: React.FC<PurchaseOrderItemProps> = ({
  index,
  item,
  isExpanded,
  isSubmitting,
  products,
  onToggleExpanded,
  onRemove,
  onUpdate,
}) => {
  const handleProductSelect = (
    productId: number,
    productName: string,
    price: number,
    sale_price: number,
    cost_per_item: number,
  ) => {
    const updatedItem = {
      ...item,
      productId,
      cost: cost_per_item || 0,
      variantId: undefined, // Reset variant when product changes
    };
    onUpdate(index, updatedItem);
  };

  const handleVariantChange = (variantId: number) => {
    const product = products.find((p) => p.id === item.productId);
    let cost = item.cost;

    if (product && product.variants_data && variantId) {
      const variant = product.variants_data.find(
        (v: any) => v.id === variantId,
      );
      if (variant) {
        // console.log(variant)
        cost = parseFloat(variant.cost_per_item) || 0;
      }
    }

    const updatedItem = {
      ...item,
      variantId,
      cost,
    };
    onUpdate(index, updatedItem);
  };

  const handleQuantityChange = (qty: number) => {
    const updatedItem = {
      ...item,
      qty,
    };
    onUpdate(index, updatedItem);
  };

  const handleCostChange = (cost: number) => {
    const updatedItem = {
      ...item,
      cost,
    };
    onUpdate(index, updatedItem);
  };

  const getVariantsForProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product?.variants_data || [];
  };

  const getProduct = (productId: number) => {
    return products.find((p) => p.id === productId);
  };

  const getItemSummary = (item: PurchaseOrderItemType, maxLength = 80) => {
    if (!item.productId) return "No product selected";

    const truncate = (s = "", n = 30) =>
      s.length > n ? s.slice(0, n - 1) + "…" : s;

    const product = getProduct(item.productId);
    const productName = product
      ? truncate(product.name, 25)
      : "Unknown Product";

    const variants = getVariantsForProduct(item.productId);
    const variant = item.variantId
      ? ` Var:${truncate(variants.find((v: any) => v.id === item.variantId)?.name || "Variant", 15)}`
      : "";
    const qty = ` x${item.qty}`;
    const cost = ` @${formatCurrency(item.cost || 0)}`;
    const total = ` Tot:${formatCurrency(item.qty * item.cost)}`;

    const str = `${productName}${variant}${qty}${cost}${total}`;
    return str.length > maxLength ? str.slice(0, maxLength - 1) + "…" : str;
  };

  const variants = getVariantsForProduct(item.productId);
  const hasVariants = variants.length > 0;
  const itemSubtotal = item.qty * item.cost;

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
                Product *
              </label>
              <ProductSelect
                value={item.productId}
                onChange={handleProductSelect}
                disabled={isSubmitting}
              />
            </div>

            {/* Variant Selection */}
            {hasVariants && (
              <div className="col-span-2">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Variant {hasVariants ? "*" : ""}
                </label>
                <select
                  value={item.variantId || 0}
                  onChange={(e) =>
                    handleVariantChange(parseInt(e.target.value) || 0)
                  }
                  className="w-full p-1 text-xs border border-[var(--input-border)] rounded bg-[var(--input-bg)] text-[var(--input-text)]"
                >
                  <option value={0}>Select Variant</option>
                  {variants.map((variant: any) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.name} ({variant.sku})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) =>
                  handleQuantityChange(parseInt(e.target.value) || 1)
                }
                className="w-full p-1 text-xs border border-[var(--input-border)] rounded bg-[var(--input-bg)] text-[var(--input-text)]"
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Unit Cost *
              </label>
              <div className="relative">
                <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] text-xs">
                  ₱
                </span>
                <input
                  disabled={true}
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.cost}
                  onChange={(e) =>
                    handleCostChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-full pl-4 pr-1 py-1 text-xs border border-[var(--input-border)] rounded bg-[var(--input-bg)] text-[var(--input-text)]"
                />
              </div>
            </div>

            {/* Item Subtotal */}
            <div className="col-span-2">
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Item Subtotal
              </label>
              <div
                className="p-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  color: "var(--sidebar-text)",
                }}
              >
                {formatCurrency(itemSubtotal)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderItem;
