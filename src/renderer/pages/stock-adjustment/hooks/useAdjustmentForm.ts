// src/renderer/pages/stock-adjustment/hooks/useAdjustmentForm.ts
import { useState, useEffect } from "react";
import { dialogs } from "../../../utils/dialogs";
import { showSuccess, showToast } from "../../../utils/notification";
import stockItemAPI from "../../../api/core/stockItem";

interface UseAdjustmentFormProps {
  onSuccess: () => void;
}

interface AdjustmentFormState {
  productId: number | null;
  variantId: number | null;
  warehouseId: number | null;
  quantity: number;
  reason: string;
  adjustmentType: "manual" | "correction" | "damage" | "return";
}

export interface UseAdjustmentFormReturn extends AdjustmentFormState {
  submitting: boolean;
  currentStock: number;
  stockItemId: number | null;
  quickActions: { label: string; value: number }[];
  adjustmentTypes: { value: string; label: string }[];
  setField: <K extends keyof AdjustmentFormState>(
    key: K,
    value: AdjustmentFormState[K],
  ) => void;
  handleQuickAction: (value: number) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

const useAdjustmentForm = ({
  onSuccess,
}: UseAdjustmentFormProps): UseAdjustmentFormReturn => {
  const [form, setForm] = useState<AdjustmentFormState>({
    productId: null,
    variantId: null,
    warehouseId: null,
    quantity: 0,
    reason: "",
    adjustmentType: "manual",
  });

  const [submitting, setSubmitting] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);
  const [stockItemId, setStockItemId] = useState<number | null>(null);

  const quickActions = [
    { label: "Quick +10", value: 10 },
    { label: "Quick +50", value: 50 },
    { label: "Quick -5", value: -5 },
    { label: "Quick -10", value: -10 },
  ];

  const adjustmentTypes = [
    { value: "manual", label: "Manual Adjustment" },
    { value: "correction", label: "Correction" },
    { value: "damage", label: "Damage/Loss" },
    { value: "return", label: "Return" },
  ];

  // Update current stock when product/variant/warehouse changes
  useEffect(() => {
    const fetchCurrentStock = async () => {
      if (!form.productId || !form.warehouseId) {
        setCurrentStock(0);
        setStockItemId(null);
        return;
      }

      try {
        const response = await stockItemAPI.getByProduct(form.productId);
        console.log("product response", response);
        if (!response.status) throw new Error(response.message);

        const match = response.data.find(
          (item) =>
            item.warehouseId === form.warehouseId &&
            (form.variantId
              ? item.variantId === form.variantId
              : !item.variantId),
        );

        if (match) {
          setCurrentStock(match.quantity);
          setStockItemId(match.id);
        } else {
          setCurrentStock(0);
          setStockItemId(null);
        }
      } catch (error) {
        console.error("Failed to fetch current stock:", error);
        setCurrentStock(0);
        setStockItemId(null);
      }
    };

    fetchCurrentStock();
  }, [form.productId, form.variantId, form.warehouseId]);

  const setField = <K extends keyof AdjustmentFormState>(
    key: K,
    value: AdjustmentFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuickAction = (value: number) => {
    setForm((prev) => ({ ...prev, quantity: prev.quantity + value }));
    showToast(`Quick adjustment: ${value > 0 ? "+" : ""}${value}`, "info", {
      duration: 2000,
    });
  };

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!form.productId) errors.push("• Please select a product");
    if (!form.warehouseId) errors.push("• Please select a warehouse");
    if (form.quantity === 0) errors.push("• Quantity cannot be zero");
    if (!form.reason.trim()) errors.push("• Please provide a reason");
    if (form.quantity < 0 && Math.abs(form.quantity) > currentStock) {
      errors.push(
        `• Cannot decrease more than current stock (${currentStock} units)`,
      );
    }
    if (!stockItemId)
      errors.push("• Stock item not found for the selected combination");

    if (errors.length > 0) {
      dialogs.error(
        "Validation Error",
        `Please fix the following issues:\n\n${errors.join("\n")}`,
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const proceed = await dialogs.confirm({
      title: "Confirm Adjustment",
      message: `Are you sure you want to adjust stock by ${form.quantity > 0 ? "+" : ""}${form.quantity} units?`,
      confirmText: "Continue",
      cancelText: "Cancel",
      icon: "info",
    });
    if (!proceed) return;

    setSubmitting(true);
    try {
      const typeLabel =
        adjustmentTypes.find((t) => t.value === form.adjustmentType)?.label ||
        "";
      const fullReason = `${typeLabel}: ${form.reason}`;

      const response = await stockItemAPI.adjust({
        stockItemId: stockItemId!,
        adjustment: form.quantity,
        reason: fullReason,
      });

      if (!response.status) throw new Error(response.message);

      showSuccess(
        `Stock adjustment successful! ${form.quantity > 0 ? "Added" : "Removed"} ${Math.abs(form.quantity)} units.`,
      );

      reset();
      onSuccess();
    } catch (error: any) {
      dialogs.error(
        "Adjustment Failed",
        error.message || "Failed to process adjustment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({
      productId: null,
      variantId: null,
      warehouseId: null,
      quantity: 0,
      reason: "",
      adjustmentType: "manual",
    });
  };

  return {
    ...form,
    submitting,
    currentStock,
    stockItemId,
    quickActions,
    adjustmentTypes,
    setField,
    handleQuickAction,
    handleSubmit,
    reset,
  };
};

export default useAdjustmentForm;
