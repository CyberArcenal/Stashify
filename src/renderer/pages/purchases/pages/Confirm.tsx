// components/Confirm.tsx
import React, { useState, useEffect } from "react";
import {
  purchaseAPI,
  PurchaseData,
  PurchaseSearchParams,
  PurchasesResponse,
  PurchaseSummary,
} from "@/renderer/api/purchase";
import { Pagination as PaginationType } from "@/renderer/api/category";
import Pagination from "@/renderer/components/UI/Pagination";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Truck,
  Package,
  X,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckSquare,
  Square,
} from "lucide-react";
import { dialogs } from "@/renderer/utils/dialogs";
import {
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showApiError,
} from "@/renderer/utils/notification";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";
import { PurchaseItemNestedData } from "@/renderer/api/purchaseItem";

interface PurchaseItemDetail {
  id: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_cost: string;
  total_cost: string;
}

interface PurchaseWithItems extends PurchaseData {
  items?: PurchaseItemNestedData[];
}

interface Filters {
  search: string;
  supplier: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

const ToReceivePurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPurchase, setProcessingPurchase] = useState<number | null>(
    null,
  );
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] =
    useState<PurchaseWithItems | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPurchases, setSelectedPurchases] = useState<number[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    next: null,
    previous: null,
    count: 0,
    current_page: 1,
    total_pages: 1,
    page_size: 10,
  });

  const [filters, setFilters] = useState<Filters>({
    search: "",
    supplier: "all",
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

  const fetchPurchases = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const searchParams: PurchaseSearchParams = {
        status: "confirmed",
        ...(filters.search && { search: filters.search }),
        ...(filters.supplier !== "all" && { supplier: filters.supplier }),
        ...(filters.startDate && { date_from: filters.startDate }),
        ...(filters.endDate && { date_to: filters.endDate }),
      };
      const response: PurchasesResponse = await purchaseAPI.findPage(
        10,
        page,
        searchParams,
      );
      setPurchases(response.data || []);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error("Failed to fetch purchases:", err);
      setError(err.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseDetails = async (
    purchaseId: number,
  ): Promise<PurchaseWithItems> => {
    try {
      const purchase = await purchaseAPI.findById(purchaseId);
      return {
        ...purchase,
        items: purchase?.items_data,
      } as PurchaseWithItems;
    } catch (error) {
      throw new Error("Failed to fetch purchase details");
    }
  };

  useEffect(() => {
    fetchPurchases(currentPage);
  }, [currentPage]);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const confirmedPurchases = purchases.filter((p) => p.status === "confirmed");
  const totalValue = confirmedPurchases.reduce(
    (sum, p) => sum + parseFloat(p.total),
    0,
  );

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      supplier: "all",
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

  // Sort purchases
  const sortedPurchases = React.useMemo(() => {
    const sortableItems = [...confirmedPurchases];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof PurchaseData];
        let bValue: any = b[sortConfig.key as keyof PurchaseData];

        if (sortConfig.key === "supplier_name") {
          aValue = a.supplier_data?.name;
          bValue = b.supplier_data?.name;
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
  }, [confirmedPurchases, sortConfig]);

  const togglePurchaseSelection = (purchaseId: number) => {
    setSelectedPurchases((prev) =>
      prev.includes(purchaseId)
        ? prev.filter((id) => id !== purchaseId)
        : [...prev, purchaseId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedPurchases.length === confirmedPurchases.length) {
      setSelectedPurchases([]);
    } else {
      setSelectedPurchases(confirmedPurchases.map((purchase) => purchase.id));
    }
  };

  const handleOpenReceiveModal = async (purchase: PurchaseWithItems) => {
    try {
      showLoading("Loading purchase details...");
      const details = await fetchPurchaseDetails(purchase.id);
      setSelectedPurchase(details);
      setShowReceiveModal(true);
    } catch (err: any) {
      showApiError(err.message || "Failed to load purchase details");
    } finally {
      hideLoading();
    }
  };

  const handleReceivePurchase = async (purchaseId: number) => {
    try {
      setProcessingPurchase(purchaseId);
      showLoading("Marking purchase as received...");
      await purchaseAPI.updateStatus(purchaseId, "received");
      showSuccess("Purchase marked as received successfully");
      await fetchPurchases(currentPage);
      await loadQuickStats();
      setShowReceiveModal(false);
      setSelectedPurchase(null);
    } catch (err: any) {
      showApiError(err.message || "Failed to receive purchase");
    } finally {
      setProcessingPurchase(null);
      hideLoading();
    }
  };

  const handleCancelPurchase = async (purchaseId: number) => {
    const confirm = await dialogs.confirm({
      title: "Cancel Purchase",
      message: `Are you sure you want to cancel purchase #${purchaseId}?`,
      icon: "danger",
    });
    if (!confirm) return;

    try {
      setProcessingPurchase(purchaseId);
      showLoading("Cancelling purchase...");
      await purchaseAPI.updateStatus(purchaseId, "cancelled");
      showSuccess("Purchase cancelled successfully");
      await fetchPurchases(currentPage);
      await loadQuickStats();
    } catch (err: any) {
      showApiError(err.message || "Failed to cancel purchase");
    } finally {
      setProcessingPurchase(null);
      hideLoading();
    }
  };

  const handleBulkCancel = async () => {
    if (selectedPurchases.length === 0) return;

    const confirm = await dialogs.confirm({
      title: "Bulk Cancel Purchases",
      message: `Are you sure you want to cancel ${selectedPurchases.length} purchase(s)?`,
      icon: "danger",
    });
    if (!confirm) return;

    try {
      showLoading(`Cancelling ${selectedPurchases.length} purchases...`);
      await Promise.all(
        selectedPurchases.map((purchaseId) =>
          purchaseAPI.updateStatus(purchaseId, "cancelled"),
        ),
      );
      showSuccess(
        `${selectedPurchases.length} purchases cancelled successfully`,
      );
      setSelectedPurchases([]);
      await fetchPurchases(currentPage);
      await loadQuickStats();
    } catch (err: any) {
      showError(err.message || "Failed to cancel purchases");
    } finally {
      hideLoading();
    }
  };

  const exportToCSV = async () => {
    if (purchases.length === 0) {
      showError("No data to export");
      return;
    }
    try {
      const allConfirmed = await purchaseAPI.findAll({ status: "confirmed" });
      const csvContent = purchaseAPI.exportPurchasesToCSV(allConfirmed);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `to-receive-purchases-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess("Exported successfully");
    } catch {
      showError("Failed to export");
    } finally {
      hideLoading();
    }
  };

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

  const closeReceiveModal = () => {
    setShowReceiveModal(false);
    setSelectedPurchase(null);
  };

  // Loading State
  if (loading && purchases.length === 0) {
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
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <span
            className="ml-3 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading to-receive purchases...
          </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error && purchases.length === 0) {
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
            Error loading purchases
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {error}
          </p>
          <button
            onClick={() => fetchPurchases(currentPage)}
            className="compact-button rounded-md transition-colors hover:scale-105 transform duration-200"
            style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
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
              style={{ backgroundColor: "var(--accent-blue)" }}
            ></div>
            To Receive Purchases
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage confirmed purchase orders waiting to be received
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
            disabled={purchases.length === 0}
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
            onClick={() => fetchPurchases(currentPage)}
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
                placeholder="Search purchase numbers, suppliers..."
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
                onClick={() => fetchPurchases(1)}
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
      {selectedPurchases.length > 0 && (
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
            {selectedPurchases.length} purchase(s) selected
          </span>
          <div className="flex gap-xs">
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
            Total To Receive Value
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {formatCurrency(quickStats?.totalToReceiveValue)}
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
            Average Purchase Value
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {formatCurrency(quickStats?.avgPurchaseValue)}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-green)", opacity: 0.1 }}
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
            Purchases Today
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {quickStats?.purchasesToday}
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
            To Receive Count
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--accent-blue)" }}
          >
            <Package className="icon-sm" />
            {quickStats?.confirmed}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-blue)", opacity: 0.1 }}
          ></div>
        </div>
      </div>

      {/* Enhanced Table */}
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
                    selectedPurchases.length === confirmedPurchases.length &&
                    confirmedPurchases.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="h-3 w-3 rounded transition-all duration-200"
                  style={{ color: "var(--accent-blue)" }}
                />
              </th>
              {[
                { key: "purchase_number", label: "Purchase Number" },
                { key: "supplier_name", label: "Supplier" },
                { key: "created_at", label: "Date" },
                { key: "total", label: "Total Amount" },
                { key: "status", label: "Status" },
                { key: "items_count", label: "Items" },
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
            {sortedPurchases.map((purchase, index) => (
              <tr
                key={purchase.id}
                className="hover:bg-[var(--card-secondary-bg)] transition-all duration-200 transform hover:scale-[1.002] group"
                style={{
                  borderBottom: "1px solid var(--border-color)",
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <td className="px-2 py-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedPurchases.includes(purchase.id)}
                    onChange={() => togglePurchaseSelection(purchase.id)}
                    className="h-3 w-3 rounded transition-all duration-200"
                    style={{ color: "var(--accent-blue)" }}
                  />
                </td>
                <td className="px-md py-sm">
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
                </td>
                <td
                  className="px-md py-sm text-sm font-medium"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {purchase.supplier_data?.name}
                </td>
                <td
                  className="px-md py-sm text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatDate(purchase.created_at)}
                </td>
                <td
                  className="px-md py-sm text-sm font-medium"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formatCurrency(parseFloat(purchase.total))}
                </td>
                <td className="px-md py-sm">
                  <StatusBadge status={purchase.status as Statuses} size="sm" />
                </td>
                <td className="px-md py-sm">
                  <div
                    className="flex items-center text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Package
                      className="icon-sm mr-xs"
                      style={{ color: "var(--accent-blue)" }}
                    />
                    {purchase.items_count} items
                  </div>
                </td>
                <td className="px-md py-sm text-right">
                  <div className="flex justify-end gap-xs">
                    <button
                      onClick={() => handleOpenReceiveModal(purchase)}
                      disabled={processingPurchase === purchase.id}
                      className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--accent-green)",
                        color: "white",
                      }}
                    >
                      <Truck className="icon-sm mr-xs" />
                      Receive
                    </button>
                    <button
                      onClick={() => handleCancelPurchase(purchase.id)}
                      disabled={processingPurchase === purchase.id}
                      className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--danger-color)",
                        color: "white",
                      }}
                    >
                      <XCircle className="icon-sm mr-xs" />
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Loading State for table */}
      {loading && purchases.length > 0 && (
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
      {confirmedPurchases.length === 0 && !loading && (
        <div className="text-center py-12 transition-all duration-300">
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
            No purchases to receive
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {filters.search || filters.startDate || filters.endDate
              ? "Try adjusting your search criteria or filters"
              : "All confirmed purchases have been received or there are no confirmed purchases"}
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

      {/* Enhanced Pagination */}
      {pagination.total_pages > 1 && (
        <Pagination
          pagination={pagination}
          onPageChange={handlePageChange}
          className="mt-6 transition-all duration-300"
        />
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

      {/* Enhanced Receive Modal */}
      {showReceiveModal && selectedPurchase && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fadeIn"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            {/* Modal Header */}
            <div
              className="flex justify-between items-center border-b p-6"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div>
                <h3
                  className="text-lg font-semibold flex items-center gap-2"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Truck
                    className="icon-sm"
                    style={{ color: "var(--accent-green)" }}
                  />
                  Confirm Receipt - {selectedPurchase.purchase_number}
                </h3>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Review items before confirming receipt
                </p>
              </div>
              <button
                onClick={closeReceiveModal}
                className="p-1 rounded-md transition-all duration-200 hover:scale-110 hover:bg-[var(--card-secondary-bg)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X className="icon-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  {
                    label: "Supplier",
                    value: selectedPurchase.supplier_data?.name,
                    icon: "🏢",
                  },
                  {
                    label: "Total Amount",
                    value: formatCurrency(parseFloat(selectedPurchase.total)),
                    icon: "💰",
                  },
                  {
                    label: "Items Count",
                    value: `${selectedPurchase.items_count} items`,
                    icon: "📦",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-4 transition-all duration-200 hover:scale-105 transform"
                    style={{ backgroundColor: "var(--card-secondary-bg)" }}
                  >
                    <div
                      className="text-sm font-medium flex items-center gap-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </div>
                    <div
                      className="text-base font-semibold mt-1"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Enhanced Items Table */}
              <div>
                <h4
                  className="text-md font-semibold mb-4 flex items-center gap-2"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Package className="icon-sm" />
                  Purchase Items
                </h4>
                <div
                  className="overflow-x-auto rounded-md border transition-all duration-300"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <table
                    className="min-w-full divide-y"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <thead
                      style={{ backgroundColor: "var(--card-secondary-bg)" }}
                    >
                      <tr>
                        {[
                          "Product",
                          "Variant",
                          "Quantity",
                          "Unit Cost",
                          "Total Cost",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-medium uppercase transition-colors hover:bg-[var(--card-hover-bg)]"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items?.map((item, index) => (
                        <tr
                          key={item.id}
                          className="hover:bg-[var(--card-secondary-bg)] transition-all duration-200 transform hover:scale-[1.002]"
                          style={{
                            borderBottom: "1px solid var(--border-color)",
                            animationDelay: `${index * 0.05}s`,
                          }}
                        >
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.product_data?.name}
                          </td>
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item.variant_data?.name || "N/A"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            className="px-4 py-3 text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {formatCurrency(parseFloat(item.unit_cost))}
                          </td>
                          <td
                            className="px-4 py-3 text-sm font-medium"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {formatCurrency(parseFloat(item.total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot
                      style={{ backgroundColor: "var(--card-secondary-bg)" }}
                    >
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-sm font-medium text-right"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Grand Total:
                        </td>
                        <td
                          className="px-4 py-3 text-sm font-bold transition-colors"
                          style={{ color: "var(--accent-green)" }}
                        >
                          {formatCurrency(parseFloat(selectedPurchase.total))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div className="mt-6 transition-all duration-300">
                  <h4
                    className="text-md font-semibold mb-2 flex items-center gap-2"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <span>📝</span>
                    Notes
                  </h4>
                  <div
                    className="rounded-lg p-4 transition-all duration-200 hover:scale-105 transform"
                    style={{ backgroundColor: "var(--card-secondary-bg)" }}
                  >
                    <p
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {selectedPurchase.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-between items-center border-t p-6"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div
                className="text-sm flex items-center gap-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <AlertCircle
                  className="icon-sm"
                  style={{ color: "var(--accent-orange)" }}
                />
                Please verify all items are correct before confirming receipt
              </div>
              <div className="flex gap-sm">
                <button
                  onClick={closeReceiveModal}
                  className="compact-button rounded-md transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReceivePurchase(selectedPurchase.id)}
                  disabled={processingPurchase === selectedPurchase.id}
                  className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--accent-green)",
                    color: "white",
                  }}
                >
                  {processingPurchase === selectedPurchase.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="icon-sm mr-xs" />
                      Confirm Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToReceivePurchasesPage;
