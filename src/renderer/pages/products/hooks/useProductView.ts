// src/renderer/pages/inventory/hooks/useProductView.ts
import { useState } from "react";
import { dialogs } from "../../../utils/dialogs";
import type { StockMovement } from "../../../api/core/stockMovement";
import type { Product } from "../../../api/core/product";
import productAPI from "../../../api/core/product";
import stockMovementAPI from "../../../api/core/stockMovement";

interface SalesStats {
  totalSold: number;
  revenue: number;
  avgPrice: number;
}

interface UseProductViewReturn {
  product: Product | null;
  movements: StockMovement[];
  salesStats: SalesStats | null;
  loading: boolean;
  isOpen: boolean;
  open: (productId: number) => Promise<void>;
  close: () => void;
}

const useProductView = (): UseProductViewReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [loading, setLoading] = useState(false);

  const open = async (productId: number) => {
    setLoading(true);
    setIsOpen(true);
    try {
      // Fetch product details
      const productRes = await productAPI.getById(productId);
      if (!productRes.status) throw new Error(productRes.message);
      setProduct(productRes.data);

      // Fetch stock movements for this product
      const movementsRes = await stockMovementAPI.getByProduct(productId, { limit: 20 });
      if (movementsRes.status) {
        setMovements(movementsRes.data.items || []);
      }

      // Compute sales stats from movements (simplified)
      const soldMovements = movementsRes.data.items?.filter(
        (m) => m.movement_type === "out"
      ) || [];
      const totalSold = soldMovements.reduce((sum, m) => sum + Math.abs(m.change), 0);
      setSalesStats({
        totalSold,
        revenue: 0, // no price info in movement
        avgPrice: 0,
      });
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setProduct(null);
    setMovements([]);
    setSalesStats(null);
  };

  return {
    product,
    movements,
    salesStats,
    loading,
    isOpen,
    open,
    close,
  };
};

export default useProductView;