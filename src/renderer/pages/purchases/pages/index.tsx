// components/PurchasesPage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  Truck,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  purchaseAPI,
  PurchaseData,
  PurchaseForm,
  PurchaseSearchParams,
  PurchaseSummary,
} from "@/renderer/api/purchase";
import {
  purchaseItemAPI,
  PurchaseListItemData,
} from "@/renderer/api/purchaseItem";
import { purchaseLogAPI } from "@/renderer/api/purchaseLog";
import {
  purchaseExportAPI,
  PurchaseExportParams,
} from "@/renderer/api/exports/purchase";
import { dialogs } from "@/renderer/utils/dialogs";
import Pagination from "@/renderer/components/UI/Pagination";
import { PaginationType } from "@/renderer/api/category";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import { showApiError, showError } from "@/renderer/utils/notification";

interface PurchaseWithItems extends PurchaseData {
  items?: PurchaseListItemData[];
  supplierContact?: string;
}

interface Filters {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
  supplier_name: string;
  min_total: string;
  max_total: string;
  inventory_processed: string;
}

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPurchases, setSelectedPurchases] = useState<number[]>([]);
  const [expandedPurchase, setExpandedPurchase] = useState<number | null>(null);
  const [isReceiving, setIsReceiving] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState<number | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    previous: null,
    next: null,
  });
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    startDate: "",
    endDate: "",
    supplier_name: "",
    min_total: "",
    max_total: "",
    inventory_processed: "",
  });

  const loadPurchases = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build search params from filters
      const searchParams: PurchaseSearchParams = {};

      if (filters.search) searchParams.search = filters.search;
      if (filters.status) searchParams.status = filters.status;
      if (filters.supplier_name)
        searchParams.supplier_name = filters.supplier_name;
      if (filters.startDate) searchParams.start_date = filters.startDate;
      if (filters.endDate) searchParams.end_date = filters.endDate;
      if (filters.min_total)
        searchParams.min_total = parseFloat(filters.min_total);
      if (filters.max_total)
        searchParams.max_total = parseFloat(filters.max_total);
      if (filters.inventory_processed) {
        searchParams.inventory_processed =
          filters.inventory_processed === "true";
      }

      const response = await purchaseAPI.findPage(
        pagination.page_size,
        page,
        searchParams,
      );
      const transformedPurchases: PurchaseWithItems[] = response.data.map(
        (purchase) => ({
          ...purchase,
          supplierContact: "",
          items: [],
        }),
      );

      setPurchases(transformedPurchases);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error("Failed to load purchases:", err);
      setError(err.message || "Failed to load purchases. Please try again.");
      await dialogs.error(
        err.message || "Failed to load purchases. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (purchases.length === 0) {
      await dialogs.warning("No purchases available to export.");
      return;
    }

    try {
      setExportLoading(true);
      const exportParams: PurchaseExportParams = {
        format: exportFormat,
        status: filters.status || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        search: filters.search || undefined,
        supplier_name: filters.supplier_name || undefined,
        min_total: filters.min_total
          ? parseFloat(filters.min_total)
          : undefined,
        max_total: filters.max_total
          ? parseFloat(filters.max_total)
          : undefined,
        inventory_processed: filters.inventory_processed
          ? filters.inventory_processed === "true"
          : undefined,
      };

      const confirmed = await dialogs.confirm({
        title: "Export Purchases",
        message: `Are you sure you want to export ${pagination.count} purchase(s) in ${exportFormat.toUpperCase()} format?`,
        icon: "info",
      });

      if (!confirmed) return;

      await purchaseExportAPI.exportPurchases(exportParams);
      await dialogs.success(
        `Purchases exported successfully in ${exportFormat.toUpperCase()} format`,
      );
    } catch (err: any) {
      console.error("Export failed:", err);
      await dialogs.error(`Failed to export purchases: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const loadPurchaseItems = async (purchaseId: number) => {
    try {
      const items = await purchaseItemAPI.getByPurchase(purchaseId);
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchaseId ? { ...p, items } : p)),
      );
    } catch (err: any) {
      await dialogs.error(`Failed to load items for purchase: ${err.message}`);
    }
  };

  useEffect(() => {
    loadPurchases(1);
  }, []);

  // Remove client-side filtering since we're using server-side now
  useEffect(() => {
    // Debounced search - reload purchases when filters change
    const timeoutId = setTimeout(() => {
      loadPurchases(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    filters.search,
    filters.status,
    filters.startDate,
    filters.endDate,
    filters.supplier_name,
    filters.min_total,
    filters.max_total,
    filters.inventory_processed,
  ]);

  const handlePageChange = (page: number) => loadPurchases(page);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      startDate: "",
      endDate: "",
      supplier_name: "",
      min_total: "",
      max_total: "",
      inventory_processed: "",
    });
  };

  const togglePurchaseSelection = (id: number) => {
    setSelectedPurchases((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedPurchases.length === purchases.length) {
      setSelectedPurchases([]);
    } else {
      setSelectedPurchases(purchases.map((p) => p.id));
    }
  };

  const toggleExpandedPurchase = async (id: number) => {
    if (expandedPurchase === id) {
      setExpandedPurchase(null);
    } else {
      setExpandedPurchase(id);
      const purchase = purchases.find((p) => p.id === id);
      if (purchase && !purchase.items) await loadPurchaseItems(id);
    }
  };

  const handleConfirmPurchase = async (id: number) => {
    const confirmed = await dialogs.confirm({
      title: "Confirm Purchase Order",
      message: "Are you sure you want to confirm this purchase order?",
      icon: "question",
      confirmText: "Confirm Order",
    });
    if (!confirmed) return;

    try {
      setIsConfirming(id);
      const updated = await purchaseAPI.updateStatus(id, "confirmed");
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      );
      await dialogs.success(`Purchase #${id} confirmed successfully!`);
    } catch (err: any) {
      await dialogs.error(`Failed to confirm purchase: ${err.message}`);
    } finally {
      setIsConfirming(null);
    }
  };

  const handleReceivePurchase = async (id: number) => {
    const confirmed = await dialogs.confirm({
      title: "Receive Purchase",
      message: "Are you sure you want to mark this purchase as received?",
      icon: "question",
      confirmText: "Receive",
    });
    if (!confirmed) return;

    try {
      setIsReceiving(id);
      const updated = await purchaseAPI.markAsReceived(id);
      setPurchases((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p)),
      );
      await dialogs.success(`Purchase #${id} received!`);
    } catch (err: any) {
      await dialogs.error(`Failed to receive purchase: ${err.message}`);
    } finally {
      setIsReceiving(null);
    }
  };

  const handleDelete = async (id: number) => {
    const purchase = purchases.find((p) => p.id === id);
    const confirmed = await dialogs.delete(
      purchase?.purchase_number || "this purchase",
    );
    if (!confirmed) return;

    try {
      await purchaseAPI.delete(id);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      setSelectedPurchases((prev) => prev.filter((s) => s !== id));
      await dialogs.success("Purchase deleted successfully!");
    } catch (err: any) {
      await dialogs.error(`Failed to delete purchase: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPurchases.length) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Delete",
      message: `Delete ${selectedPurchases.length} selected purchase(s)?`,
      icon: "danger",
      confirmText: "Delete",
    });
    if (!confirmed) return;

    try {
      await purchaseAPI.bulkDelete(selectedPurchases);
      setPurchases((prev) =>
        prev.filter((p) => !selectedPurchases.includes(p.id)),
      );
      setSelectedPurchases([]);
      await dialogs.success(`${selectedPurchases.length} purchase(s) deleted!`);
    } catch (err: any) {
      await dialogs.error(`Failed to delete purchases: ${err.message}`);
    }
  };

  const handleRefresh = () => loadPurchases(pagination.current_page);

  const [quickStats, setQuickStats] = useState<PurchaseSummary>();

  const loadQuickStats = async () => {
    try {
      const response = await purchaseAPI.summary();
      setQuickStats(response.data);
    } catch (err: any) {
      showApiError(err);
    }
  };

  useEffect(() => {
    loadQuickStats();
  }, []);

  const canConfirmPurchase = (p: PurchaseWithItems) => p.status === "pending";
  const canReceivePurchase = (p: PurchaseWithItems) =>
    p.status === "confirmed" || p.status === "partial";

  return (
    <div
      className="compact-card rounded-lg shadow-sm border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Purchases
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage purchase orders and add items to inventory
          </p>
        </div>
        <div className="flex gap-sm">
          {/* Export */}
          <div
            className="flex items-center gap-xs rounded-md px-1 border"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <label
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: "var(--text-tertiary)" }}
            >
              Export as:
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="compact-input border rounded text-sm font-medium focus:ring-0 cursor-pointer px-xs py-xs"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading || purchases.length === 0}
              className="compact-button rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs"
              style={{
                backgroundColor: "var(--accent-green)",
                color: "white",
                ...(exportLoading || purchases.length === 0
                  ? { backgroundColor: "var(--default-color)", opacity: 0.6 }
                  : {}),
              }}
            >
              <Download className="icon-sm mr-xs" />
              {exportLoading ? "Exporting..." : "Export"}
            </button>
          </div>

          <button
            className="compact-button rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
          </button>
          <button
            className="compact-button rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`icon-sm mr-sm ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <Link
            to="/purchases/form"
            className="compact-button rounded-md flex items-center transition-colors"
            style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
          >
            <Plus className="icon-sm mr-sm" />
            New Purchase
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-6 p-sm rounded-md flex items-center border"
          style={{
            backgroundColor: "var(--accent-red-light)",
            borderColor: "var(--accent-red)",
          }}
        >
          <AlertCircle
            className="icon-sm mr-sm"
            style={{ color: "var(--danger-color)" }}
          />
          <div style={{ color: "var(--danger-color)" }}>
            <p className="font-medium text-sm">Error loading purchases</p>
            <p className="text-xs">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto"
            style={{ color: "var(--danger-color)" }}
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-sm mb-6">
        {[
          {
            label: "Total Purchases",
            value: quickStats?.total,
            color: "var(--sidebar-text)",
          },
          { label: "Pending", value: quickStats?.pending, color: "#fbbf24" },
          {
            label: "Confirmed",
            value: quickStats?.confirmed || 0,
            color: "var(--accent-blue)",
          },
          {
            label: "Total Items",
            value: quickStats?.totalItems,
            color: "var(--accent-purple)",
          },
          {
            label: "Total Value",
            value: formatCurrency(quickStats?.totalValue),
            color: "var(--accent-green)",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="compact-stats rounded-md border"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {stat.label}
            </div>
            <div
              className="text-xl font-bold mt-1"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm mb-6 compact-card rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Search purchase number, supplier..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="received">Received</option>
              <option value="partial">Partial</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Supplier Name
            </label>
            <input
              type="text"
              placeholder="Filter by supplier..."
              value={filters.supplier_name}
              onChange={(e) =>
                handleFilterChange("supplier_name", e.target.value)
              }
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Inventory Processed
            </label>
            <select
              value={filters.inventory_processed}
              onChange={(e) =>
                handleFilterChange("inventory_processed", e.target.value)
              }
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All</option>
              <option value="true">Processed</option>
              <option value="false">Not Processed</option>
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Min Total
            </label>
            <input
              type="number"
              placeholder="Minimum total"
              value={filters.min_total}
              onChange={(e) => handleFilterChange("min_total", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Max Total
            </label>
            <input
              type="number"
              placeholder="Maximum total"
              value={filters.max_total}
              onChange={(e) => handleFilterChange("max_total", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>
          <div className="flex items-end col-span-2">
            <button
              onClick={resetFilters}
              className="w-full compact-button rounded transition-colors"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "white",
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedPurchases.length > 0 && (
        <div
          className="mb-4 p-sm rounded-md flex items-center justify-between border"
          style={{
            backgroundColor: "var(--accent-blue-light)",
            borderColor: "var(--accent-blue)",
          }}
        >
          <span className="text-sm" style={{ color: "var(--accent-blue)" }}>
            {selectedPurchases.length} purchase(s) selected
          </span>
          <div className="flex gap-sm">
            <button
              onClick={handleBulkDelete}
              className="p-sm rounded transition-colors compact-button"
              style={{ backgroundColor: "var(--danger-color)", color: "white" }}
            >
              <Trash2 className="icon-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <span
            className="ml-3 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading purchases...
          </span>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <div
            className="overflow-x-auto rounded-md border"
            style={{ borderColor: "var(--border-color)" }}
          >
            <table
              className="min-w-full divide-y compact-table"
              style={{ borderColor: "var(--border-color)" }}
            >
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr>
                  <th
                    className="w-12 px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedPurchases.length === purchases.length &&
                        purchases.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ accentColor: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Purchase
                  </th>
                  <th
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Supplier
                  </th>
                  <th
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Date
                  </th>
                  <th
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Total
                  </th>
                  <th
                    className="px-md py-sm text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-bg)" }}>
                {purchases.map((purchase) => (
                  <React.Fragment key={purchase.id}>
                    <tr
                      className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <td className="px-md py-sm">
                        <input
                          type="checkbox"
                          checked={selectedPurchases.includes(purchase.id)}
                          onChange={() => togglePurchaseSelection(purchase.id)}
                          className="h-3 w-3 rounded"
                          style={{ accentColor: "var(--accent-blue)" }}
                        />
                      </td>
                      <td className="px-md py-sm">
                        <div className="flex items-center">
                          <button
                            onClick={() => toggleExpandedPurchase(purchase.id)}
                            className="mr-sm p-xs rounded hover:bg-[var(--card-hover-bg)] transition-colors"
                          >
                            <Package
                              className="icon-sm"
                              style={{ color: "var(--text-tertiary)" }}
                            />
                          </button>
                          <div>
                            <div
                              className="text-sm font-medium"
                              style={{ color: "var(--sidebar-text)" }}
                            >
                              {purchase.purchase_number}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              #{purchase.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-md py-sm">
                        <div
                          className="text-sm font-medium"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {purchase.supplier_name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {purchase.items_count || 0} items
                        </div>
                      </td>
                      <td
                        className="px-md py-sm text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDate(purchase.created_at)}
                      </td>
                      <td className="px-md py-sm">
                        <StatusBadge
                          status={purchase.status as Statuses}
                          size="sm"
                        />
                      </td>
                      <td
                        className="px-md py-sm text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {formatCurrency(purchase.total)}
                      </td>
                      <td className="px-md py-sm text-right">
                        <div className="flex justify-end gap-xs">
                          <button
                            onClick={() =>
                              navigate(`/purchases/view/${purchase.id}`)
                            }
                            className="p-xs rounded hover:bg-[var(--accent-blue-light)] transition-colors"
                            style={{ color: "var(--accent-blue)" }}
                            title="View"
                          >
                            <Eye className="icon-sm" />
                          </button>
                          {purchase.status === "pending" && (
                            <button
                              onClick={() =>
                                navigate(`/purchases/form/${purchase.id}`)
                              }
                              className="p-xs rounded hover:bg-[var(--accent-blue-light)] transition-colors"
                              style={{ color: "var(--accent-blue)" }}
                              title="Edit"
                            >
                              <Edit className="icon-sm" />
                            </button>
                          )}
                          {/* {canConfirmPurchase(purchase) && (
                            <button onClick={() => handleConfirmPurchase(purchase.id)} disabled={isConfirming === purchase.id} className="p-xs rounded hover:bg-[var(--accent-green-light)] transition-colors disabled:opacity-50" style={{ color: 'var(--accent-green)' }} title="Confirm">
                              {isConfirming === purchase.id ? <RefreshCw className="icon-sm animate-spin" /> : <CheckCircle className="icon-sm" />}
                            </button>
                          )}
                          {canReceivePurchase(purchase) && (
                            <button onClick={() => handleReceivePurchase(purchase.id)} disabled={isReceiving === purchase.id} className="p-xs rounded hover:bg-[var(--accent-green-light)] transition-colors disabled:opacity-50" style={{ color: 'var(--accent-green)' }} title="Receive">
                              {isReceiving === purchase.id ? <RefreshCw className="icon-sm animate-spin" /> : <Truck className="icon-sm" />}
                            </button>
                          )} */}
                          <button
                            onClick={() => handleDelete(purchase.id)}
                            className="p-xs rounded hover:bg-[var(--accent-red-light)] transition-colors"
                            style={{ color: "var(--danger-color)" }}
                            title="Delete"
                          >
                            <Trash2 className="icon-sm" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Items */}
                    {expandedPurchase === purchase.id && (
                      <tr>
                        <td colSpan={7} className="px-md py-sm">
                          <div
                            className="rounded-md border"
                            style={{
                              backgroundColor: "var(--card-bg)",
                              borderColor: "var(--border-color)",
                            }}
                          >
                            {purchase.items && purchase.items.length > 0 ? (
                              <table
                                className="min-w-full divide-y compact-table"
                                style={{ borderColor: "var(--border-color)" }}
                              >
                                <thead
                                  style={{
                                    backgroundColor: "var(--card-secondary-bg)",
                                  }}
                                >
                                  <tr>
                                    {[
                                      "Product",
                                      "Variant",
                                      "Quantity",
                                      "Unit Cost",
                                      "Total",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        className="px-md py-sm text-left text-xs font-medium uppercase"
                                        style={{
                                          color: "var(--text-tertiary)",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {purchase.items.map((item) => (
                                    <tr
                                      key={item.id}
                                      className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                                      style={{
                                        borderBottom:
                                          "1px solid var(--border-color)",
                                      }}
                                    >
                                      <td
                                        className="px-md py-sm text-sm"
                                        style={{ color: "var(--sidebar-text)" }}
                                      >
                                        {item.product_data?.name ||
                                          `Product ${item.product_data?.id}`}
                                      </td>
                                      <td
                                        className="px-md py-sm text-sm"
                                        style={{
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        {item.variant_data?.name || "Default"}
                                      </td>
                                      <td
                                        className="px-md py-sm text-sm"
                                        style={{ color: "var(--sidebar-text)" }}
                                      >
                                        {item.quantity}
                                      </td>
                                      <td
                                        className="px-md py-sm text-sm"
                                        style={{ color: "var(--sidebar-text)" }}
                                      >
                                        {formatCurrency(item.unit_cost)}
                                      </td>
                                      <td
                                        className="px-md py-sm text-sm font-medium"
                                        style={{ color: "var(--sidebar-text)" }}
                                      >
                                        {formatCurrency(item.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div
                                className="text-center py-8 text-sm"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                No items found for this purchase.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {purchases.length === 0 && (
            <div className="text-center py-8">
              <div
                className="text-4xl mb-4"
                style={{ color: "var(--text-tertiary)" }}
              >
                Package
              </div>
              <p
                className="text-base mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {Object.values(filters).some((filter) => filter !== "")
                  ? "No purchases match your filters."
                  : "No purchases found."}
              </p>
              {Object.values(filters).some((filter) => filter !== "") ? (
                <button
                  onClick={resetFilters}
                  className="mt-4 rounded-md transition-colors compact-button"
                  style={{
                    backgroundColor: "var(--accent-blue)",
                    color: "white",
                  }}
                >
                  Clear Filters
                </button>
              ) : (
                <Link
                  to="/purchases/form"
                  className="mt-4 inline-flex items-center rounded-md transition-colors compact-button"
                  style={{
                    backgroundColor: "var(--accent-blue)",
                    color: "white",
                  }}
                >
                  <Plus className="icon-sm mr-sm" />
                  Create Your First Purchase
                </Link>
              )}
            </div>
          )}

          {purchases.length > 0 && (
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

export default PurchasesPage;
