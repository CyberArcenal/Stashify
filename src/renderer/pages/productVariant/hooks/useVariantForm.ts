import { useState } from "react";
import type { ProductVariant } from "../../../api/core/productVariant";

type FormMode = "add" | "edit";

const useVariantForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("add");
  const [variantId, setVariantId] = useState<number | null>(null);
  const [initialData, setInitialData] = useState<Partial<ProductVariant> | null>(null);

  const openAdd = () => {
    setMode("add");
    setVariantId(null);
    setInitialData(null);
    setIsOpen(true);
  };

  const openEdit = (variant: ProductVariant) => {
    setMode("edit");
    setVariantId(variant.id);
    setInitialData(variant);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setVariantId(null);
    setInitialData(null);
  };

  return {
    isOpen,
    mode,
    variantId,
    initialData,
    openAdd,
    openEdit,
    close,
  };
};

export default useVariantForm;