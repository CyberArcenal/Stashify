// src/renderer/pages/sales/components/SalesFormDialog/hooks/useStockValidation.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import stockItemAPI from "../../../../../api/core/stockItem";
import type { OrderItemForm } from "../types";

export const useStockValidation = (items: OrderItemForm[], fields: { id: string }[],finalTotal: number) => {
  const [itemStock, setItemStock] = useState<Record<string, number>>({});
  const [loadingStock, setLoadingStock] = useState<Record<string, boolean>>({});

  const fetchStockQuantity = useCallback(
    async (
      fieldId: string,
      productId: number,
      variantId: number | null,
      warehouseId: number | null,
    ) => {
      if (!productId) return;

      setLoadingStock((prev) => ({ ...prev, [fieldId]: true }));

      try {
        const quantity = await stockItemAPI.getStockQuantity({
          productId,
          variantId: variantId ?? undefined,
          warehouseId: warehouseId ?? undefined,
        });
        setItemStock((prev) => ({ ...prev, [fieldId]: quantity }));
      } catch (error) {
        console.error("Stock fetch error:", error);
        setItemStock((prev) => ({ ...prev, [fieldId]: 0 }));
      } finally {
        setLoadingStock((prev) => ({ ...prev, [fieldId]: false }));
      }
    },
    [],
  );

  // Auto-fetch stock for all items that have a product
  useEffect(() => {
    fields.forEach((field, index) => {
      const item = items[index];
      if (item?.productId && !(field.id in itemStock)) {
        fetchStockQuantity(field.id, item.productId, item.variantId ?? null, item.warehouseId ?? null);
      }
    });
  }, [fields, items, itemStock, fetchStockQuantity]);

  const hasStockError = useMemo(() => {
    return items.some((item, index) => {
      const fieldId = fields[index]?.id;
      if (!fieldId) return true;
      if (!item.productId) return true;
      if (item.quantity <= 0) return true;
      if (loadingStock[fieldId]) return false;
      const available = itemStock[fieldId] || 0;
      return item.quantity > available;
    });
  }, [items, fields, itemStock, loadingStock, finalTotal]);

  const isAnyStockLoading = useMemo(() => {
    return Object.values(loadingStock).some(Boolean);
  }, [loadingStock]);

  return {
    itemStock,
    loadingStock,
    fetchStockQuantity,
    hasStockError,
    isAnyStockLoading,
  };
};