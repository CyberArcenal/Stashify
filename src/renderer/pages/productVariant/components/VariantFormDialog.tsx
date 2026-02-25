import React from "react";
import Button from "../../../components/UI/Button";
import type { ProductVariant } from "../../../api/core/productVariant";
import Modal from "../../../components/UI/Modal";

interface VariantFormDialogProps {
  isOpen: boolean;
  mode: "add" | "edit";
  variantId: number | null;
  initialData: Partial<ProductVariant> | null;
  onClose: () => void;
  onSuccess: () => void;
}

const VariantFormDialog: React.FC<VariantFormDialogProps> = ({
  isOpen,
  mode,
  variantId,
  initialData,
  onClose,
  onSuccess,
}) => {
  // Placeholder – gagawing functional sa susunod
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add Variant" : "Edit Variant"}
      size="md"
    >
      <div className="p-4">
        <p className="text-center text-gray-500">
          Variant form placeholder. Will be implemented later.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onClose}>
            Save (Placeholder)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VariantFormDialog;