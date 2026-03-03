// src/renderer/pages/taxes/hooks/useTaxView.ts
import { useState, useCallback } from 'react';
import taxAPI, { type Tax } from '../../../api/core/tax';
import { showError } from '../../../utils/notification';

export const useTaxView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tax, setTax] = useState<Tax | null>(null);

  const open = useCallback(async (id: number) => {
    setIsOpen(true);
    setLoading(true);
    try {
      const response = await taxAPI.getById(id);
      if (!response.status) throw new Error(response.message);
      setTax(response.data);
    } catch (err: any) {
      showError(err.message || 'Failed to load tax details');
      setIsOpen(false);
      setTax(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTax(null);
  }, []);

  return {
    isOpen,
    loading,
    tax,
    open,
    close,
  };
};