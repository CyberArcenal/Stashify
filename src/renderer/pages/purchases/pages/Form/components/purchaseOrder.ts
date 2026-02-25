// types/purchaseOrder.ts
export interface PurchaseOrderItem {
  productId: number;
  variantId?: number;
  quantity: number;
  cost: number;
}

export interface PurchaseOrderFormData {
  supplier: number;
  warehouseId: number;
  items: PurchaseOrderItem[];
  notes?: string;
  date: string;
}

export interface PurchaseOrderFormProps {
  mode: "add" | "edit";
  initialData?: Partial<PurchaseOrderFormData>;
  suppliers: any[];
  warehouses: any[];
  products: any[];
  preSelectedSupplierId?: string;
  onSubmit: (data: PurchaseOrderFormData) => void;
  onCancel: () => void;
}
