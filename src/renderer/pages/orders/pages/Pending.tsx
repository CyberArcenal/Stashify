import React, { useState, useEffect } from "react";
import { orderAPI, OrderData } from "@/renderer/api/order";
import { PaginationType } from "@/renderer/api/category";
import { dialogs, showConfirm } from "@/renderer/utils/dialogs";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import InventoryStatusBadge from "@/renderer/components/Badge/Inventory";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import {
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckSquare,
  X,
  User,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { showApiError } from "@/renderer/utils/notification";

interface Filters {
  search: string;
  customer: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

const PendingOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  const [filters, setFilters] = useState<Filters>({
    search: "",
    customer: "all",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "created_at",
    direction: "desc",
  });

  const STATUS_TRANSITIONS: { [key: string]: string[] } = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: ["refunded"],
    cancelled: [],
    refunded: [],
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const data = await orderAPI.getByStatus("pending");
      setOrders(data.data);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch pending orders",
      );
      console.error("Error fetching pending orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      customer: "all",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    });
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  // Sort orders
  const sortedOrders = React.useMemo(() => {
    const sortableItems = [...orders];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof OrderData];
        let bValue: any = b[sortConfig.key as keyof OrderData];

        if (sortConfig.key === "customer_name") {
          aValue = a.customer_display || a.customer_data?.full_name;
          bValue = b.customer_display || b.customer_data?.full_name;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [orders, sortConfig]);

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

  const handleProcessOrder = async (orderId: number) => {
    const confirm = await dialogs.confirm({
      title: "Update Order Status",
      message: `Are you sure you want to update order #${orderId} to "Confirmed"?`,
      icon: "warning",
    });
    if (!confirm) return;

    try {
      setProcessingOrder(orderId);
      await orderAPI.updateOrderStatus(orderId, "confirmed");
      await fetchPendingOrders();
    } catch (err) {
      showApiError(err);
      console.error("Error processing order:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: number, reason?: string) => {
    try {
      setProcessingOrder(orderId);
      await orderAPI.updateOrderStatus(orderId, "cancelled");
      await fetchPendingOrders();
    } catch (err) {
      showApiError(err);
      console.error("Error cancelling order:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedOrders.length === 0) return;

    const confirm = await dialogs.confirm({
      title: "Bulk Confirm Orders",
      message: `Are you sure you want to confirm ${selectedOrders.length} order(s)?`,
      icon: "warning",
    });
    if (!confirm) return;

    try {
      setProcessingOrder(-1); // Use -1 to indicate bulk operation
      await Promise.all(
        selectedOrders.map((orderId) =>
          orderAPI.updateOrderStatus(orderId, "confirmed"),
        ),
      );
      setSelectedOrders([]);
      await fetchPendingOrders();
    } catch (err) {
      showApiError(err);
      console.error("Error confirming orders:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedOrders.length === 0) return;

    const confirm = await dialogs.confirm({
      title: "Bulk Cancel Orders",
      message: `Are you sure you want to cancel ${selectedOrders.length} order(s)?`,
      icon: "danger",
    });
    if (!confirm) return;

    try {
      setProcessingOrder(-1); // Use -1 to indicate bulk operation
      await Promise.all(
        selectedOrders.map((orderId) =>
          orderAPI.updateOrderStatus(orderId, "cancelled"),
        ),
      );
      setSelectedOrders([]);
      await fetchPendingOrders();
    } catch (err) {
      showApiError(err);
      console.error("Error cancelling orders:", err);
    } finally {
      setProcessingOrder(null);
    }
  };

  const exportToCSV = async () => {
    try {
      const csvContent = orderAPI.exportOrdersToCSV(orders);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pending-orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting orders:", err);
      showApiError(err);
    }
  };

  const getAllowedStatusTransitions = (currentStatus: string): string[] => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  };

  const canProcessInventory = (order: OrderData): boolean => {
    return order.status === "confirmed" && !order.inventory_processed;
  };

  const totalPendingRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.total),
    0,
  );
  const ordersToday = orders.filter((order) => {
    const orderDate = new Date(order.created_at);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  }).length;
  const inventoryPending = orders.filter(
    (order) => !order.inventory_processed,
  ).length;

  if (loading && orders.length === 0) {
    return (
      <div
        className="compact-card rounded-lg shadow-sm border transition-all duration-300"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex justify-center items-center py-8">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-orange)" }}
          ></div>
          <span
            className="ml-3 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading pending orders...
          </span>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div
        className="compact-card rounded-lg shadow-sm border transition-all duration-300"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="text-center py-8">
          <div
            className="text-4xl mb-4"
            style={{ color: "var(--danger-color)" }}
          >
            ⚠️
          </div>
          <p
            className="text-base mb-2"
            style={{ color: "var(--danger-color)" }}
          >
            Error loading orders
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {error}
          </p>
          <button
            onClick={fetchPendingOrders}
            className="compact-button rounded-md transition-colors hover:scale-105 transform duration-200"
            style={{ backgroundColor: "var(--accent-orange)", color: "white" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="compact-card rounded-lg shadow-sm border transition-all duration-300"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Enhanced Header */}
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
            Pending Orders
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Review and process pending customer orders
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="compact-button rounded-md flex items-center transition-colors hover:scale-105 transform duration-200"
            style={{
              backgroundColor: showFilters
                ? "var(--accent-blue)"
                : "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
            {showFilters && <X className="icon-sm ml-xs" />}
          </button>
          <button
            onClick={exportToCSV}
            disabled={orders.length === 0}
            className="compact-button rounded-md flex items-center transition-colors hover:scale-105 transform duration-200 disabled:opacity-60"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
          >
            <Download className="icon-sm mr-sm" />
            Export CSV
          </button>
          <button
            onClick={fetchPendingOrders}
            disabled={loading}
            className="compact-button rounded-md flex items-center transition-colors hover:scale-105 transform duration-200"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
          >
            <RefreshCw
              className={`icon-sm mr-sm ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Enhanced Filters Section */}
      {showFilters && (
        <div
          className="compact-card rounded-md mb-4 p-3 transition-all duration-300 animate-fadeIn"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--sidebar-text)" }}
            >
              <Filter className="icon-sm" />
              Advanced Filters
            </h4>
            <button
              onClick={resetFilters}
              className="text-xs compact-button flex items-center gap-1 transition-colors hover:scale-105 transform duration-200"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--card-bg)",
              }}
            >
              <X className="icon-xs" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Search
              </label>
              <input
                type="text"
                placeholder="Search order numbers, customers..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="compact-input w-full rounded-md transition-all duration-200 focus:border-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar className="icon-xs inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="compact-input w-full rounded-md transition-all duration-200 focus:border-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar className="icon-xs inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                className="compact-input w-full rounded-md transition-all duration-200 focus:border-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            <div className="flex items-end gap-xs">
              <button
                onClick={fetchPendingOrders}
                className="compact-button flex-1 text-[var(--sidebar-text)] transition-colors hover:scale-105 transform duration-200"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedOrders.length > 0 && (
        <div
          className="mb-4 compact-card rounded-md flex items-center justify-between transition-all duration-300 animate-fadeIn"
          style={{
            backgroundColor: "var(--accent-blue-light)",
            borderColor: "var(--accent-blue)",
            borderWidth: "1px",
          }}
        >
          <span
            className="font-medium text-sm flex items-center gap-2"
            style={{ color: "var(--accent-blue)" }}
          >
            <CheckSquare className="icon-sm" />
            {selectedOrders.length} order(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button text-[var(--sidebar-text)] rounded-md transition-colors hover:scale-105 transform duration-200"
              style={{ backgroundColor: "var(--accent-green)" }}
              onClick={handleBulkConfirm}
            >
              <CheckCircle className="icon-sm mr-xs" />
              Confirm All
            </button>
            <button
              className="compact-button text-[var(--sidebar-text)] rounded-md transition-colors hover:scale-105 transform duration-200"
              style={{ backgroundColor: "var(--danger-color)" }}
              onClick={handleBulkCancel}
            >
              <XCircle className="icon-sm mr-xs" />
              Cancel All
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-6">
        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-105 transform"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Total Pending Revenue
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {formatCurrency(totalPendingRevenue.toString())}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-orange)", opacity: 0.1 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-105 transform"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Average Order Value
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {orders.length > 0
              ? formatCurrency((totalPendingRevenue / orders.length).toString())
              : "$0.00"}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-blue)", opacity: 0.1 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-105 transform"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Orders Today
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {ordersToday}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-purple)", opacity: 0.1 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md relative overflow-hidden transition-all duration-300 hover:scale-105 transform"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Inventory Pending
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--accent-orange)" }}
          >
            <AlertTriangle className="icon-sm" />
            {inventoryPending}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-orange)", opacity: 0.1 }}
          ></div>
        </div>
      </div>

      {/* Enhanced Orders Table */}
      <div
        className="overflow-x-auto rounded-md border transition-all duration-300"
        style={{ borderColor: "var(--border-color)" }}
      >
        <table
          className="min-w-full divide-y compact-table"
          style={{ borderColor: "var(--border-color)" }}
        >
          <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
            <tr>
              <th
                scope="col"
                className="w-10 px-2 py-2 text-left text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                <input
                  type="checkbox"
                  checked={
                    selectedOrders.length === orders.length && orders.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="h-3 w-3 rounded transition-all duration-200"
                  style={{ color: "var(--accent-blue)" }}
                />
              </th>
              {[
                { key: "order_number", label: "Order Number" },
                { key: "customer_name", label: "Customer" },
                { key: "created_at", label: "Date" },
                { key: "total", label: "Total Amount" },
                { key: "status", label: "Status" },
                { key: "inventory_processed", label: "Inventory" },
                { key: "actions", label: "Actions" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors hover:bg-[var(--card-hover-bg)]"
                  style={{ color: "var(--text-tertiary)" }}
                  onClick={() => key !== "actions" && handleSort(key)}
                >
                  <div className="flex items-center gap-xs">
                    {label}
                    {key !== "actions" && getSortIcon(key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ backgroundColor: "var(--card-bg)" }}>
            {sortedOrders.map((order, index) => {
              const allowedTransitions = getAllowedStatusTransitions(
                order.status,
              );
              const canProcessInventoryOrder = canProcessInventory(order);

              return (
                <tr
                  key={order.id}
                  className="hover:bg-[var(--card-secondary-bg)] transition-all duration-200 transform hover:scale-[1.002] group"
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <td className="px-2 py-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                      className="h-3 w-3 rounded transition-all duration-200"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </td>
                  <td className="px-md py-sm whitespace-nowrap">
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {order.order_number}
                    </div>
                  </td>
                  <td className="px-md py-sm whitespace-nowrap">
                    <div
                      className="text-sm font-medium flex items-center gap-1"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      <User className="icon-sm" />
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
                    className="px-md py-sm whitespace-nowrap text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(order.created_at)}
                  </td>
                  <td
                    className="px-md py-sm whitespace-nowrap text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-md py-sm whitespace-nowrap">
                    <StatusBadge status={order.status as Statuses} size="sm" />
                  </td>
                  <td className="px-md py-sm whitespace-nowrap">
                    <InventoryStatusBadge
                      processed={order.inventory_processed}
                      size="sm"
                    />
                  </td>
                  <td className="px-md py-sm whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-xs">
                      {/* Confirm Button - only show for pending orders */}
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleProcessOrder(order.id)}
                          disabled={processingOrder === order.id}
                          className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--accent-green)",
                            color: "white",
                          }}
                        >
                          {processingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Processing...
                            </>
                          ) : (
                            "Confirm"
                          )}
                        </button>
                      )}

                      {/* Process Inventory Button - only show for confirmed orders that haven't been processed */}
                      {canProcessInventoryOrder && (
                        <button
                          onClick={async () => {
                            try {
                              setProcessingOrder(order.id);
                              await orderAPI.markAsProcessed(order.id);
                              await fetchPendingOrders();
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : "Failed to process inventory",
                              );
                              console.error("Error processing inventory:", err);
                            } finally {
                              setProcessingOrder(null);
                            }
                          }}
                          disabled={processingOrder === order.id}
                          className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--accent-blue)",
                            color: "white",
                          }}
                        >
                          {processingOrder === order.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Package className="icon-sm mr-xs" />
                              Process Inventory
                            </>
                          )}
                        </button>
                      )}

                      {/* Cancel Button - only show for pending and confirmed orders */}
                      {(order.status === "pending" ||
                        order.status === "confirmed") && (
                        <button
                          onClick={() =>
                            handleCancelOrder(order.id, "Cancelled by admin")
                          }
                          disabled={processingOrder === order.id}
                          className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--danger-color)",
                            color: "white",
                          }}
                        >
                          <XCircle className="icon-sm mr-xs" />
                          Cancel
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

      {/* Enhanced Loading State for table */}
      {loading && orders.length > 0 && (
        <div className="text-center py-4">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
            }}
          >
            <div
              className="animate-spin rounded-full h-4 w-4 border-b-2"
              style={{ borderColor: "var(--accent-blue)" }}
            ></div>
            Refreshing data...
          </div>
        </div>
      )}

      {/* Enhanced Empty State */}
      {orders.length === 0 && !loading && (
        <div className="text-center py-12 transition-all duration-300">
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
            No pending orders
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {filters.search || filters.startDate || filters.endDate
              ? "Try adjusting your search criteria or filters"
              : "All orders have been processed"}
          </p>
          {(filters.search || filters.startDate || filters.endDate) && (
            <button
              className="compact-button text-[var(--sidebar-text)] rounded-md transition-colors hover:scale-105 transform duration-200"
              style={{ backgroundColor: "var(--accent-blue)" }}
              onClick={resetFilters}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Enhanced Footer Info */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between mt-4 transition-all duration-300">
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing <span className="font-medium">1</span> to{" "}
            <span className="font-medium">{orders.length}</span> of{" "}
            <span className="font-medium">{orders.length}</span> pending orders
          </div>
          <div className="flex items-center gap-sm">
            <div
              className="text-xs px-2 py-1 rounded-full transition-colors"
              style={{
                backgroundColor: "var(--accent-orange)",
                color: "white",
              }}
            >
              Requires Attention
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Table Footer */}
      <div
        className="flex justify-between items-center mt-4 pt-3 transition-all duration-300"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
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
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Page {pagination.current_page} of {pagination.total_pages}
        </div>
      </div>
    </div>
  );
};

export default PendingOrdersPage;
