// src/renderer/pages/sales/components/OrderViewDialog.tsx
import React, { useState } from "react";
import Modal from "../../../components/UI/Modal";
import Button from "../../../components/UI/Button";
import {
  Package,
  ShoppingCart,
  User,
  DollarSign,
  FileText,
  Edit,
  ChevronRight,
  Award,
  Percent,
  Ticket,
} from "lucide-react";
import type { Order } from "../../../api/core/order";
import { formatCurrency, formatDate } from "../../../utils/formatters";

interface OrderViewDialogProps {
  isOpen: boolean;
  order: Order | null;
  loading: boolean;
  onClose: () => void;
  onEdit?: (id: number) => void;
}

const OrderViewDialog: React.FC<OrderViewDialogProps> = ({
  isOpen,
  order,
  loading,
  onClose,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "items">("overview");

  if (!order && !loading) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      initiated: { bg: "bg-gray-100", text: "text-gray-700" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
      confirmed: { bg: "bg-blue-100", text: "text-blue-700" },
      completed: { bg: "bg-green-100", text: "text-green-700" },
      cancelled: { bg: "bg-red-100", text: "text-red-700" },
      refunded: { bg: "bg-purple-100", text: "text-purple-700" },
    };
    const config = statusMap[status] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Format applied taxes for display
  const formatAppliedTaxes = (item: any) => {
    if (!item.applied_taxes || item.applied_taxes.length === 0) {
      return "No tax";
    }
    return item.applied_taxes.map((tax: any) => (
      <div key={tax.taxId} className="text-xs text-[var(--text-secondary)]">
        {tax.name}: {formatCurrency(tax.amount)} 
        {tax.type === "percentage" ? ` (${tax.rate}%)` : ` (₱${tax.rate} fixed)`}
      </div>
    ));
  };

  // Get first 3 items for preview
  const previewItems = order?.items?.slice(0, 3) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Order Details" size="xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      ) : order ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[var(--card-secondary-bg)] rounded-md flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-[var(--text-tertiary)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--sidebar-text)]">
                  Order #{order.order_number}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {order.customer?.name || "Walk-in Customer"} •{" "}
                  {formatDate(order.created_at, "MMM dd, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div>{getStatusBadge(order.status)}</div>

              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(order.id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <nav className="flex gap-4">
              {(["overview", "items"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--sidebar-text)]"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "items" && order.items && (
                    <span className="ml-2 text-xs bg-[var(--accent-blue)] text-white rounded-full px-1.5 py-0.5">
                      {order.items.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="mt-4">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column: Order info */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <Package className="w-4 h-4 mr-1" /> Order Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Order #:
                        </span>{" "}
                        {order.order_number}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Status:
                        </span>{" "}
                        {order.status}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Created:
                        </span>{" "}
                        {formatDate(order.created_at)}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Updated:
                        </span>{" "}
                        {formatDate(order.updated_at)}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Inventory Processed:
                        </span>{" "}
                        {order.inventory_processed ? "Yes" : "No"}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Deleted:
                        </span>{" "}
                        {order.is_deleted ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <User className="w-4 h-4 mr-1" /> Customer Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Name:
                        </span>{" "}
                        {order.customer?.name || "N/A"}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Email:
                        </span>{" "}
                        {order.customer?.email || "N/A"}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Phone:
                        </span>{" "}
                        {order.customer?.phone || "N/A"}
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Loyalty Points:
                        </span>{" "}
                        {order.customer?.loyaltyPointsBalance || 0}
                      </div>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                        <FileText className="w-4 h-4 mr-1" /> Notes
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right column: Financial summary and items preview */}
                <div className="space-y-4">
                  <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                    <h4 className="font-medium mb-2 flex items-center text-[var(--sidebar-text)]">
                      <DollarSign className="w-4 h-4 mr-1" /> Financial Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          Subtotal:
                        </span>
                        <span className="font-medium text-[var(--sidebar-text)]">
                          {formatCurrency(order.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          Tax Amount:
                        </span>
                        <span className="font-medium text-[var(--sidebar-text)]">
                          {formatCurrency(order.tax_amount)}
                        </span>
                      </div>
                      {order.usedDiscount && order.totalDiscount > 0 && (
                        <div className="flex justify-between text-[var(--accent-orange)]">
                          <span>Discount:</span>
                          <span>-{formatCurrency(order.totalDiscount)}</span>
                        </div>
                      )}
                      {order.usedLoyalty && order.loyaltyRedeemed > 0 && (
                        <div className="flex justify-between text-[var(--accent-green)]">
                          <span>Points Redeemed:</span>
                          <span>-{formatCurrency(order.loyaltyRedeemed)}</span>
                        </div>
                      )}
                      <div className="border-t border-[var(--border-color)] my-1 pt-1 flex justify-between font-semibold">
                        <span className="text-[var(--sidebar-text)]">
                          Total:
                        </span>
                        <span className="text-[var(--accent-green)]">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      {order.pointsEarn > 0 && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-2">
                          <Award className="w-3 h-3" />
                          Points earned: {order.pointsEarn}
                        </div>
                      )}
                      {order.usedVoucher && order.voucherCode && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                          <Ticket className="w-3 h-3" />
                          Voucher: {order.voucherCode}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center text-[var(--sidebar-text)]">
                          <Package className="w-4 h-4 mr-1" /> Items (
                          {order.items.length})
                        </h4>
                        {order.items.length > 3 && (
                          <button
                            onClick={() => setActiveTab("items")}
                            className="text-xs text-[var(--accent-blue)] hover:underline flex items-center"
                          >
                            View All <ChevronRight className="w-3 h-3 ml-1" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {previewItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center text-sm border-b border-[var(--border-color)] pb-1 last:border-0"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-[var(--sidebar-text)]">
                                {item.product?.name || "Product"}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                SKU: {item.product?.sku || "N/A"} • Qty:{" "}
                                {item.quantity}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-[var(--sidebar-text)]">
                                {formatCurrency(item.line_gross_total)}
                              </div>
                              <div className="text-xs text-[var(--text-secondary)]">
                                {formatCurrency(item.unit_price)} each
                              </div>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-center pt-1">
                            <span className="text-xs text-[var(--text-secondary)]">
                              +{order.items.length - 3} more items
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "items" && (
              <div>
                <h4 className="font-medium mb-2 text-[var(--sidebar-text)]">
                  Order Items
                </h4>
                {!order.items || order.items.length === 0 ? (
                  <p className="text-center py-4 text-[var(--text-secondary)]">
                    No items found.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--border-color)]">
                      <thead className="bg-[var(--card-secondary-bg)]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Product
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            SKU
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Unit Price
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Discount
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Applied Taxes
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Net Total
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">
                            Gross Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {item.product?.name || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {item.product?.sku || "-"}
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {formatCurrency(item.discount_amount)}
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {formatAppliedTaxes(item)}
                            </td>
                            <td className="px-4 py-2 text-sm text-[var(--sidebar-text)]">
                              {formatCurrency(item.line_net_total)}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-[var(--accent-green)]">
                              {formatCurrency(item.line_gross_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center py-4 text-[var(--text-secondary)]">
          Order not found.
        </p>
      )}
    </Modal>
  );
};

export default OrderViewDialog;