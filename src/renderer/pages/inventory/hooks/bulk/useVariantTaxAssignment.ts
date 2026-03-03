// src/renderer/pages/productVariant/hooks/useVariantTaxAssignment.ts
import { useState, useCallback } from 'react';
import productVariantAPI from '../../../../api/core/productVariant';
import { showError, showSuccess } from '../../../../utils/notification';

interface UseVariantTaxAssignmentReturn {
  isOpen: boolean;
  loading: boolean;
  selectedVariantIds: number[];
  open: (variantIds: number[]) => void;
  close: () => void;
  submit: (taxIds: number[], operation: 'replace' | 'add' | 'remove') => Promise<void>;
}

export const useBulkVariantTaxAssignment = (onSuccess?: () => void): UseVariantTaxAssignmentReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);

  const open = useCallback((variantIds: number[]) => {
    setSelectedVariantIds(variantIds);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelectedVariantIds([]);
  }, []);

  const submit = useCallback(async (taxIds: number[], operation: 'replace' | 'add' | 'remove') => {
    if (selectedVariantIds.length === 0) return;
    setLoading(true);
    try {
      const response = await productVariantAPI.bulkAssignTaxes({
        variantIds: selectedVariantIds,
        taxIds,
        operation,
      });
      if (response.status) {
        showSuccess(`Taxes updated for ${selectedVariantIds.length} variant(s).`);
        onSuccess?.();
        close();
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update taxes');
    } finally {
      setLoading(false);
    }
  }, [selectedVariantIds, onSuccess, close]);

  return {
    isOpen,
    loading,
    selectedVariantIds,
    open,
    close,
    submit,
  };
};