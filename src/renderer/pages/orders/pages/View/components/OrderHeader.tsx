// components/order/OrderHeader.tsx
import React from "react";
import { Package, Printer, Download, Mail, Edit } from "lucide-react";
import { OrderData } from "@/renderer/api/order";
import { orderAPI } from "@/renderer/api/order";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";

interface OrderHeaderProps {
  order: OrderData;
  onPrintInvoice: () => void;
  onExportOrder: () => void;
  onSendConfirmation: () => void;
  onEditOrder: () => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onPrintInvoice,
  onExportOrder,
  onSendConfirmation,
  onEditOrder,
}) => {
  const getStatusBadge = () => {
    const statusColor = orderAPI.getStatusColor(order.status);
    const statusLabel = orderAPI.getStatusLabel(order.status);

    const colorClasses: { [key: string]: string } = {
      orange:
        "bg-[var(--accent-orange-light)] text-[var(--accent-orange)] border border-[var(--accent-orange)]",
      blue: "bg-[var(--accent-blue-light)] text-[var(--accent-blue)] border border-[var(--accent-blue)]",
      purple:
        "bg-[var(--accent-purple-light)] text-[var(--accent-purple)] border border-[var(--accent-purple)]",
      cyan: "bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] border border-[var(--accent-emerald)]",
      green:
        "bg-[var(--accent-green-light)] text-[var(--accent-green)] border border-[var(--accent-green)]",
      red: "bg-[var(--accent-red-light)] text-[var(--accent-red)] border border-[var(--accent-red)]",
      gray: "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)] border border-[var(--border-color)]",
    };

    return {
      className: colorClasses[statusColor] || colorClasses.gray,
      label: statusLabel,
    };
  };

  const getInventoryStatusBadge = () => {
    return order.inventory_processed
      ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--accent-green)]"
      : "bg-[var(--accent-orange-light)] text-[var(--accent-orange)] border border-[var(--accent-orange)]";
  };

  const getCustomerDisplayName = (): string => {
    return (
      order.customer_display ||
      order.customer_data?.full_name ||
      order.customer_data?.username ||
      "Unknown Customer"
    );
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="border-b border-[var(--border-color)] px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-[var(--accent-emerald-light)] rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-8 h-8 text-[var(--accent-blue)]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-xl font-semibold text-[var(--sidebar-text)]">
                Order #{order.order_number}
              </h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}
              >
                <span className="w-2 h-2 bg-current rounded-full mr-2"></span>
                {statusBadge.label}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getInventoryStatusBadge()}`}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-2 ${order.inventory_processed ? "bg-[var(--accent-green)]" : "bg-[var(--accent-orange)]"}`}
                ></span>
                {order.inventory_processed
                  ? "Inventory Processed"
                  : "Inventory Pending"}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">
              Customer: {getCustomerDisplayName()} • Created:{" "}
              {formatDate(order.created_at)} • Total:{" "}
              {formatCurrency(order.total)}
            </p>
            {order.notes && (
              <p className="text-[var(--sidebar-text)] mt-2 text-sm">
                <strong>Notes:</strong> {order.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
          <button
            onClick={onPrintInvoice}
            className="px-4 py-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-lg flex items-center text-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </button>
          <button
            onClick={onExportOrder}
            className="px-4 py-2 bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-lg flex items-center text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={onSendConfirmation}
            className="px-4 py-2 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-hover)] text-[var(--sidebar-text)] rounded-lg flex items-center text-sm"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </button>
          <button
            onClick={onEditOrder}
            className="px-4 py-2 border border-[var(--border-color)] text-[var(--sidebar-text)] rounded-lg flex items-center text-sm hover:bg-[var(--card-secondary-bg)]"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderHeader;
