// components/PurchaseOrderDetailView.tsx
import React from "react";
import {
  Package,
  Truck,
  Calendar,
  DollarSign,
  Edit,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
} from "lucide-react";
import { PurchaseData } from "@/renderer/api/purchase";
import { PurchaseListItemData } from "@/renderer/api/purchaseItem";
import { useNavigate } from "react-router-dom";

interface PurchaseOrderDetailViewProps {
  purchaseOrder: PurchaseData;
  purchaseItems: PurchaseListItemData[];
}

const PurchaseOrderDetailView: React.FC<PurchaseOrderDetailViewProps> = ({
  purchaseOrder,
  purchaseItems,
}) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(num);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          bg: "var(--accent-yellow)",
          text: "white",
          icon: Clock,
          label: "Pending",
        };
      case "confirmed":
        return {
          bg: "var(--accent-blue)",
          text: "white",
          icon: AlertCircle,
          label: "Confirmed",
        };
      case "received":
        return {
          bg: "var(--accent-green)",
          text: "white",
          icon: CheckCircle,
          label: "Received",
        };
      case "cancelled":
        return {
          bg: "var(--danger-color)",
          text: "white",
          icon: X,
          label: "Cancelled",
        };
      default:
        return {
          bg: "var(--card-secondary-bg)",
          text: "var(--sidebar-text)",
          icon: Package,
          label: status,
        };
    }
  };

  const totalQuantity = purchaseItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const statusConfig = getStatusConfig(purchaseOrder.status);
  const StatusIcon = statusConfig.icon;

  const handleEditClick = () => {
    navigate(`/purchases/form/${purchaseOrder.id}`);
  };

  return (
    <div
      className="rounded-xl shadow-sm border overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <Package
              className="w-6 h-6 mr-3"
              style={{ color: "var(--text-secondary)" }}
            />
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--sidebar-text)" }}
            >
              Purchase Order: {purchaseOrder.purchase_number}
            </h2>
            <span
              className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.text,
              }}
            >
              <StatusIcon className="w-4 h-4 mr-1" />
              {statusConfig.label}
            </span>
            {purchaseOrder.inventory_processed && (
              <span
                className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: "var(--accent-green)",
                  color: "white",
                }}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Inventory Processed
              </span>
            )}
          </div>

          {purchaseOrder.status === "pending" && (
            <button
              onClick={handleEditClick}
              className="mt-2 sm:mt-0 px-4 py-2 rounded-lg flex items-center text-sm transition-colors"
              style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Purchase Order
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Supplier Info */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Truck
                  className="w-4 h-4 mr-2"
                  style={{ color: "var(--text-secondary)" }}
                />
                Supplier Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Supplier Name
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {purchaseOrder.supplier_name}
                  </p>
                </div>
                <div>
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Purchase Order Number
                  </p>
                  <p
                    className="text-sm font-medium font-mono"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {purchaseOrder.purchase_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--sidebar-text)" }}
              >
                Order Items ({purchaseItems.length})
              </h3>

              {purchaseItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package
                    className="w-12 h-12 mx-auto mb-4 opacity-50"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <p style={{ color: "var(--text-secondary)" }}>
                    No items found for this purchase order.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        {[
                          "Product",
                          "Variant",
                          "Quantity",
                          "Unit Cost",
                          "Total",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left py-3 px-4 text-sm font-medium"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseItems.map((item, index) => (
                        <tr
                          key={item.id || index}
                          className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                          style={{
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          <td
                            className="py-3 px-4 text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.product_data?.name ||
                              `Product ${item.product_data?.id}`}
                          </td>
                          <td
                            className="py-3 px-4 text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.variant_data?.name ||
                              item.variant_data?.id ||
                              "-"}
                          </td>
                          <td
                            className="py-3 px-4 text-sm text-right"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            className="py-3 px-4 text-sm text-right"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {formatCurrency(item.unit_cost)}
                          </td>
                          <td
                            className="py-3 px-4 text-sm font-medium text-right"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <DollarSign
                  className="w-4 h-4 mr-2"
                  style={{ color: "var(--text-secondary)" }}
                />
                Financial Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Subtotal
                  </span>
                  <span style={{ color: "var(--sidebar-text)" }}>
                    {formatCurrency(purchaseOrder.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Tax Amount
                  </span>
                  <span style={{ color: "var(--sidebar-text)" }}>
                    {formatCurrency(purchaseOrder.tax_amount)}
                  </span>
                </div>
                <div
                  className="pt-2 mt-2"
                  style={{ borderTop: "1px solid var(--border-color)" }}
                >
                  <div className="flex justify-between text-base font-semibold">
                    <span style={{ color: "var(--sidebar-text)" }}>Total</span>
                    <span style={{ color: "var(--sidebar-text)" }}>
                      {formatCurrency(purchaseOrder.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar
                  className="w-4 h-4 mr-2"
                  style={{ color: "var(--text-secondary)" }}
                />
                Order Details
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  {
                    label: "PO Number",
                    value: purchaseOrder.purchase_number,
                    mono: true,
                  },
                  {
                    label: "Created Date",
                    value: formatDate(purchaseOrder.created_at),
                  },
                  {
                    label: "Last Updated",
                    value: formatDate(purchaseOrder.updated_at),
                  },
                  {
                    label: "Status",
                    value: (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.text,
                        }}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </span>
                    ),
                  },
                  { label: "Items Count", value: purchaseItems.length },
                  { label: "Total Quantity", value: totalQuantity },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        color: "var(--sidebar-text)",
                        fontFamily: row.mono ? "monospace" : "inherit",
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Information */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--sidebar-text)" }}
              >
                Status Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-secondary)" }}>
                    Current Status
                  </span>
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.text,
                    }}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </span>
                </div>

                {purchaseOrder.status === "pending" && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--accent-yellow)" }}
                  >
                    This order is awaiting confirmation and processing.
                  </p>
                )}
                {purchaseOrder.status === "confirmed" && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    This order has been confirmed and is awaiting delivery.
                  </p>
                )}
                {purchaseOrder.status === "received" && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--accent-green)" }}
                  >
                    This order has been received and inventory has been updated.
                  </p>
                )}
                {purchaseOrder.status === "cancelled" && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--danger-color)" }}
                  >
                    This order has been cancelled.
                  </p>
                )}
                {purchaseOrder.inventory_processed && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--accent-green)" }}
                  >
                    Inventory quantities have been updated for this order.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailView;
