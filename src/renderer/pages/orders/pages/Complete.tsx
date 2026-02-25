// components/CompletedOrdersPage.tsx
import React, { useState, useEffect } from "react";
import { orderAPI, OrderData, OrderSearchParams } from "@/renderer/api/order";
import { Pagination as PaginationType } from "@/renderer/api/category";
import Pagination from "@/renderer/components/UI/Pagination";
import InventoryStatusBadge from "@/renderer/components/Badge/Inventory";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import {
  Package,
  Download,
  CheckCircle,
  TrendingUp,
  Calendar,
  Users,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { showApiError } from "@/renderer/utils/notification";

const CompletedOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  useEffect(() => {
    fetchCompletedOrders();
  }, [pagination.current_page]);

  const fetchCompletedOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.findPage(
        pagination.page_size,
        pagination.current_page,
        { status: "completed" } as OrderSearchParams,
      );

      if (response.status) {
        setOrders(response.data || []);
        setPagination((prev) => ({
          ...prev,
          ...response.pagination,
        }));
        setError(null);
      } else {
        throw new Error(response.message || "Failed to fetch completed orders");
      }
    } catch (err) {
      showApiError(err);
      console.error("Error fetching completed orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      current_page: page,
    }));
  };

  const totalRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.total),
    0,
  );
  const averageOrderValue =
    orders.length > 0 ? totalRevenue / orders.length : 0;

  // Calculate monthly orders
  const currentMonthOrders = orders.filter((order) => {
    const orderDate = new Date(order.created_at);
    const now = new Date();
    return (
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    );
  }).length;

  // Calculate inventory processed percentage
  const inventoryProcessed = orders.filter(
    (order) => order.inventory_processed,
  ).length;
  const inventoryProcessedPercentage =
    orders.length > 0 ? (inventoryProcessed / orders.length) * 100 : 0;

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
            onClick={fetchCompletedOrders}
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
              style={{ backgroundColor: "var(--accent-green)" }}
            ></div>
            Completed Orders
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Successfully delivered and completed orders
          </p>
        </div>
        <div
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {pagination.count} completed order(s)
        </div>
      </div>

      {/* Enhanced Revenue Summary */}
      <div
        className="compact-card rounded-md mb-4 transition-all duration-300 hover:shadow-lg"
        style={{
          backgroundColor: "var(--card-secondary-bg)",
          borderColor: "var(--border-color)",
          borderWidth: "1px",
          background:
            "linear-gradient(135deg, var(--accent-green) 0%, var(--accent-green-hover) 100%)",
        }}
      >
        <div className="flex items-center justify-between p-4">
          <div>
            <div className="text-sm font-medium mb-1 text-white opacity-90">
              Total Revenue from Completed Orders
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(totalRevenue.toString())}
            </div>
            <div className="text-xs text-white opacity-80 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Showing {orders.length} orders on this page
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
                <Calendar className="w-3 h-3" />
                Orders This Month
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {currentMonthOrders}
              </div>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-purple)", opacity: 0.1 }}
            >
              <Calendar
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
                <Package className="w-3 h-3" />
                Inventory Processed
              </div>
              <div
                className="text-lg font-bold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {inventoryProcessed} / {orders.length}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {inventoryProcessedPercentage.toFixed(1)}% completed
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
      </div>

      {/* Enhanced Completed Orders Table */}
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
            <Package className="w-8 h-8" />
          </div>
          <p
            className="text-base font-medium mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            No completed orders yet
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Orders with "complete" status will appear here
          </p>
        </div>
      )}

      {/* Enhanced Pagination */}
      {orders.length > 0 && pagination.total_pages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6">
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing {(pagination.current_page - 1) * pagination.page_size + 1}{" "}
            to{" "}
            {Math.min(
              pagination.current_page * pagination.page_size,
              pagination.count,
            )}{" "}
            of {pagination.count} orders
          </div>
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            className="compact-pagination"
          />
        </div>
      )}

      {/* Enhanced Table Footer */}
      {orders.length > 0 && (
        <div
          className="flex items-center justify-between mt-6 pt-4"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <div className="flex items-center gap-sm">
            <div
              className="text-xs flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                backgroundColor: "var(--accent-green-light)",
                color: "var(--accent-green)",
              }}
            >
              <CheckCircle className="w-3 h-3" />
              All Successfully Processed
            </div>
            <button
              onClick={async () => {
                try {
                  const allCompletedOrders =
                    await orderAPI.getByStatus("completed");
                  const csvContent = orderAPI.exportOrdersToCSV(
                    allCompletedOrders.data,
                  );
                  const blob = new Blob([csvContent], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `completed-orders-${new Date().toISOString().split("T")[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  showApiError(err);
                  console.error("Error exporting orders:", err);
                }
              }}
              className="compact-button bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--accent-blue-hover)] transition-all duration-200 hover:scale-[1.02] flex items-center gap-1 text-xs"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
          </div>
          <div
            className="text-xs flex items-center gap-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--accent-green)" }}
            ></div>
            Last updated: {formatDate(new Date().toISOString())}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedOrdersPage;
