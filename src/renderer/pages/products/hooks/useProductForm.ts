// src/renderer/pages/inventory/hooks/useProductForm.ts
import { useState } from "react";
import type { Product } from "../../../api/core/product";

export type FormMode = "add" | "edit";

interface UseProductFormReturn {
  isOpen: boolean;
  mode: FormMode;
  productId: number | null;
  initialData: Partial<Product> | null;
  openAdd: () => void;
  openEdit: (product: Product) => void;
  close: () => void;
}

const useProductForm = (): UseProductFormReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("add");
  const [productId, setProductId] = useState<number | null>(null);
  const [initialData, setInitialData] = useState<Partial<Product> | null>(null);

  const openAdd = () => {
    setMode("add");
    setProductId(null);
    setInitialData(null);
    setIsOpen(true);
  };

  const openEdit = (product: Product) => {
    setMode("edit");
    setProductId(product.id);
    setInitialData(product);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    mode,
    productId,
    initialData,
    openAdd,
    openEdit,
    close,
  };
};

export default useProductForm;