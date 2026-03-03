// src/renderer/pages/inventory/hooks/useProductTaxAssignment.ts
import { useState, useCallback } from "react";
import { dialogs } from "../../../../utils/dialogs";
import { showSuccess, showError } from "../../../../utils/notification";
import productAPI from "../../../../api/core/product";

interface UseProductTaxAssignmentReturn {
  isOpen: boolean;
  loading: boolean;
  selectedProductIds: number[];
  open: (productIds: number[]) => void;
  close: () => void;
  submit: (
    taxIds: number[],
    operation: "replace" | "add" | "remove",
  ) => Promise<void>;
}

export const useBulkProductTaxAssignment = (
  onSuccess?: () => void,
): UseProductTaxAssignmentReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const open = useCallback((productIds: number[]) => {
    setSelectedProductIds(productIds);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedProductIds([]);
  }, []);

  const submit = useCallback(
    async (taxIds: number[], operation: "replace" | "add" | "remove") => {
      if (selectedProductIds.length === 0) return;
      setLoading(true);
      try {
        const response = await productAPI.bulkAssignTaxes({
          productIds: selectedProductIds,
          taxIds,
          operation,
        });
        if (response.status) {
          showSuccess(
            `Taxes updated for ${selectedProductIds.length} product(s).`,
          );
          onSuccess?.();
          close();
        } else {
          throw new Error(response.message);
        }
      } catch (err: any) {
        showError(err.message || "Failed to update taxes");
      } finally {
        setLoading(false);
      }
    },
    [selectedProductIds, onSuccess, close],
  );

  return {
    isOpen,
    loading,
    selectedProductIds,
    open,
    close,
    submit,
  };
};
