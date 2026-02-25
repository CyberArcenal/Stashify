// components/order/OverviewTab.tsx
import React from "react";
import {
  RefreshCw,
  Package,
  CheckCircle,
  ClipboardList,
  User,
  Calendar,
  BarChart3,
} from "lucide-react";
import { OrderData } from "@/renderer/api/order";
import { orderAPI } from "@/renderer/api/order";
import { formatCurrency, formatDateTime } from "@/renderer/utils/formatters";

interface OverviewTabProps {
  order: OrderData;
  processing: number | null;
  onStatusUpdate: (newStatus: string) => void;
  onProcessInventory: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  order,
  processing,
  onStatusUpdate,
  onProcessInventory,
}) => {
  const STATUS_TRANSITIONS: { [key: string]: string[] } = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: ["refunded"],
    cancelled: [],
    refunded: [],
  };

  const getAllowedStatusTransitions = (): string[] => {
    return STATUS_TRANSITIONS[order.status] || [];
  };

  const getCustomerDisplayName = (): string => {
    return (
      order.customer_display ||
      order.customer_data?.full_name ||
      order.customer_data?.username ||
      "Unknown Customer"
    );
  };

  const getCustomerEmail = (): string => {
    return order.customer_data?.email || "No email";
  };

  const totalItems =
    order.items_data?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Order Actions
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-2">
              Update Status
            </label>
            <div className="flex flex-wrap gap-2">
              {getAllowedStatusTransitions().map((status) => {
                const statusInfo = orderAPI
                  .getOrderStatuses()
                  .find((s) => s.value === status);
                const isProcessing = processing === order.id;
                return (
                  <button
                    key={status}
                    onClick={() => onStatusUpdate(status)}
                    disabled={isProcessing}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-[var(--sidebar-text)] bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {statusInfo?.label || status}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {order.status === "confirmed" && !order.inventory_processed && (
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-2">
                Inventory Processing
              </label>
              <button
                onClick={onProcessInventory}
                disabled={processing === order.id}
                className="w-full inline-flex items-center justify-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-[var(--sidebar-text)] bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-green)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === order.id ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Package className="w-3 h-3 mr-1" />
                    Process Inventory
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
            <ClipboardList className="w-4 h-4 mr-2" />
            Order Summary
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Subtotal:</span>
              <span className="font-medium text-[var(--sidebar-text)]">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Tax:</span>
              <span className="font-medium text-[var(--sidebar-text)]">
                {formatCurrency(order.tax_amount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[var(--border-color)] pt-2">
              <span className="text-[var(--sidebar-text)] font-semibold">
                Total:
              </span>
              <span className="font-bold text-[var(--sidebar-text)]">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Customer Information
          </h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">Name:</span>
              <div className="font-medium text-[var(--sidebar-text)]">
                {getCustomerDisplayName()}
              </div>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Email:</span>
              <div className="font-medium text-[var(--sidebar-text)]">
                {getCustomerEmail()}
              </div>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Customer ID:</span>
              <div className="font-medium text-[var(--sidebar-text)]">
                {order.customer || "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Order Timeline
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Created:</span>
              <span className="font-medium text-[var(--sidebar-text)]">
                {formatDateTime(order.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">
                Last Updated:
              </span>
              <span className="font-medium text-[var(--sidebar-text)]">
                {formatDateTime(order.updated_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
          <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Order Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">Items Count:</span>
              <div className="font-medium text-[var(--sidebar-text)]">
                {order.items_data?.length || 0} items
              </div>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">
                Total Quantity:
              </span>
              <div className="font-medium text-[var(--sidebar-text)]">
                {totalItems} units
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
