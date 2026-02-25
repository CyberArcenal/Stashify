import { useState } from "react";
import productVariantAPI, { type ProductVariant } from "../../../api/core/productVariant";
import type { StockMovement } from "../../../api/core/stockMovement";

const useVariantView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const open = async (id: number) => {
    setIsOpen(true);
    setLoading(true);
    try {
      // Fetch variant details
      const variantRes = await productVariantAPI.getById(id);
      if (variantRes.status) {
        setVariant(variantRes.data);
      }

      // Fetch stock movements for this variant (via stockItems)
      // Need to get stockItem IDs first, then query movements
      // For now placeholder – sa susunod na implementasyon
      setMovements([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setVariant(null);
    setMovements([]);
  };

  return {
    isOpen,
    loading,
    variant,
    movements,
    open,
    close,
  };
};

export default useVariantView;