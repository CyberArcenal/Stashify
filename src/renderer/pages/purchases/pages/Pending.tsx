// components/Pending.tsx
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
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Filter,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { dialogs } from "@/renderer/utils/dialogs";
import {
  showSuccess,
  showError,
  showLoading,
  hideLoading,
} from "@/renderer/utils/notification";
import StatusBadge, { Statuses } from "@/renderer/components/Badge/StatusBadge";
import { formatCurrency, formatDate } from "@/renderer/utils/formatters";

interface Filters {
  search: string;
  supplier: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

const PendingPurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPurchase, setProcessingPurchase] = useState<number | null>(
    null,
  );
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

  const [quickStats, setQuickStats] = useState<PurchaseSummary>();

  const fetchPurchases = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const searchParams: PurchaseSearchParams = {
        status: "pending",
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

  useEffect(() => {
    fetchPurchases(currentPage);
  }, [currentPage]);

  const loadQuickStats = async () => {
    try {
      const response = await purchaseAPI.summary();
      setQuickStats(response.data);
    } catch (err: any) {
      showError(err.message || "Failed to load quick stats");
    }
  };

  useEffect(() => {
    loadQuickStats();
  }, []);

  const handlePageChange = (page: number) => setCurrentPage(page);

  const pendingPurchases = purchases.filter((p) => p.status === "pending");
  const pendingValue = pendingPurchases.reduce(
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
    const sortableItems = [...pendingPurchases];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof PurchaseData];
        let bValue: any = b[sortConfig.key as keyof PurchaseData];

        // Handle nested properties
        if (sortConfig.key === "supplier_name") {
          aValue = a.supplier_name;
          bValue = b.supplier_name;
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
  }, [pendingPurchases, sortConfig]);

  const togglePurchaseSelection = (purchaseId: number) => {
    setSelectedPurchases((prev) =>
      prev.includes(purchaseId)
        ? prev.filter((id) => id !== purchaseId)
        : [...prev, purchaseId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedPurchases.length === pendingPurchases.length) {
      setSelectedPurchases([]);
    } else {
      setSelectedPurchases(pendingPurchases.map((purchase) => purchase.id));
    }
  };

  const handleConfirmPurchase = async (purchaseId: number) => {
    const confirm = await dialogs.confirm({
      title: "Confirm Purchase",
      message: `Are you sure you want to confirm purchase #${purchaseId}?`,
      icon: "warning",
    });
    if (!confirm) return;

    try {
      setProcessingPurchase(purchaseId);
      showLoading("Confirming purchase...");
      await purchaseAPI.updateStatus(purchaseId, "confirmed");
      showSuccess("Purchase confirmed successfully");
      await fetchPurchases(currentPage);
      await loadQuickStats();
    } catch (err: any) {
      showError(err.message || "Failed to confirm purchase");
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
      showError(err.message || "Failed to cancel purchase");
    } finally {
      setProcessingPurchase(null);
      hideLoading();
    }
  };

  const exportToCSV = async () => {
    if (purchases.length === 0) {
      showError("No data to export");
      return;
    }
    try {
      const allPending = await purchaseAPI.findAll({ status: "pending" });
      const csvContent = purchaseAPI.exportPurchasesToCSV(allPending);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pending-purchases-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccess("Exported successfully");
    } catch {
      showError("Failed to export");
    } finally {
      hideLoading();
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedPurchases.length === 0) return;

    const confirm = await dialogs.confirm({
      title: "Bulk Confirm Purchases",
      message: `Are you sure you want to confirm ${selectedPurchases.length} purchase(s)?`,
      icon: "warning",
    });
    if (!confirm) return;

    try {
      showLoading(`Confirming ${selectedPurchases.length} purchases...`);
      await Promise.all(
        selectedPurchases.map((purchaseId) =>
          purchaseAPI.updateStatus(purchaseId, "confirmed"),
        ),
      );
      showSuccess(
        `${selectedPurchases.length} purchases confirmed successfully`,
      );
      setSelectedPurchases([]);
      await fetchPurchases(currentPage);
      await loadQuickStats();
    } catch (err: any) {
      showError(err.message || "Failed to confirm purchases");
    } finally {
      hideLoading();
    }
  };

  // Loading State
  if (loading && purchases.length === 0) {
    return (
      <div
        className="compact-card rounded-lg shadow-sm border"
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
            Loading pending purchases...
          </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error && purchases.length === 0) {
    return (
      <div
        className="compact-card rounded-lg shadow-sm border"
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
      {/* Header */}
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
            Pending Purchases
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Review and confirm pending purchase orders
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
              style={{ backgroundColor: "var(--accent-green)" }}
              onClick={handleBulkConfirm}
            >
              <CheckCircle className="icon-sm mr-xs" />
              Confirm All
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
            Total Pending Value
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {formatCurrency(quickStats?.totalPendingValue)}
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
            Pending Count
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--accent-orange)" }}
          >
            <AlertTriangle className="icon-sm" />
            {quickStats?.pending}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-orange)", opacity: 0.1 }}
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
                    selectedPurchases.length === pendingPurchases.length &&
                    pendingPurchases.length > 0
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
                  {purchase.supplier_name}
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
                <td className="px-md py-sm text-right">
                  <div className="flex justify-end gap-xs">
                    {purchase.status === "pending" && (
                      <button
                        onClick={() => handleConfirmPurchase(purchase.id)}
                        disabled={processingPurchase === purchase.id}
                        className="compact-button rounded-md flex items-center transition-all duration-200 hover:scale-105 disabled:opacity-50"
                        style={{
                          backgroundColor: "var(--accent-green)",
                          color: "white",
                        }}
                      >
                        {processingPurchase === purchase.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            Confirming...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="icon-sm mr-xs" />
                            Confirm
                          </>
                        )}
                      </button>
                    )}
                    {(purchase.status === "pending" ||
                      purchase.status === "confirmed") && (
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
                    )}
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
      {pendingPurchases.length === 0 && !loading && (
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
            No pending purchases
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {filters.search || filters.startDate || filters.endDate
              ? "Try adjusting your search criteria or filters"
              : "All purchase orders have been processed"}
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
      {pendingPurchases.length > 0 && (
        <div className="flex items-center justify-between mt-4 transition-all duration-300">
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * pagination.page_size + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * pagination.page_size, pagination.count)}
            </span>{" "}
            of <span className="font-medium">{pagination.count}</span> pending
            purchases
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
    </div>
  );
};

export default PendingPurchasesPage;
