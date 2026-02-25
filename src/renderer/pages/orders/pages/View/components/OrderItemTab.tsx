// components/order/OrderItemsTab.tsx
import React from "react";
import { ShoppingCart } from "lucide-react";
import { OrderData } from "@/renderer/api/order";
import { formatCurrency } from "@/renderer/utils/formatters";

interface OrderItemsTabProps {
  order: OrderData;
}

const OrderItemsTab: React.FC<OrderItemsTabProps> = ({ order }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-[var(--sidebar-text)]">
        Order Items
      </h3>

      {order.items_data && order.items_data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
          <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--card-secondary-bg)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
              {order.items_data.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-[var(--card-secondary-bg)]"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--sidebar-text)]">
                      {item.product_data?.name || `Product ${item.product}`}
                    </div>
                    {item.variant && (
                      <div className="text-xs text-[var(--text-secondary)]">
                        Variant: {item.variant_data?.name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {item.product_data?.sku || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--sidebar-text)]">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[var(--card-secondary-bg)]">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-sm font-medium text-[var(--sidebar-text)] text-right"
                >
                  Subtotal:
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--sidebar-text)]">
                  {formatCurrency(order.subtotal)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-sm font-medium text-[var(--sidebar-text)] text-right"
                >
                  Tax:
                </td>
                <td className="px-6 py-4 text-sm font-medium text-[var(--sidebar-text)]">
                  {formatCurrency(order.tax_amount)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-sm font-bold text-[var(--sidebar-text)] text-right"
                >
                  Total:
                </td>
                <td className="px-6 py-4 text-sm font-bold text-[var(--sidebar-text)]">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] text-lg">
            No items found in this order
          </p>
          <p className="text-[var(--text-tertiary)] mt-2">
            This order doesn't contain any items
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderItemsTab;
