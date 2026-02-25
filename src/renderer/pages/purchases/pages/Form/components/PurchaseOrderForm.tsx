// components/PurchaseOrderForm/PurchaseOrderForm.tsx
import React, { useState, useEffect, useRef } from "react";
import PurchaseOrderFormHeader from "./PurchaseOrderFormHeader";
import PurchaseOrderSupplierSection from "./PurchaseOrderSupplierSection";
import PurchaseOrderItemsSection from "./PurchaseOrderItemsSection";
import PurchaseOrderFormActions from "./PurchaseOrderFormActions";
import { systemSettingsAPI } from "@/renderer/api/systemSettings";
import { PurchaseOrderFormData, PurchaseOrderFormProps } from "./Form";

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  mode = "add",
  initialData,
  suppliers,
  warehouses,
  products,
  preSelectedSupplierId,
  preSelectedProductId, // ADD THIS
  preSelectedVariantId, // ADD THIS
  onSubmit,
  onCancel,
}) => {
  // Storage key para sa draft
  const STORAGE_KEY = `purchase_order_draft_${mode}`;

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier: 0,
    warehouseId: 0,
    items: [{ productId: 0, qty: 1, cost: 0 }],
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [supplierTax, setSupplierTax] = useState<any>({
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
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Refs para sa tracking
  const isInitialDataLoaded = useRef(false);
  const autoSaveInterval = useRef<NodeJS.Timeout>();
  const lastFormDataRef = useRef<PurchaseOrderFormData>(formData);

  // Function para mag-save ng draft sa localStorage
  const saveDraft = (data: PurchaseOrderFormData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
      setHasSavedDraft(true);
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
  };

  // Function para mag-load ng draft mula sa localStorage
  const loadDraft = (): PurchaseOrderFormData | null => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        return JSON.parse(savedDraft);
      }
    } catch (e) {
      console.error("Failed to load draft:", e);
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  };

  // Function para i-clear ang draft
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedDraft(false);
    setLastSaved(null);
  };

  // Initialize form data - isang beses lang sa umpisa
  // components/PurchaseOrderForm/PurchaseOrderForm.tsx - Sa initialization useEffect
  useEffect(() => {
    if (isInitialDataLoaded.current) return;

    let draftData: PurchaseOrderFormData | null = null;

    // Unahin ang draft kung mayroon (para sa add mode)
    if (mode === "add") {
      draftData = loadDraft();
    }

    if (draftData) {
      // Gumamit ng draft data
      setFormData(draftData);
    } else if (initialData) {
      // Gumamit ng initial data
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        items: initialData.items || [{ productId: 0, qty: 1, cost: 0 }],
        notes: initialData.notes || "",
        warehouseId: initialData.warehouseId || 0,
      }));

      // I-handle ang pre-selected product o variant kung walang draft
      if (mode === "add" && (preSelectedProductId || preSelectedVariantId)) {
        // Find the product/variant details
        let selectedProduct: any | undefined;
        let selectedVariant: any | undefined;

        if (preSelectedProductId) {
          selectedProduct = products.find(
            (p) => p.id === Number(preSelectedProductId),
          );
        }

        if (preSelectedVariantId) {
          for (const product of products) {
            if (product.variants_data && product.variants_data.length > 0) {
              const variant = product.variants_data.find(
                (v: any) => v.id === Number(preSelectedVariantId),
              );
              if (variant) {
                selectedVariant = variant;
                selectedProduct = product;
                break;
              }
            }
          }
        }

        if (selectedProduct) {
          let cost = 0;
          let variantId = 0;

          if (selectedVariant) {
            cost = parseFloat(selectedVariant.cost_per_item) || 0;
            variantId = selectedVariant.id;
          } else if (selectedProduct) {
            cost = selectedProduct.cost_per_item || 0;
          }

          // Update the first item with pre-selected product/variant
          setFormData((prev) => ({
            ...prev,
            items: [
              {
                productId: selectedProduct.id,
                variantId: variantId,
                qty: 1,
                cost: cost,
              },
            ],
          }));
        }
      }
    }

    // I-set ang supplier kung may pre-selected
    if (preSelectedSupplierId && suppliers.length > 0) {
      const supplier = suppliers.find(
        (s) => s.id === Number(preSelectedSupplierId),
      );
      if (supplier) {
        setFormData((prev) => ({
          ...prev,
          supplier: supplier.id,
        }));
      }
    }

    // I-set ang warehouse kung wala pang selected
    if (
      warehouses.length > 0 &&
      !initialData?.warehouseId &&
      !draftData?.warehouseId
    ) {
      setFormData((prev) => ({
        ...prev,
        warehouseId: warehouses[0].id,
      }));
    }

    isInitialDataLoaded.current = true;
  }, [
    initialData,
    preSelectedSupplierId,
    preSelectedProductId,
    preSelectedVariantId,
    suppliers,
    warehouses,
    mode,
    products,
  ]);

  // Auto-save effect - i-save ang draft every 30 seconds
  useEffect(() => {
    if (mode === "add") {
      // I-clear ang existing interval
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }

      // I-set ang bagong interval
      autoSaveInterval.current = setInterval(() => {
        // I-save lang kung nagbago ang form data
        if (
          JSON.stringify(formData) !== JSON.stringify(lastFormDataRef.current)
        ) {
          saveDraft(formData);
          lastFormDataRef.current = formData;
        }
      }, 30000); // Auto-save every 30 seconds

      return () => {
        if (autoSaveInterval.current) {
          clearInterval(autoSaveInterval.current);
        }
      };
    }
  }, [formData, mode]);

  // Manual save draft kapag may changes (debounced)
  useEffect(() => {
    if (mode === "add") {
      const timeoutId = setTimeout(() => {
        if (
          JSON.stringify(formData) !== JSON.stringify(lastFormDataRef.current)
        ) {
          saveDraft(formData);
          lastFormDataRef.current = formData;
        }
      }, 2000); // Debounce ng 2 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [formData, mode]);

  // Fetch supplier tax settings
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

  // Calculate totals
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

      const product = products.find((p) => p.id === item.productId);
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

    if (!validateForm()) {
      // I-save muna ang current state bago mag-error
      saveDraft(formData);

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
      // I-clear ang draft pag successful
      clearDraft();
    } catch (error) {
      console.error("Error submitting form:", error);
      // I-save ang current state bilang draft pag may error
      saveDraft(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom onCancel na nag-clear ng draft
  const handleCancel = () => {
    clearDraft();
    onCancel();
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden">
      <PurchaseOrderFormHeader mode={mode} onCancel={handleCancel} />

      <form onSubmit={handleSubmit} className="p-4">
        {/* Draft Notification - show only in add mode */}
        {mode === "add" && hasSavedDraft && (
          <div className="mb-4 p-3 bg-[var(--accent-blue-light)] border border-[var(--accent-blue)] rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full mr-2"></div>
                <p className="text-xs text-[var(--accent-blue)]">
                  Your changes are being auto-saved{" "}
                  {lastSaved && (
                    <span className="text-[var(--text-tertiary)]">
                      (last:{" "}
                      {lastSaved.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      )
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={clearDraft}
                className="text-xs text-[var(--accent-blue)] hover:text-[var(--accent-blue-dark)] underline"
              >
                Clear draft
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PurchaseOrderSupplierSection
            formData={formData}
            errors={errors}
            suppliers={suppliers}
            warehouses={warehouses}
            supplierTax={supplierTax}
            onFormDataChange={setFormData}
          />

          <PurchaseOrderItemsSection
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            products={products}
            supplierTax={supplierTax}
            subtotal={subtotal}
            taxAmount={taxAmount}
            total={total}
            onFormDataChange={setFormData}
          />
        </div>

        <PurchaseOrderFormActions
          mode={mode}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
        />
      </form>
    </div>
  );
};

export default PurchaseOrderForm;
