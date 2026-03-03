// src/renderer/pages/sales/components/SalesFormDialog/types.ts
import type { Order, OrderCreateData, OrderUpdateData } from "../../../../api/core/order";
import type { Tax } from "../../../../api/core/tax";

export type OrderItemForm = {
  productId: number | null;
  productName?: string;
  variantId: number | null;
  variantName?: string;
  warehouseId: number | null;
  warehouseName?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  lineNetTotal: number;
  taxes?: Tax[];
  taxBreakdown?: Array<{
    taxId: number;
    name: string;
    rate: number;
    type: "percentage" | "fixed";
    amount: number;
  }>;
  lineTaxTotal?: number;
  lineGrossTotal?: number;
};

export type FormData = {
  order_number: string;
  customerId: number | null;
  customerName?: string;
  notes: string;
  items: OrderItemForm[];
  subtotal: number;
  tax_amount: number;
  totalBeforePoints: number;
  total: number;
};

export interface SalesFormDialogProps {
  isOpen: boolean;
  mode: "add" | "edit";
  orderId: number | null;
  initialData: Partial<Order> | null;
  onClose: () => void;
  onSuccess: () => void;
}