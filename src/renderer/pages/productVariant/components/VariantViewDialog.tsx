import React from "react";
import Button from "../../../components/UI/Button";
import type { ProductVariant } from "../../../api/core/productVariant";
import type { StockMovement } from "../../../api/core/stockMovement";
import Modal from "../../../components/UI/Modal";

interface VariantViewDialogProps {
  isOpen: boolean;
  variant: ProductVariant | null;
  stockMovements: StockMovement[];
  loading: boolean;
  onClose: () => void;
}

const VariantViewDialog: React.FC<VariantViewDialogProps> = ({
  isOpen,
  variant,
  stockMovements,
  loading,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Variant Details"
      size="lg"
    >
      <div className="p-4">
        {loading && <p className="text-center">Loading...</p>}
        {!loading && variant && (
          <div>
            <p><strong>ID:</strong> {variant.id}</p>
            <p><strong>Name:</strong> {variant.name}</p>
            <p><strong>SKU:</strong> {variant.sku}</p>
            <p><strong>Price:</strong> {variant.net_price}</p>
            <p><strong>Active:</strong> {variant.is_active ? "Yes" : "No"}</p>
            {/* Add more fields as needed */}
          </div>
        )}
        {!loading && !variant && <p>No variant data</p>}
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default VariantViewDialog;