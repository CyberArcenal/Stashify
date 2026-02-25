// components/InventoryPendingPage.tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Package,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  TrendingUp,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { orderAPI, OrderData } from "@/renderer/api/order";
import { dialogs } from "@/renderer/utils/dialogs";
import { showSuccess, showApiError } from "@/renderer/utils/notification";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";

const InventoryPendingPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInventoryPendingOrders();
  }, []);

  const fetchInventoryPendingOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const confirmedOrders = await orderAPI.getByStatus("confirmed");
      const pendingInventoryOrders = confirmedOrders.data.filter(
        (order) => !order.inventory_processed,
      );

      setOrders(pendingInventoryOrders);
    } catch (err: any) {
      const errorMessage =
        err.message || "Failed to fetch pending inventory orders";
      setError(errorMessage);
      showApiError(err, errorMessage);
      console.error("Error fetching pending inventory orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInventoryPendingOrders();
  };

  const handleProcessInventory = async (orderId: number) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      setProcessingOrder(orderId);

      const confirmed = await dialogs.confirm({
        title: "Process Inventory",
        message: `Are you sure you want to process inventory for order #${order.order_number}? This will update your stock levels.`,
        icon: "info",
      });

      if (!confirmed) {
        setProcessingOrder(null);
        return;
      }

      await orderAPI.markAsProcessed(orderId);
      await fetchInventoryPendingOrders();

      showSuccess(`Inventory processed for order #${order.order_number}`);
    } catch (err: any) {
      showApiError(err, "Failed to process inventory");
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleBulkProcessInventory = async () => {
    if (orders.length === 0) {
      await dialogs.warning("No orders available to process.");
      return;
    }

    try {
      const confirmed = await dialogs.confirm({
        title: "Bulk Process Inventory",
        message: `Are you sure you want to process inventory for all ${orders.length} orders? This will update your stock levels for all pending orders.`,
        icon: "warning",
      });

      if (!confirmed) return;

      setLoading(true);

      for (const order of orders) {
        await orderAPI.markAsProcessed(order.id);
      }

      await fetchInventoryPendingOrders();
      showSuccess(
        `Successfully processed inventory for ${orders.length} order(s)`,
      );
    } catch (err: any) {
      showApiError(err, "Failed to process inventory in bulk");
    } finally {
      setLoading(false);
    }
  };

  const getCustomerDisplayName = (order: OrderData): string => {
    return (
      order.customer_display ||
      order.customer_data?.full_name ||
      "Unknown Customer"
    );
  };

  const getItemsCount = (order: OrderData): number => {
    return order.items_data?.length || 0;
  };

  const totalPendingRevenue = orders.reduce((sum, order) => {
    try {
      return sum + parseFloat(order.total);
    } catch {
      return sum;
    }
  }, 0);

  const totalItemsPending = orders.reduce((sum, order) => {
    return sum + getItemsCount(order);
  }, 0);

  const averageOrderValue =
    orders.length > 0 ? totalPendingRevenue / orders.length : 0;

  if (loading && !refreshing) {
    return (
      <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)] animate-pulse">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
          <span className="ml-3 text-[var(--sidebar-text)] text-sm">
            Loading pending inventory orders...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] compact-card rounded-md shadow-md border border-[var(--border-color)] animate-fade-in">
        <div className="text-center py-8">
          <div className="text-[var(--accent-red)] text-4xl mb-2">⚠️</div>
          <p className="text-[var(--sidebar-text)] mb-2 text-sm">{error}</p>
          <button
            className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md transition-all duration-200 hover:scale-[1.02]"
            onClick={fetchInventoryPendingOrders}
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
              style={{ backgroundColor: "var(--accent-orange)" }}
            ></div>
            Pending Inventory Processing
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Process inventory for confirmed orders
          </p>
        </div>
        <div className="flex gap-xs">
          <button
            className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md flex items-center hover:bg-[var(--card-hover-bg)] transition-all duration-200 hover:scale-[1.02]"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`icon-sm mr-xs ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          {orders.length > 0 && (
            <button
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md flex items-center transition-all duration-200 hover:scale-[1.02]"
              onClick={handleBulkProcessInventory}
              disabled={loading}
            >
              <CheckCircle className="icon-sm mr-xs" />
              Process All ({orders.length})
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Quick Stats */}
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
                <Package className="w-3 h-3" />
                Orders Pending
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {orders.length}
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-orange)", opacity: 0.1 }}
            >
              <Package
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
                <AlertTriangle className="w-3 h-3" />
                Items Pending
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {totalItemsPending}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Across all orders
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-purple)", opacity: 0.1 }}
            >
              <AlertTriangle
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
                <TrendingUp className="w-3 h-3" />
                Pending Revenue
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(totalPendingRevenue.toString())}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Avg: {formatCurrency(averageOrderValue.toString())}
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-blue)", opacity: 0.1 }}
            >
              <TrendingUp
                className="w-4 h-4"
                style={{ color: "var(--accent-blue)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-12 h-12 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-blue)", opacity: 0.05 }}
          ></div>
        </div>
      </div>

      {/* Enhanced Orders Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--border-color)] compact-table transition-all duration-300">
        <table className="min-w-full divide-y divide-[var(--border-color)]">
          <thead className="bg-[var(--card-secondary-bg)] transition-colors duration-300">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Order Details
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
                Items
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Amount
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--sidebar-text)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)] transition-colors duration-300">
            {orders.map((order, index) => (
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
                  <div className="text-xs mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-blue-light)] text-[var(--accent-blue)]">
                      Confirmed
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {getCustomerDisplayName(order)}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {order.customer_data?.email || "No email"}
                  </div>
                </td>
                <td
                  className="px-4 py-3 whitespace-nowrap text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formatDate(order.created_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div
                    className="text-sm font-medium flex items-center gap-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <Package className="w-3 h-3" />
                    {getItemsCount(order)} items
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--accent-orange)" }}
                  >
                    {formatCurrency(order.total)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-xs">
                    <Link
                      to={`/orders/view/${order.id}`}
                      className="text-[var(--accent-blue)] hover:text-[var(--primary-color)] transition-all duration-200 p-1 rounded hover:bg-[var(--accent-blue-light)] transform hover:scale-110"
                      title="View Order"
                    >
                      <Eye className="icon-sm" />
                    </Link>
                    <Link
                      to={`/orders/form/${order.id}`}
                      className="text-[var(--accent-blue)] hover:text-[var(--primary-color)] transition-all duration-200 p-1 rounded hover:bg-[var(--accent-blue-light)] transform hover:scale-110"
                      title="Edit Order"
                    >
                      <Edit className="icon-sm" />
                    </Link>

                    <button
                      onClick={() => handleProcessInventory(order.id)}
                      disabled={processingOrder === order.id}
                      className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md transition-all duration-200 hover:scale-[1.05] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingOrder === order.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-xs"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="icon-sm mr-xs" />
                          Process
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Empty state */}
      {orders.length === 0 && !loading && (
        <div className="text-center py-12 animate-fade-in">
          <div
            className="mb-4 mx-auto w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
            }}
          >
            <CheckCircle className="w-8 h-8" />
          </div>
          <p
            className="text-base font-medium mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            No pending inventory orders
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            All confirmed orders have been processed for inventory
          </p>
          <div className="flex justify-center gap-sm">
            <Link
              to="/orders"
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md transition-all duration-200 hover:scale-[1.02]"
            >
              View All Orders
            </Link>
            <button
              className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--card-hover-bg)] transition-all duration-200 hover:scale-[1.02]"
              onClick={handleRefresh}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Table Footer */}
      {orders.length > 0 && (
        <div
          className="flex items-center justify-between mt-6 pt-4"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing <span className="font-medium">{orders.length}</span>{" "}
            order(s) pending inventory processing
          </div>
          <div
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              backgroundColor: "var(--accent-orange-light)",
              color: "var(--accent-orange)",
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            Inventory Update Required
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPendingPage;
