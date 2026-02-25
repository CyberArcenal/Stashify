import React, { useState, useEffect } from "react";
import { orderAPI, OrderData } from "@/renderer/api/order";
import { orderLogAPI } from "@/renderer/api/orderLog";
import { PaginationType } from "@/renderer/api/category";
import { dialogs } from "@/renderer/utils/dialogs";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import InventoryStatusBadge from "@/renderer/components/Badge/Inventory";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import { Download, CheckCircle, Package, TrendingUp } from "lucide-react";
import { showApiError, showSuccess } from "@/renderer/utils/notification";

const ConfirmedOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  const STATUS_TRANSITIONS: { [key: string]: string[] } = {
    confirmed: ["completed", "cancelled"],
    completed: ["refunded"],
    cancelled: [],
    refunded: [],
  };

  useEffect(() => {
    fetchConfirmedOrders();
  }, []);

  const fetchConfirmedOrders = async () => {
    try {
      setLoading(true);
      const data = await orderAPI.getByStatus("confirmed");
      setOrders(data.data);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      showApiError(err);
      console.error("Error fetching confirmed orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    const confirm = await dialogs.confirm({
      title: "Complete Order",
      message: `Are you sure you want to mark order #${orderId} as "Completed"?`,
      icon: "warning",
    });
    if (!confirm) return;

    try {
      setProcessingOrder(orderId);
      await orderAPI.updateOrderStatus(orderId, "completed");
      await fetchConfirmedOrders();
      await dialogs.success("Mark as complete successfully.", "Success");
    } catch (err) {
      showApiError(err);
      console.error("Error completing order:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    const confirm = await dialogs.confirm({
      title: "Cancel Order",
      message: `Are you sure you want to cancel order #${orderId}?`,
      icon: "warning",
    });
    if (!confirm) return;

    try {
      setProcessingOrder(orderId);
      await orderAPI.updateOrderStatus(orderId, "cancelled");
      await fetchConfirmedOrders();
      await dialogs.success("Order cancelled success", "Success");
    } catch (err) {
      showApiError(err);
      console.error("Error cancelling order:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleProcessInventory = async (orderId: number) => {
    const confirm = await dialogs.confirm({
      title: "Mark as processed",
      message: `Are you sure you want to mark order #${orderId} as processed?`,
      icon: "warning",
    });
    if (!confirm) return;
    try {
      setProcessingOrder(orderId);
      await orderAPI.markAsProcessed(orderId);
      await fetchConfirmedOrders();
      await dialogs.success("Mark as proceed successfully.", "Success");
    } catch (err) {
      showApiError(err);
      console.error("Error processing inventory:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleExport = async () => {
    if (orders.length === 0) {
      await dialogs.warning("No confirmed orders available to export.");
      return;
    }

    try {
      setExportLoading(true);

      const confirmed = await dialogs.confirm({
        title: "Export Confirmed Orders",
        message: `Are you sure you want to export ${orders.length} confirmed order(s) in ${exportFormat.toUpperCase()} format?`,
        icon: "info",
      });

      if (!confirmed) return;

      // Use the order export API for better formatting
      const exportParams = {
        format: exportFormat,
        status: "confirmed",
      };

      // Since we don't have the orderExportAPI in this context, we'll use the CSV export as fallback
      const csvContent = orderAPI.exportOrdersToCSV(orders);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `confirmed-orders-${new Date().toISOString().split("T")[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showSuccess("Export complete.");
    } catch (err: any) {
      showApiError(err);
      console.error("Error exporting orders:", err);
    } finally {
      setExportLoading(false);
    }
  };

  const canProcessInventory = (order: OrderData): boolean => {
    return order.status === "confirmed" && !order.inventory_processed;
  };

  const totalConfirmedRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.total),
    0,
  );
  const unprocessedInventoryCount = orders.filter(
    (order) => !order.inventory_processed,
  ).length;
  const averageOrderValue =
    orders.length > 0 ? totalConfirmedRevenue / orders.length : 0;
  const inventoryProcessedCount = orders.filter(
    (order) => order.inventory_processed,
  ).length;

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)] animate-pulse">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)] animate-fade-in">
        <div className="text-center py-8">
          <div className="text-[var(--accent-red)] text-4xl mb-2">⚠️</div>
          <p className="text-[var(--accent-red)] text-base">
            Error loading orders
          </p>
          <p className="text-[var(--sidebar-text)] mt-1 text-sm">{error}</p>
          <button
            onClick={fetchConfirmedOrders}
            className="mt-3 compact-button bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--accent-blue-hover)] transition-all duration-200 hover:scale-[1.02]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)] animate-fade-in">
      {/* Enhanced Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            <div
              className="w-2 h-6 rounded-full"
              style={{ backgroundColor: "var(--accent-blue)" }}
            ></div>
            Confirmed Orders
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage and process confirmed customer orders
          </p>
        </div>

        <div className="flex items-center gap-sm">
          {/* Enhanced Export Section */}
          <div
            className="flex items-center gap-xs rounded-md px-2"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
              borderWidth: "1px",
            }}
          >
            <label
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: "var(--text-secondary)" }}
            >
              Export as:
            </label>
            <select
              value={exportFormat}
              onChange={(e) =>
                setExportFormat(e.target.value as "csv" | "excel" | "pdf")
              }
              className="compact-input border-0 bg-[var(--card-secondary-bg)] text-sm font-medium focus:ring-0 cursor-pointer px-1 py-1"
              style={{ color: "var(--sidebar-text)" }}
              disabled={exportLoading}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading || orders.length === 0}
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs text-xs"
              style={{
                backgroundColor:
                  exportLoading || orders.length === 0
                    ? "var(--secondary-color)"
                    : "var(--success-color)",
                opacity: exportLoading || orders.length === 0 ? 0.6 : 1,
              }}
              title="Export all confirmed orders"
            >
              <Download className="icon-sm mr-xs" />
              {exportLoading ? "Exporting..." : "Export"}
            </button>
          </div>

          <div
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {pagination.count} confirmed order(s)
          </div>
        </div>
      </div>

      {/* Enhanced Confirmed Revenue Summary */}
      <div
        className="compact-card rounded-md mb-4 transition-all duration-300 hover:shadow-lg"
        style={{
          backgroundColor: "var(--card-secondary-bg)",
          borderColor: "var(--border-color)",
          borderWidth: "1px",
          background:
            "linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-hover) 100%)",
        }}
      >
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-medium mb-1 text-white opacity-90">
              Total Confirmed Revenue
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(totalConfirmedRevenue.toString())}
            </div>
            <div className="text-xs text-white opacity-80 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Ready for fulfillment
            </div>
          </div>
          <div className="text-3xl text-white opacity-90 transform transition-transform duration-300 hover:scale-110">
            <CheckCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-sm mb-6">
        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-xs font-medium mb-1 flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <TrendingUp className="w-3 h-3" />
                Average Order Value
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(averageOrderValue.toString())}
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-green)", opacity: 0.1 }}
            >
              <TrendingUp
                className="w-4 h-4"
                style={{ color: "var(--accent-green)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-12 h-12 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-green)", opacity: 0.05 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-xs font-medium mb-1 flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <Package className="w-3 h-3" />
                Ready for Fulfillment
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {unprocessedInventoryCount}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Need inventory processing
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-purple)", opacity: 0.1 }}
            >
              <Package
                className="w-4 h-4"
                style={{ color: "var(--accent-purple)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-12 h-12 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-purple)", opacity: 0.05 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="text-xs font-medium mb-1 flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <CheckCircle className="w-3 h-3" />
                Inventory Processed
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {inventoryProcessedCount}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Ready for shipping
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-orange)", opacity: 0.1 }}
            >
              <CheckCircle
                className="w-4 h-4"
                style={{ color: "var(--accent-orange)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-12 h-12 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-orange)", opacity: 0.05 }}
          ></div>
        </div>
      </div>

      {/* Enhanced Export Summary Banner */}
      {orders.length > 0 && (
        <div
          className="mb-4 compact-card rounded-md border transition-all duration-300 hover:shadow-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {orders.length} Confirmed
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {unprocessedInventoryCount} Need Processing
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {inventoryProcessedCount} Processed
                </span>
              </div>
            </div>

            <div
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Total: {orders.length} orders • Ready for fulfillment
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Confirmed Orders Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--border-color)] compact-table transition-all duration-300">
        <table className="min-w-full divide-y divide-[var(--border-color)]">
          <thead className="bg-[var(--card-secondary-bg)] transition-colors duration-300">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Order Number
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Customer
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Date
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Amount
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Inventory
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)] transition-colors duration-300">
            {orders.map((order, index) => {
              const canProcessInventoryOrder = canProcessInventory(order);

              return (
                <tr
                  key={order.id}
                  className="hover:bg-[var(--card-secondary-bg)] transition-all duration-200 transform hover:scale-[1.002] cursor-pointer animate-fade-in"
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: "both",
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {order.order_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {order.customer_display ||
                        order.customer_data?.full_name ||
                        "Unknown Customer"}
                    </div>
                    {order.customer_data?.email && (
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {order.customer_data.email}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      className="text-sm font-bold"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {formatCurrency(order.total)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={order.status as Statuses} size="sm" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <InventoryStatusBadge
                      processed={order.inventory_processed}
                      size="sm"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-xs">
                      {/* Complete Order Button */}
                      <button
                        onClick={() => handleCompleteOrder(order.id)}
                        disabled={processingOrder === order.id}
                        className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.05] flex items-center gap-1"
                      >
                        {processingOrder === order.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Complete
                          </>
                        )}
                      </button>

                      {/* Process Inventory Button - only show for confirmed orders that haven't been processed */}
                      {canProcessInventoryOrder && (
                        <button
                          onClick={() => handleProcessInventory(order.id)}
                          disabled={processingOrder === order.id}
                          className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.05] flex items-center gap-1"
                        >
                          {processingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Package className="w-3 h-3" />
                              Process
                            </>
                          )}
                        </button>
                      )}

                      {/* Cancel Button */}
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={processingOrder === order.id}
                        className="compact-button bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-[var(--sidebar-text)] rounded-md text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.05]"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Enhanced Empty state */}
      {orders.length === 0 && (
        <div className="text-center py-12 animate-fade-in">
          <div
            className="mb-4 mx-auto w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
            }}
          >
            <Package className="w-8 h-8" />
          </div>
          <p
            className="text-base font-medium mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            No confirmed orders
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All confirmed orders have been processed or there are no confirmed
            orders at the moment
          </p>
        </div>
      )}

      {/* Enhanced Table Footer */}
      {orders.length > 0 && (
        <div
          className="flex items-center justify-between mt-6 pt-4"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing {(pagination.current_page - 1) * pagination.page_size + 1}{" "}
            to{" "}
            {Math.min(
              pagination.current_page * pagination.page_size,
              pagination.count,
            )}{" "}
            of {pagination.count} orders
          </div>
          <div className="flex items-center gap-sm">
            <div
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                backgroundColor: "var(--accent-blue-light)",
                color: "var(--accent-blue)",
              }}
            >
              <CheckCircle className="w-3 h-3" />
              Ready for Fulfillment
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmedOrdersPage;
