import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Filter, Eye, Edit, Download, RefreshCw } from "lucide-react";
import {
  orderAPI,
  OrderData,
  OrderSearchParams,
  OrderSummary,
} from "@/renderer/api/order";
import { Pagination as PaginationType } from "@/renderer/api/category";
import {
  orderExportAPI,
  OrderExportParams,
} from "@/renderer/api/exports/order";

import { dialogs } from "@/renderer/utils/dialogs";
import { showSuccess, showApiError } from "@/renderer/utils/notification";
import Pagination from "@/renderer/components/UI/Pagination";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import InventoryStatusBadge from "@/renderer/components/Badge/Inventory";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import Button from "@/renderer/components/UI/Button";

interface Filters {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
  timeRange: string;
  inventoryProcessed: string;
}

const STATUS_TRANSITIONS: { [key: string]: string[] } = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [summary, setSummary] = useState<OrderSummary | undefined>();
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
    timeRange: "",
    inventoryProcessed: "",
  });

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [filters, pagination.current_page]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const searchParams: OrderSearchParams = {};

      if (filters.search) searchParams.search = filters.search;
      if (filters.status) searchParams.status = filters.status;
      if (filters.startDate) searchParams.start_date = filters.startDate;
      if (filters.endDate) searchParams.end_date = filters.endDate;
      if (filters.timeRange) searchParams.time_range = filters.timeRange as any;
      if (filters.inventoryProcessed) {
        searchParams.inventory_processed =
          filters.inventoryProcessed === "true";
      }

      const response = await orderAPI.findPage(
        pagination.page_size,
        pagination.current_page,
        searchParams,
      );

      if (response.status) {
        setOrders(response.data || []);
        setPagination((prev) => ({
          ...prev,
          ...response.pagination,
        }));
      } else {
        throw new Error(response.message || "Failed to fetch orders");
      }
    } catch (err: any) {
      console.error("Failed to load orders:", err);
      const errorMessage = err.message || "Failed to load orders";
      setError(errorMessage);
      showApiError(err, errorMessage);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summary = await orderAPI.summary();
      if (summary) {
        setSummary(summary);
      }
    } catch (err) {}
  };
  const handleExport = async () => {
    if (orders.length === 0) {
      await dialogs.warning("No orders available to export.");
      return;
    }

    try {
      setExportLoading(true);

      const exportParams: OrderExportParams = {
        format: exportFormat,
        status: filters.status || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        search: filters.search || undefined,
        time_range: (filters.timeRange as any) || undefined,
      };

      const confirmed = await dialogs.confirm({
        title: "Export Orders",
        message: `Are you sure you want to export ${pagination.count} order(s) in ${exportFormat.toUpperCase()} format?`,
        icon: "info",
      });

      if (!confirmed) return;

      await orderExportAPI.exportOrders(exportParams);
      showSuccess(
        `Orders exported successfully in ${exportFormat.toUpperCase()} format`,
      );
    } catch (err: any) {
      console.error("Export failed:", err);
      showApiError(err, "Failed to export orders");
    } finally {
      setExportLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setSelectedOrders([]);
    loadOrders();
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      current_page: page,
    }));
    setSelectedOrders([]);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    setSelectedOrders([]);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      startDate: "",
      endDate: "",
      timeRange: "",
      inventoryProcessed: "",
    });
    setPagination((prev) => ({ ...prev, current_page: 1 }));
    setSelectedOrders([]);
  };

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((order) => order.id));
    }
  };

  const getCustomerDisplayName = (order: OrderData): string => {
    return (
      order.customer_display ||
      order.customer_data?.full_name ||
      "Unknown Customer"
    );
  };

  const getCustomerEmail = (order: OrderData): string => {
    return order.customer_data?.email || "No email";
  };

  const formatPrice = (price: string): string => {
    try {
      const amount = parseFloat(price);
      return isNaN(amount) ? "0.00" : `${formatCurrency(amount)}`;
    } catch {
      return formatCurrency("0.00");
    }
  };

  const getItemsCount = (order: OrderData): number => {
    return order.items_data?.length || 0;
  };

  const getAllowedStatusTransitions = (currentStatus: string): string[] => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  };

  const canProcessInventory = (order: OrderData): boolean => {
    return order.status === "confirmed" && !order.inventory_processed;
  };

  const quickStats = {
    total: pagination.count,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    complete: orders.filter((o) => o.status === "completed").length,
    revenue: orders.reduce((sum, order) => {
      try {
        return sum + parseFloat(order.total);
      } catch {
        return sum;
      }
    }, 0),
  };

  const handleExportSelected = async () => {
    if (selectedOrders.length === 0) {
      await dialogs.warning("Please select at least one order to export.");
      return;
    }

    try {
      const confirmed = await dialogs.confirm({
        title: "Export Orders",
        message: `Are you sure you want to export ${selectedOrders.length} selected order(s)?`,
        icon: "info",
      });

      if (!confirmed) return;

      const selectedOrderData = orders.filter((order) =>
        selectedOrders.includes(order.id),
      );
      const csvContent = orderAPI.exportOrdersToCSV(selectedOrderData);

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSuccess(`Successfully exported ${selectedOrders.length} order(s)`);
    } catch (err: any) {
      showApiError(err, "Failed to export orders");
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedOrders.length === 0) return;

    try {
      const statusLabel =
        orderAPI.getOrderStatuses().find((s) => s.value === status)?.label ||
        status;

      const confirmed = await dialogs.confirm({
        title: "Update Order Status",
        message: `Are you sure you want to update ${selectedOrders.length} order(s) to "${statusLabel}"?`,
        icon: "warning",
      });

      if (!confirmed) return;

      setLoading(true);
      await orderAPI.bulkUpdateStatus(selectedOrders, status as any);
      await loadOrders();
      setSelectedOrders([]);
      showSuccess(
        `Successfully updated ${selectedOrders.length} order(s) to "${statusLabel}"`,
      );
    } catch (err: any) {
      showApiError(err, "Failed to update orders status");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const allowedTransitions = getAllowedStatusTransitions(order.status);
      if (!allowedTransitions.includes(newStatus)) {
        await dialogs.warning(
          `Invalid status transition: ${order.status} → ${newStatus}`,
        );
        return;
      }

      const statusLabel = orderAPI.getStatusLabel(newStatus);
      const confirmed = await dialogs.confirm({
        title: "Update Order Status",
        message: `Are you sure you want to update order #${order.order_number} to "${statusLabel}"?`,
        icon: "warning",
      });

      if (!confirmed) return;

      setRefreshing(true);
      await orderAPI.updateOrderStatus(orderId, newStatus as any);
      await loadOrders();
      showSuccess(
        `Order #${order.order_number} status updated to "${statusLabel}"`,
      );
    } catch (err: any) {
      showApiError(err, "Failed to update order status");
    }
  };

  const handleProcessInventory = async (orderId: number) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      if (order.status !== "confirmed") {
        await dialogs.warning(
          'Inventory can only be processed for orders with "confirmed" status.',
        );
        return;
      }

      const confirmed = await dialogs.confirm({
        title: "Process Inventory",
        message: `Are you sure you want to process inventory for order #${order.order_number}? This will update your stock levels.`,
        icon: "info",
      });

      if (!confirmed) return;

      setRefreshing(true);
      await orderAPI.markAsProcessed(orderId);
      await loadOrders();
      showSuccess(`Inventory processed for order #${order.order_number}`);
    } catch (err: any) {
      showApiError(err, "Failed to process inventory");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) {
      await dialogs.warning("Please select at least one order to delete.");
      return;
    }

    try {
      const confirmed = await dialogs.delete(
        selectedOrders.length === 1
          ? `order #${orders.find((o) => o.id === selectedOrders[0])?.order_number}`
          : `${selectedOrders.length} orders`,
      );

      if (!confirmed) return;

      setLoading(true);
      for (const orderId of selectedOrders) {
        await orderAPI.delete(orderId);
      }
      await loadOrders();
      setSelectedOrders([]);
      showSuccess(`Successfully deleted ${selectedOrders.length} order(s)`);
    } catch (err: any) {
      showApiError(err, "Failed to delete orders");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] app-container p-md rounded-lg shadow-sm border border-[var(--border-color)]">
        <div className="text-center py-8">
          <div className="text-[var(--accent-red)] text-4xl mb-4">⚠️</div>
          <p className="text-[var(--sidebar-text)] mb-4">{error}</p>
          <button
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] px-base py-sm rounded-md compact-button"
            onClick={loadOrders}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] app-container compact-card rounded-lg shadow-sm border border-[var(--border-color)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--sidebar-text)]">
            Orders
          </h2>
          <p className="text-[var(--sidebar-text)] mt-1 text-sm">
            Manage customer orders and fulfillment
          </p>
        </div>
        <div className="flex flex-wrap gap-sm w-full sm:w-auto">
          {/* Export Section - Similar to Products Page */}
          <div
            className="flex items-center gap-xs border rounded-md px-2 py-1"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* Export Format */}
            <div className="flex items-center gap-1">
              <label
                className="text-xs whitespace-nowrap"
                style={{ color: "var(--sidebar-text)" }}
              >
                Export:
              </label>
              <select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as "csv" | "excel" | "pdf")
                }
                className="text-xs border-none bg-[var(--card-secondary-bg)] focus:ring-0 cursor-pointer"
                style={{ color: "var(--sidebar-text)" }}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={exportLoading || orders.length === 0}
              className="compact-button rounded-md flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-xs"
              title={
                orders.length === 0
                  ? "No orders to export"
                  : `Export ${pagination.count} orders`
              }
            >
              <Download className="icon-xs" />
              {exportLoading ? "..." : "Export"}
            </Button>
          </div>

          {/* Quick Export Options */}
          <div className="flex items-center gap-1">
            <select
              value={filters.timeRange || ""}
              onChange={(e) => handleFilterChange("timeRange", e.target.value)}
              className="compact-input border rounded text-xs px-2 py-1"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              title="Time range for export"
            >
              <option value="">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <select
              value={filters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="compact-input border rounded text-xs px-2 py-1"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              title="Status filter for export"
            >
              <option value="">All Status</option>
              {orderAPI.getOrderStatuses().map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] px-base py-sm rounded-md flex items-center hover:bg-[var(--card-hover-bg)] transition-colors compact-button"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
          </button>
          <button
            className="bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] px-base py-sm rounded-md flex items-center hover:bg-[var(--card-hover-bg)] transition-colors compact-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`icon-sm mr-sm ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <Link
            to="/orders/form"
            className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] px-base py-sm rounded-md flex items-center transition-colors compact-button"
          >
            <Plus className="icon-sm mr-sm" />
            New Order
          </Link>
        </div>
      </div>

      {/* Export Summary Banner */}
      {summary && (
        <div
          className="mb-4 compact-card rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {summary.pending || 0} Pending
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {summary.confirmed || 0} Confirmed
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {summary.completed || 0} Completed
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {summary.cancelled || 0} Cancelled
                </span>
              </div>
            </div>

            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Total: {pagination.count} orders • Ready for export
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-6">
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">Total Orders</div>
          <div className="text-xl font-bold text-[var(--sidebar-text)] mt-1">
            {summary?.total_orders || 0}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">Pending</div>
          <div className="text-xl font-bold text-[var(--accent-orange)] mt-1">
            {summary?.pending || 0}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">Complete</div>
          <div className="text-xl font-bold text-[var(--accent-green)] mt-1">
            {summary?.completed || 0}
          </div>
        </div>
        <div className="bg-[var(--card-secondary-bg)] compact-stats rounded-md border border-[var(--border-color)]">
          <div className="text-sm text-[var(--sidebar-text)]">Revenue</div>
          <div className="text-xl font-bold text-[var(--accent-green)] mt-1">
            {formatPrice(summary?.total_revenue as string)}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm mb-6 compact-card bg-[var(--card-secondary-bg)] rounded-md border border-[var(--border-color)]">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search orders, customers..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full compact-input border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Inventory Processed
            </label>
            <select
              value={filters.inventoryProcessed}
              onChange={(e) =>
                handleFilterChange("inventoryProcessed", e.target.value)
              }
              className="w-full compact-input border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
            >
              <option value="">All</option>
              <option value="true">Processed</option>
              <option value="false">Not Processed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full compact-input border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full compact-input border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
            />
          </div>

          <div className="flex items-end gap-sm md:col-span-4">
            <button
              onClick={resetFilters}
              className="flex-1 compact-button bg-[var(--primary-color)] text-[var(--sidebar-text)] rounded hover:bg-[var(--primary-hover)] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedOrders.length > 0 && (
        <div className="mb-4 p-sm bg-[var(--accent-blue-light)] rounded-md border border-[var(--accent-blue)] flex items-center justify-between">
          <span className="text-[var(--accent-emerald)] font-medium text-sm">
            {selectedOrders.length} order(s) selected
          </span>
          <div className="flex gap-sm">
            <button
              className="p-sm bg-[var(--accent-emerald-light)] text-[var(--accent-emerald)] rounded hover:bg-[var(--accent-blue-hover-light)] transition-colors"
              onClick={handleExportSelected}
              title="Export Selected"
            >
              <Download className="icon-sm" />
            </button>
            <button
              className="p-sm bg-[var(--accent-red-light)] text-[var(--accent-red)] rounded hover:bg-[var(--danger-hover-light)] transition-colors"
              onClick={handleBulkDelete}
              title="Delete Selected"
            >
              <svg
                className="icon-sm"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <select
              className="compact-input border border-[var(--border-color)] rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)]"
              onChange={(e) => handleBulkStatusUpdate(e.target.value)}
              value=""
            >
              <option value="">Update Status...</option>
              {orderAPI.getOrderStatuses().map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)]"></div>
          <span className="ml-3 text-[var(--sidebar-text)] text-sm">
            Loading orders...
          </span>
        </div>
      )}

      {/* Orders Table */}
      {!loading && (
        <>
          <div className="overflow-x-auto rounded-md border border-[var(--border-color)]">
            <table className="min-w-full divide-y divide-[var(--border-color)] compact-table">
              <thead className="bg-[var(--card-secondary-bg)]">
                <tr>
                  <th
                    scope="col"
                    className="w-12 px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedOrders.length === orders.length &&
                        orders.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 text-[var(--accent-blue)] rounded focus:ring-[var(--accent-blue)]"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Customer
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Inventory
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-right text-xs font-medium text-[var(--sidebar-text)] uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                {orders.map((order) => {
                  const allowedTransitions = getAllowedStatusTransitions(
                    order.status,
                  );
                  const canProcessInventoryOrder = canProcessInventory(order);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <td className="px-md py-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="h-3 w-3 text-[var(--accent-blue)] rounded focus:ring-[var(--accent-blue)]"
                        />
                      </td>
                      <td className="px-md py-sm whitespace-nowrap">
                        <div className="text-sm font-medium text-[var(--sidebar-text)]">
                          {order.order_number}
                        </div>
                        <div className="text-xs text-[var(--sidebar-text)]">
                          {getItemsCount(order)} items
                        </div>
                      </td>
                      <td className="px-md py-sm whitespace-nowrap">
                        <div className="text-sm font-medium text-[var(--sidebar-text)]">
                          {getCustomerDisplayName(order)}
                        </div>
                        <div className="text-xs text-[var(--sidebar-text)]">
                          {getCustomerEmail(order)}
                        </div>
                      </td>
                      <td className="px-md py-sm whitespace-nowrap text-sm text-[var(--sidebar-text)]">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-md py-sm whitespace-nowrap">
                        <StatusBadge
                          status={order.status as Statuses}
                          size="sm"
                        />
                      </td>
                      <td className="px-md py-sm whitespace-nowrap">
                        <InventoryStatusBadge
                          processed={order.inventory_processed}
                          size="sm"
                        />
                      </td>
                      <td className="px-md py-sm whitespace-nowrap text-sm font-medium text-[var(--sidebar-text)]">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-md py-sm whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-xs">
                          <button
                            onClick={() => navigate(`/orders/view/${order.id}`)}
                            className="text-[var(--accent-blue)] hover:text-[var(--primary-color)] transition-colors p-xs rounded hover:bg-[var(--accent-blue-light)]"
                            title="View Order"
                          >
                            <Eye className="icon-sm" />
                          </button>
                          <button
                            onClick={() => navigate(`/orders/form/${order.id}`)}
                            className="text-[var(--accent-blue)] hover:text-[var(--primary-color)] transition-colors p-xs rounded hover:bg-[var(--accent-blue-light)]"
                            title="Edit Order"
                          >
                            <Edit className="icon-sm" />
                          </button>

                          {/* Status Transition Dropdown */}
                          {allowedTransitions.length > 0 && (
                            <div className="relative inline-block text-left">
                              <select
                                className="text-[var(--sidebar-text)] hover:text-[var(--primary-color)] transition-colors p-xs rounded hover:bg-[var(--card-secondary-bg)] border border-[var(--border-color)] bg-[var(--card-bg)] text-xs compact-input"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleStatusUpdate(
                                      order.id,
                                      e.target.value,
                                    );
                                    e.target.value = "";
                                  }
                                }}
                                value=""
                                title="Update Status"
                              >
                                <option value="">Status</option>
                                {allowedTransitions.map((status) => {
                                  const statusInfo = orderAPI
                                    .getOrderStatuses()
                                    .find((s) => s.value === status);
                                  return (
                                    <option key={status} value={status}>
                                      {statusInfo?.label || status}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}

                          {/* Process Inventory Button */}
                          {canProcessInventoryOrder && (
                            <button
                              className="text-[var(--accent-purple)] hover:text-[var(--primary-color)] transition-colors p-xs rounded hover:bg-[var(--accent-purple-light)]"
                              title="Process Inventory"
                              onClick={() => handleProcessInventory(order.id)}
                              disabled={refreshing}
                            >
                              <RefreshCw className="icon-sm" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {orders.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-[var(--border-color)] text-4xl mb-4">📦</div>
              <p className="text-[var(--sidebar-text)] text-base mb-2">
                No orders found
              </p>
              <p className="text-[var(--sidebar-text)]/70 mb-6 text-sm">
                {Object.values(filters).some((filter) => filter !== "")
                  ? "Try adjusting your filters to see more results."
                  : "Get started by creating your first order."}
              </p>
              <div className="flex justify-center gap-sm">
                {Object.values(filters).some((filter) => filter !== "") && (
                  <button
                    className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] px-base py-sm rounded-md transition-colors compact-button"
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/orders/form"
                  className="bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] px-base py-sm rounded-md transition-colors compact-button"
                >
                  Create First Order
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {orders.length > 0 && pagination.total_pages > 1 && (
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              className="mt-6"
            />
          )}
        </>
      )}
    </div>
  );
};

export default OrdersPage;
