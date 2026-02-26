// src/renderer/pages/stock-transfer/hooks/useTransferForm.ts
import { useState, useEffect } from "react";
import { dialogs } from "../../../utils/dialogs";
import { showSuccess, showToast } from "../../../utils/notification";
import stockItemAPI from "../../../api/core/stockItem";

interface UseTransferFormProps {
  onSuccess: () => void;
}

interface TransferFormState {
  productId: number | null;
  variantId: number | null;
  fromWarehouseId: number | null;
  toWarehouseId: number | null;
  quantity: number;
  notes: string;
}

export interface UseTransferFormReturn extends TransferFormState {
  submitting: boolean;
  sourceStockItemId: number | null;
  destStockItemId: number | null;
  sourceStock: number;
  destStock: number;
  quickActions: { label: string; value: number }[];
  setField: <K extends keyof TransferFormState>(
    key: K,
    value: TransferFormState[K],
  ) => void;
  handleQuickAction: (value: number) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

const useTransferForm = ({
  onSuccess,
}: UseTransferFormProps): UseTransferFormReturn => {
  const [form, setForm] = useState<TransferFormState>({
    productId: null,
    variantId: null,
    fromWarehouseId: null,
    toWarehouseId: null,
    quantity: 0,
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [sourceStockItemId, setSourceStockItemId] = useState<number | null>(
    null,
  );
  const [destStockItemId, setDestStockItemId] = useState<number | null>(null);
  const [sourceStock, setSourceStock] = useState(0);
  const [destStock, setDestStock] = useState(0);

  const quickActions = [
    { label: "Quick +5", value: 5 },
    { label: "Quick +10", value: 10 },
    { label: "Quick +25", value: 25 },
    { label: "Quick +50", value: 50 },
  ];

  // Fetch source stock item
  useEffect(() => {
    const fetchSource = async () => {
      if (!form.productId || !form.fromWarehouseId) {
        setSourceStock(0);
        setSourceStockItemId(null);
        return;
      }

      try {
        const response = await stockItemAPI.getByProduct(form.productId);
        if (!response.status) throw new Error(response.message);

        const match = response.data.find(
          (item) =>
            item.warehouseId === form.fromWarehouseId &&
            (form.variantId
              ? item.variantId === form.variantId
              : !item.variantId),
        );

        if (match) {
          setSourceStock(match.quantity);
          setSourceStockItemId(match.id);
        } else {
          setSourceStock(0);
          setSourceStockItemId(null);
        }
      } catch (error) {
        console.error("Failed to fetch source stock:", error);
        setSourceStock(0);
        setSourceStockItemId(null);
      }
    };

    fetchSource();
  }, [form.productId, form.variantId, form.fromWarehouseId]);

  // Fetch destination stock item
  useEffect(() => {
    const fetchDest = async () => {
      if (!form.productId || !form.toWarehouseId) {
        setDestStock(0);
        setDestStockItemId(null);
        return;
      }

      try {
        const response = await stockItemAPI.getByProduct(form.productId);
        if (!response.status) throw new Error(response.message);

        const match = response.data.find(
          (item) =>
            item.warehouseId === form.toWarehouseId &&
            (form.variantId
              ? item.variantId === form.variantId
              : !item.variantId),
        );

        if (match) {
          setDestStock(match.quantity);
          setDestStockItemId(match.id);
        } else {
          // Destination stock item doesn't exist; we need to create it? But transfer API requires existing stock items.
          // For now, set to null and validation will fail.
          setDestStock(0);
          setDestStockItemId(null);
        }
      } catch (error) {
        console.error("Failed to fetch destination stock:", error);
        setDestStock(0);
        setDestStockItemId(null);
      }
    };

    fetchDest();
  }, [form.productId, form.variantId, form.toWarehouseId]);

  const setField = <K extends keyof TransferFormState>(
    key: K,
    value: TransferFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // If fromWarehouse changes and equals toWarehouse, reset toWarehouse
    if (key === "fromWarehouseId" && value === form.toWarehouseId) {
      setForm((prev) => ({ ...prev, toWarehouseId: null }));
    }
  };

  const handleQuickAction = (value: number) => {
    setForm((prev) => ({ ...prev, quantity: prev.quantity + value }));
    showToast(`Quick add: +${value}`, "info", { duration: 2000 });
  };

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!form.productId) errors.push("• Please select a product");
    if (!form.fromWarehouseId) errors.push("• Please select source warehouse");
    if (!form.toWarehouseId)
      errors.push("• Please select destination warehouse");
    if (form.fromWarehouseId === form.toWarehouseId) {
      errors.push("• Source and destination warehouses cannot be the same");
    }
    if (form.quantity <= 0) errors.push("• Quantity must be greater than 0");
    if (form.quantity > sourceStock) {
      errors.push(
        `• Cannot transfer more than source stock (${sourceStock} units)`,
      );
    }
    if (!sourceStockItemId) errors.push("• Source stock item not found");
    if (!destStockItemId) errors.push("• Destination stock item not found");

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
      title: "Confirm Transfer",
      message: `Transfer ${form.quantity} units from source to destination?`,
      confirmText: "Continue",
      cancelText: "Cancel",
      icon: "info",
    });
    if (!proceed) return;

    setSubmitting(true);
    try {
      // Use stockItemAPI.transfer with correct parameters
      const response = await stockItemAPI.transfer({
        sourceStockItemId: sourceStockItemId!,
        destinationStockItemId: destStockItemId!,
        quantity: form.quantity,
        reason: form.notes || "Stock transfer",
      });

      if (!response.status) throw new Error(response.message);

      showSuccess(`Transfer successful! ${form.quantity} units moved.`);

      reset();
      onSuccess();
    } catch (error: any) {
      dialogs.error(
        "Transfer Failed",
        error.message || "Failed to process transfer.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm({
      productId: null,
      variantId: null,
      fromWarehouseId: null,
      toWarehouseId: null,
      quantity: 0,
      notes: "",
    });
  };

  return {
    ...form,
    submitting,
    sourceStockItemId,
    destStockItemId,
    sourceStock,
    destStock,
    quickActions,
    setField,
    handleQuickAction,
    handleSubmit,
    reset,
  };
};

export default useTransferForm;
