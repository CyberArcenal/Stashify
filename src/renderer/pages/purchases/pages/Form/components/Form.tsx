// components/PurchaseOrderForm.tsx
import React, { useState, useEffect } from "react";
import {
  Save,
  X,
  Plus,
  Trash2,
  Truck,
  AlertCircle,
  Info,
  Warehouse,
  Package,
} from "lucide-react";
import { SupplierData } from "@/renderer/api/supplier";
import { WarehouseData } from "@/renderer/api/warehouse";
import { ProductData } from "@/renderer/api/product";
import ProductSelect from "@/renderer/components/Selects/product";
import { SupplierTax, systemSettingsAPI } from "@/renderer/api/systemSettings";

// Types (unchanged)
export interface PurchaseOrderItem {
  productId: number;
  variantId?: number;
  qty: number;
  cost: number;
}

export interface PurchaseOrderFormData {
  supplier: number;
  warehouseId: number;
  items: PurchaseOrderItem[];
  notes?: string;
  date: string;
}

// types/purchaseOrder.ts
export interface PurchaseOrderFormProps {
  mode: "add" | "edit";
  initialData?: Partial<PurchaseOrderFormData>;
  suppliers: any[];
  warehouses: any[];
  products: any[];
  preSelectedSupplierId?: string;
  preSelectedProductId?: string; // ADD THIS
  preSelectedVariantId?: string; // ADD THIS
  onSubmit: (data: PurchaseOrderFormData) => void;
  onCancel: () => void;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  mode = "add",
  initialData,
  suppliers,
  warehouses,
  products,
  preSelectedSupplierId,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier: 0,
    warehouseId: 0,
    items: [{ productId: 0, qty: 1, cost: 0 }],
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [supplierTax, setSupplierTax] = useState<SupplierTax>({
    enabled: false,
    rate: 0,
  });
  const [subtotal, setSubtotal] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [errors, setErrors] = useState<
    Partial<Record<keyof PurchaseOrderFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Initialize form with initialData (unchanged)
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        items: initialData.items || [{ productId: 0, qty: 1, cost: 0 }],
        notes: initialData.notes || "",
        warehouseId: initialData.warehouseId || 0,
      }));
    }

    if (preSelectedSupplierId && suppliers.length > 0) {
      const supplier = suppliers.find(
        (s) => s.id === Number(preSelectedSupplierId),
      );
      if (supplier) {
        setFormData((prev) => ({
          ...prev,
          supplierName: supplier.name,
        }));
        setFormData((prev) => ({
          ...prev,
          supplier: supplier.id,
        }));
      }
    }

    if (warehouses.length > 0 && !initialData?.warehouseId) {
      setFormData((prev) => ({
        ...prev,
        warehouseId: warehouses[0].id,
      }));
    }
  }, [initialData, preSelectedSupplierId, suppliers, warehouses]);

  // Fetch supplier tax settings (unchanged)
  useEffect(() => {
    const fetchTaxSettings = async () => {
      try {
        const taxSettings = await systemSettingsAPI.getSupplierTaxSettings();
        setSupplierTax(taxSettings);
      } catch (error) {
        console.error("Failed to fetch supplier tax settings:", error);
      }
    };
    fetchTaxSettings();
  }, []);

  // Calculate totals (unchanged)
  useEffect(() => {
    const calculatedSubtotal = formData.items.reduce((sum, item) => {
      return sum + item.qty * item.cost;
    }, 0);

    const calculatedTaxAmount = supplierTax?.enabled
      ? calculatedSubtotal * (supplierTax.rate / 100)
      : 0;

    const calculatedTotal = calculatedSubtotal + calculatedTaxAmount;

    setSubtotal(calculatedSubtotal);
    setTaxAmount(calculatedTaxAmount);
    setTotal(calculatedTotal);
  }, [formData.items, supplierTax]);

  // All handler functions remain unchanged...
  const handleInputChange = (
    field: keyof PurchaseOrderFormData,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setTouched((prev) => new Set(prev).add(field));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseOrderItem,
    value: number,
  ) => {
    const updatedItems = [...formData.items];

    if (field === "productId") {
      updatedItems[index] = {
        ...updatedItems[index],
        productId: value as number,
        variantId: undefined,
        cost: 0,
      };

      const product = products.find((p) => p.id === value);
      if (product) {
        updatedItems[index].cost = parseFloat(product.price) || 0;
      }
    } else if (field === "variantId") {
      updatedItems[index] = {
        ...updatedItems[index],
        variantId: value,
      };

      const product = products.find(
        (p) => p.id === updatedItems[index].productId,
      );
      if (product && product.variants_data && value) {
        const variant = product.variants_data.find((v: any) => v.id === value);
        if (variant) {
          updatedItems[index].cost = parseFloat(variant.price) || 0;
        }
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }

    handleInputChange("items", updatedItems);
  };

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      productId: 0,
      qty: 1,
      cost: 0,
    };
    handleInputChange("items", [...formData.items, newItem]);
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      handleInputChange("items", updatedItems);
    }
  };

  // Helper functions remain unchanged...
  const getVariantsForProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product?.variants_data || [];
  };

  const getProduct = (productId: number) => {
    return products.find((p) => p.id === productId);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PurchaseOrderFormData, string>> = {};

    if (!formData.supplier) {
      newErrors.supplier = "Supplier is required";
    }

    if (!formData.warehouseId) {
      newErrors.warehouseId = "Warehouse is required";
    }

    let hasItemErrors = false;
    let itemErrors: string[] = [];

    formData.items.forEach((item, index) => {
      if (!item.productId) {
        hasItemErrors = true;
        itemErrors.push(`Item ${index + 1}: Product is required`);
      }
      if (item.qty <= 0) {
        hasItemErrors = true;
        itemErrors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (item.cost < 0) {
        hasItemErrors = true;
        itemErrors.push(`Item ${index + 1}: Cost cannot be negative`);
      }

      const product = getProduct(item.productId);
      if (
        product?.variants_data &&
        product.variants_data.length > 0 &&
        !item.variantId
      ) {
        hasItemErrors = true;
        itemErrors.push(
          `Item ${index + 1}: Variant is required for this product`,
        );
      }
    });

    if (hasItemErrors) {
      newErrors.items = itemErrors.join(", ");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allFields: (keyof PurchaseOrderFormData)[] = [
      "supplier",
      "warehouseId",
      "items",
    ];
    setTouched(new Set([...allFields]));

    if (!validateForm()) {
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = (field: keyof PurchaseOrderFormData): boolean => {
    return touched.has(field) && !!errors[field];
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getItemSubtotal = (item: PurchaseOrderItem): number => {
    return item.qty * item.cost;
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden">
      {/* Form Header - Reduced padding */}
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="w-5 h-5 text-[var(--sidebar-text)] mr-2" />
            <h2 className="text-base font-semibold text-[var(--sidebar-text)]">
              {mode === "add" ? "Create Purchase Order" : "Edit Purchase Order"}
            </h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--sidebar-text)] rounded hover:bg-[var(--card-secondary-bg)] transition-colors"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        {/* Reduced gap from gap-8 to gap-6 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Basic Information */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[var(--sidebar-text)] border-b border-[var(--border-color)] pb-1">
              Order Information
            </h3>

            {/* Supplier Selection - Smaller input */}
            <div>
              <label
                htmlFor="supplierName"
                className="block text-xs font-medium text-[var(--sidebar-text)] mb-1"
              >
                Supplier *
              </label>
              <div className="relative">
                <Truck className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-3 h-3" />
                <select
                  id="supplierName"
                  value={formData.supplier}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    handleInputChange("supplier", selectedId);
                  }}
                  className={`w-full pl-7 pr-2 py-2 text-sm border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${
                    hasError("supplier")
                      ? "border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]"
                      : "border-[var(--input-border)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                  }`}
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              {hasError("supplier") && (
                <p className="mt-1 text-xs text-[var(--danger-color)] flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.supplier}
                </p>
              )}
            </div>

            {/* Warehouse Selection - Smaller input */}
            <div>
              <label
                htmlFor="warehouseId"
                className="block text-xs font-medium text-[var(--sidebar-text)] mb-1"
              >
                Warehouse *
              </label>
              <div className="relative">
                <Warehouse className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] w-3 h-3" />
                <select
                  id="warehouseId"
                  value={formData.warehouseId}
                  onChange={(e) =>
                    handleInputChange("warehouseId", parseInt(e.target.value))
                  }
                  className={`w-full pl-7 pr-2 py-2 text-sm border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${
                    hasError("warehouseId")
                      ? "border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-[var(--danger-color)]"
                      : "border-[var(--input-border)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                  }`}
                >
                  <option value={0}>Select a warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>
              {hasError("warehouseId") && (
                <p className="mt-1 text-xs text-[var(--danger-color)] flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.warehouseId}
                </p>
              )}
            </div>

            {/* Tax Information - Smaller */}
            <div
              className={`p-3 rounded-md text-xs ${
                supplierTax?.enabled
                  ? "bg-[var(--accent-blue-light)]"
                  : "bg-[var(--card-secondary-bg)]"
              }`}
            >
              <div className="flex items-center mb-1">
                <Info
                  className={`w-3 h-3 mr-1 ${
                    supplierTax?.enabled
                      ? "text-[var(--accent-blue)]"
                      : "text-[var(--text-tertiary)]"
                  }`}
                />
                <span
                  className={`font-medium ${
                    supplierTax?.enabled
                      ? "text-[var(--accent-emerald)]"
                      : "text-[var(--sidebar-text)]"
                  }`}
                >
                  Tax Information
                </span>
              </div>
              <p
                className={`${
                  supplierTax?.enabled
                    ? "text-[var(--accent-blue)]"
                    : "text-[var(--sidebar-text)]"
                }`}
              >
                {supplierTax?.enabled
                  ? `Supplier tax is ENABLED (${supplierTax.rate}% rate applied automatically)`
                  : "Supplier tax is DISABLED (No tax will be applied to this purchase)"}
              </p>
            </div>

            {/* Notes - Smaller */}
            <div>
              <label
                htmlFor="notes"
                className="block text-xs font-medium text-[var(--sidebar-text)] mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={2}
                className="w-full p-2 text-sm border border-[var(--input-border)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                placeholder="Additional notes or instructions..."
              />
            </div>
          </div>

          {/* Right Column - Items Table */}
          <div className="space-y-4">
            <h3 className="text-base font-medium text-[var(--sidebar-text)] border-b border-[var(--border-color)] pb-1">
              Order Items
            </h3>

            {/* Items Container - Reduced padding */}
            <div className="bg-[var(--card-secondary-bg)] rounded-md p-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-medium text-[var(--sidebar-text)]">
                  Items ({formData.items.length})
                </h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-2 py-1 bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--accent-blue-hover)] flex items-center text-xs transition-colors"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </button>
              </div>

              {hasError("items") && (
                <div className="mb-3 p-2 bg-[var(--accent-red-light)] border border-[var(--accent-red-dark)] rounded-md">
                  <p className="text-xs text-[var(--danger-color)] flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    {errors.items}
                  </p>
                </div>
              )}

              {/* Items Grid - Reduced gap and padding */}
              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const product = getProduct(item.productId);
                  const variants = getVariantsForProduct(item.productId);
                  const hasVariants = variants.length > 0;
                  const itemSubtotal = getItemSubtotal(item);

                  return (
                    <div
                      key={index}
                      className="bg-[var(--card-bg)] rounded-md border border-[var(--border-color)] p-3"
                    >
                      {/* Reduced gap from gap-4 to gap-3 */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Product Selection */}
                        <div className="md:col-span-5">
                          <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                            Product *
                          </label>
                          <ProductSelect
                            value={item.productId}
                            onChange={(
                              productId,
                              productName,
                              price,
                              sale_price,
                            ) =>
                              handleItemChange(index, "productId", productId)
                            }
                            disabled={isSubmitting}
                          />
                        </div>

                        {/* Variant Selection */}
                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                            Variant {hasVariants ? "*" : ""}
                          </label>
                          {hasVariants ? (
                            <select
                              value={item.variantId || 0}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "variantId",
                                  parseInt(e.target.value) || 0,
                                )
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
                          ) : (
                            <div className="w-full p-1 text-xs text-[var(--text-tertiary)] bg-[var(--input-bg)] rounded border border-[var(--input-border)]">
                              No variants available
                            </div>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "qty",
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="w-full p-1 text-xs border border-[var(--input-border)] rounded bg-[var(--input-bg)] text-[var(--input-text)]"
                          />
                        </div>

                        {/* Unit Cost */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                            Unit Cost *
                          </label>
                          <div className="relative">
                            <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] text-xs">
                              ₱
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.cost}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "cost",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-full pl-4 pr-1 py-1 text-xs border border-[var(--input-border)] rounded bg-[var(--input-bg)] text-[var(--input-text)]"
                            />
                          </div>
                        </div>

                        {/* Remove Button */}
                        <div className="md:col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={formData.items.length === 1}
                            className="p-1 text-[var(--accent-red)] hover:text-[var(--danger-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded hover:bg-[var(--accent-red-light)]"
                            title="Remove item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Item Subtotal - Smaller */}
                      <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex justify-between items-center">
                        <span className="text-xs text-[var(--sidebar-text)]">
                          Item Subtotal:
                        </span>
                        <span className="text-xs font-semibold text-[var(--sidebar-text)]">
                          {formatCurrency(itemSubtotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary - Reduced padding */}
              <div className="mt-4 p-3 bg-[var(--card-bg)] rounded-md border border-[var(--border-color)]">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--sidebar-text)]">
                      Subtotal:
                    </span>
                    <span className="text-[var(--sidebar-text)] font-medium">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {supplierTax?.enabled && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--sidebar-text)]">
                        Tax ({supplierTax?.rate}%):
                      </span>
                      <span className="text-[var(--sidebar-text)] font-medium">
                        {formatCurrency(taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1 border-t border-[var(--border-color)]">
                    <span className="text-sm font-semibold text-[var(--sidebar-text)]">
                      Total:
                    </span>
                    <span className="text-base font-bold text-[var(--sidebar-text)]">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions - Smaller buttons */}
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
      </form>
    </div>
  );
};

export default PurchaseOrderForm;
