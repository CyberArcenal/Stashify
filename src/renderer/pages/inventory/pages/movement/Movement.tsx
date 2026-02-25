import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  ArrowUp,
  ArrowDown,
  Package,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  stockMovementAPI,
  StockMovementData,
  StockMovementSearchParams,
} from "@/renderer/api/stockMovement";
import { Pagination as PaginationType } from "@/renderer/api/category";
import Pagination from "@/renderer/components/UI/Pagination";
import {
  stockMovementExportAPI,
  StockMovementExportParams,
} from "@/renderer/api/exports/movement";
import Button from "@/renderer/components/UI/Button";
import { dialogs } from "@/renderer/utils/dialogs";
import { showSuccess, showApiError } from "@/renderer/utils/notification";

interface Filters {
  search: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface SortConfig {
  key:
    | keyof StockMovementData
    | "product_name"
    | "variant_name"
    | "warehouse_name";
  direction: "asc" | "desc";
}

const StockMovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<StockMovementData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMovements, setSelectedMovements] = useState<number[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  // Export states
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "desc",
  });

  // Available page sizes
  const pageSizes = [10, 25, 50, 100];

  // Fetch movements from API
  const fetchMovements = async (
    page: number = 1,
    pageSize: number = pagination.page_size,
  ) => {
    setLoading(true);
    try {
      const searchParams: StockMovementSearchParams = {};

      // Map UI filters to API search params
      if (filters.search) {
        searchParams.search = filters.search;
      }
      if (filters.type) {
        searchParams.movement_type =
          filters.type === "IN" ? "incoming" : "outgoing";
      }
      if (filters.startDate) {
        searchParams.start_date = filters.startDate;
      }
      if (filters.endDate) {
        searchParams.end_date = filters.endDate;
      }
      if (filters.reason) {
        searchParams.reason = filters.reason;
      }

      const response = await stockMovementAPI.findPage(
        pageSize,
        page,
        searchParams,
      );

      if (response.status) {
        setMovements(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch stock movements:", error);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when filters change
  useEffect(() => {
    fetchMovements(1);
  }, [filters]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "",
      startDate: "",
      endDate: "",
      reason: "",
    });
  };

  const handlePageChange = (page: number) => {
    fetchMovements(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination((prev) => ({ ...prev, page_size: newSize }));
    fetchMovements(1, newSize);
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleMovementSelection = (movementId: number) => {
    setSelectedMovements((prev) =>
      prev.includes(movementId)
        ? prev.filter((id) => id !== movementId)
        : [...prev, movementId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedMovements.length === movements.length) {
      setSelectedMovements([]);
    } else {
      setSelectedMovements(movements.map((movement) => movement.id));
    }
  };

  // Enhanced Export Functionality
  const handleExport = async () => {
    if (movements.length === 0) {
      await dialogs.warning("No stock movement data to export.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Stock Movements",
      message: `Are you sure you want to export ${pagination.count} movement(s) in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      setExportLoading(true);

      // Prepare export parameters based on current filters
      const exportParams: StockMovementExportParams = {
        format: exportFormat,
        movement_type: filters.type
          ? filters.type === "IN"
            ? "in"
            : "out"
          : undefined,
        warehouse: undefined,
        stock_item: undefined,
        date_from: filters.startDate || undefined,
        date_to: filters.endDate || undefined,
        search: filters.search || undefined,
        change_direction: filters.type
          ? filters.type === "IN"
            ? "in"
            : "out"
          : undefined,
      };

      // Validate export parameters
      const validationErrors =
        stockMovementExportAPI.validateExportParams(exportParams);
      if (validationErrors.length > 0) {
        await dialogs.error(
          `Export validation failed:\n${validationErrors.join("\n")}`,
        );
        return;
      }

      // Execute export
      await stockMovementExportAPI.exportMovements(exportParams);
      showSuccess("Stock movements exported successfully");
    } catch (error: any) {
      console.error("Export failed:", error);
      showApiError(error.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  // Export preview data
  const handleExportPreview = async () => {
    try {
      setExportLoading(true);

      const previewParams: Omit<StockMovementExportParams, "format"> = {
        movement_type: filters.type
          ? filters.type === "IN"
            ? "in"
            : "out"
          : undefined,
        warehouse: undefined,
        stock_item: undefined,
        date_from: filters.startDate || undefined,
        date_to: filters.endDate || undefined,
        search: filters.search || undefined,
        change_direction: filters.type
          ? filters.type === "IN"
            ? "in"
            : "out"
          : undefined,
      };

      const previewData =
        await stockMovementExportAPI.getExportPreview(previewParams);

      // Show preview summary
      const increases = previewData.analytics.movement_breakdown.find(
        (a) => a.total_change > 0,
      );
      const decreases = previewData.analytics.movement_breakdown.find(
        (a) => a.total_change < 0,
      );

      await dialogs.info(
        `Total Movements: ${previewData.metadata.total_records}\nTotal Quantity Moved: ${previewData.analytics.total_quantity_moved}\nStock In: ${increases?.total_change || 0} units\nStock Out: ${Math.abs(decreases?.total_change || 0)} units`,
      );
    } catch (error: any) {
      console.error("Preview failed:", error);
      showApiError(error.message || "Preview failed");
    } finally {
      setExportLoading(false);
    }
  };

  // Simple CSV export (backward compatibility)
  const exportToCSV = async () => {
    if (movements.length === 0) {
      await dialogs.warning("No stock movement data to export.");
      return;
    }

    const headers = [
      "ID",
      "Product",
      "Variant",
      "SKU",
      "Movement Type",
      "Quantity Change",
      "Direction",
      "Warehouse",
      "Reference Code",
      "Reason",
      "Created By",
      "Date",
    ];

    const rows = movements.map((movement) => [
      movement.id.toString(),
      movement.stock_item_data?.product_data?.name || "N/A",
      movement.stock_item_data?.variant_data?.name || "N/A",
      movement.stock_item_data?.product_data?.sku || "N/A",
      stockMovementAPI.getMovementTypeLabel(movement.movement_type),
      Math.abs(movement.change).toString(),
      movement.movement_type === "incoming" ? "IN" : "OUT",
      movement.stock_item_data?.warehouse_data?.name || "N/A",
      movement.reference_code || "",
      movement.reason || "",
      movement.created_by_data?.full_name || "System",
      formatDate(movement.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showSuccess("CSV export completed");
  };

  // Sort movements
  const sortedMovements = React.useMemo(() => {
    const sortableItems = [...movements];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case "product_name":
            aValue = a.stock_item_data.product_data?.name?.toLowerCase() || "";
            bValue = b.stock_item_data.product_data?.name?.toLowerCase() || "";
            break;
          case "variant_name":
            aValue = a.stock_item_data.variant_data?.name?.toLowerCase() || "";
            bValue = b.stock_item_data.variant_data?.name?.toLowerCase() || "";
            break;
          case "warehouse_name":
            aValue =
              a.stock_item_data.warehouse_data?.name?.toLowerCase() || "";
            bValue =
              b.stock_item_data.warehouse_data?.name?.toLowerCase() || "";
            break;
          default:
            aValue = a[sortConfig.key as keyof StockMovementData];
            bValue = b[sortConfig.key as keyof StockMovementData];
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
  }, [movements, sortConfig]);

  const getTypeBadge = (movementType: "incoming" | "outgoing") => {
    switch (movementType) {
      case "incoming":
        return "bg-green-100 text-green-800";
      case "outgoing":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (movementType: "incoming" | "outgoing") => {
    return movementType === "incoming" ? ArrowDown : ArrowUp;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-xs" />
    ) : (
      <ChevronDown className="icon-xs" />
    );
  };

  // Quick Stats Data - calculated from current data
  const quickStats = {
    total: pagination.count,
    in: movements.filter((m) => m.movement_type === "incoming").length,
    out: movements.filter((m) => m.movement_type === "outgoing").length,
    totalIn: movements
      .filter((m) => m.movement_type === "incoming")
      .reduce((sum, movement) => sum + movement.change, 0),
    totalOut: movements
      .filter((m) => m.movement_type === "outgoing")
      .reduce((sum, movement) => sum + Math.abs(movement.change), 0),
    netMovement: movements.reduce((sum, movement) => {
      return movement.movement_type === "incoming"
        ? sum + movement.change
        : sum - Math.abs(movement.change);
    }, 0),
  };

  const commonReasons = stockMovementAPI.getCommonReasons();

  return (
    <div
      className="compact-card rounded-md shadow-md"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
        borderWidth: "1px",
      }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-4">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Stock Movements
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Track inventory movements and stock changes
          </p>
        </div>
        <div className="flex flex-wrap gap-xs w-full sm:w-auto">
          <button
            className="compact-button rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-xs" />
            Filters {showFilters ? "↑" : "↓"}
          </button>

          {/* Compact Export Section */}
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
                className="text-xs border-none focus:ring-0 cursor-pointer"
                style={{
                  color: "var(--sidebar-text)",
                  backgroundColor: "var(--card-secondary-bg)",
                }}
                disabled={exportLoading}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={exportLoading || movements.length === 0}
              className="compact-button rounded-md flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-xs"
              title={
                movements.length === 0
                  ? "No movements to export"
                  : `Export ${pagination.count} movements`
              }
            >
              <Download className="icon-xs" />
              {exportLoading ? "..." : "Export"}
            </Button>
          </div>

          {/* Export Options Dropdown */}
          <div className="relative">
            <button
              className="compact-button rounded-md flex items-center transition-colors"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                color: "var(--sidebar-text)",
              }}
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={exportLoading}
            >
              <Download className="icon-sm mr-xs" />
              Options
              <ChevronDown className="icon-sm ml-xs" />
            </button>

            {showExportOptions && (
              <div
                className="absolute right-0 top-full mt-1 rounded-md shadow-lg z-10 min-w-48"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  borderColor: "var(--border-color)",
                  borderWidth: "1px",
                }}
              >
                <div className="p-2">
                  <button
                    onClick={() => {
                      handleExportPreview();
                      setShowExportOptions(false);
                    }}
                    disabled={exportLoading || movements.length === 0}
                    className="w-full text-left px-3 py-2 text-sm rounded-md disabled:opacity-50 hover:bg-[var(--card-bg)] transition-colors"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    📊 Preview Export Data
                  </button>
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportOptions(false);
                    }}
                    disabled={exportLoading || movements.length === 0}
                    className="w-full text-left px-3 py-2 text-sm rounded-md disabled:opacity-50 hover:bg-[var(--card-bg)] transition-colors"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    📄 Quick CSV Export
                  </button>
                  <div
                    className="border-t mt-2 pt-2"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <div
                      className="px-3 py-1 text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Records: {pagination.count}
                    </div>
                    <div
                      className="px-3 py-1 text-xs"
                      style={{ color: "var(--accent-green)" }}
                    >
                      Stock In: {quickStats.in}
                    </div>
                    <div
                      className="px-3 py-1 text-xs"
                      style={{ color: "var(--accent-red)" }}
                    >
                      Stock Out: {quickStats.out}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Summary Banner - Show only when movements exist */}
      {movements.length > 0 && (
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
                <div className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {quickStats.in} Stock In
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {quickStats.out} Stock Out
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  Net: {quickStats.netMovement >= 0 ? "+" : ""}
                  {quickStats.netMovement} units
                </span>
              </div>
            </div>

            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Total: {pagination.count} movements • Ready for export
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-4">
        <div
          className="compact-stats rounded-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Total Movements
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {quickStats.total.toLocaleString()}
          </div>
        </div>
        <div
          className="compact-stats rounded-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Stock In
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-green)" }}
          >
            +{quickStats.totalIn.toLocaleString()}
          </div>
        </div>
        <div
          className="compact-stats rounded-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Stock Out
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-red)" }}
          >
            -{quickStats.totalOut.toLocaleString()}
          </div>
        </div>
        <div
          className="compact-stats rounded-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Net Movement
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{
              color:
                quickStats.netMovement >= 0
                  ? "var(--accent-green)"
                  : "var(--accent-red)",
            }}
          >
            {quickStats.netMovement >= 0 ? "+" : ""}
            {quickStats.netMovement.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-sm mb-4 p-4 rounded-md"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
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
              placeholder="Search products, variants, references..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="compact-input w-full rounded-md"
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
              Movement Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Reason
            </label>
            <select
              value={filters.reason}
              onChange={(e) => handleFilterChange("reason", e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Reasons</option>
              {commonReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
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
              className="compact-input w-full rounded-md"
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
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div className="flex items-end gap-sm md:col-span-2 lg:col-span-5">
            <button
              onClick={resetFilters}
              className="compact-button flex-1 transition-colors"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "white",
              }}
            >
              Reset Filters
            </button>
            <button
              onClick={() => fetchMovements(1)}
              className="compact-button flex-1 text-[var(--sidebar-text)] transition-colors"
              style={{ backgroundColor: "var(--accent-blue)" }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedMovements.length > 0 && (
        <div
          className="mb-4 p-3 rounded-md flex items-center justify-between"
          style={{
            backgroundColor: "var(--accent-blue-light)",
            borderColor: "var(--accent-blue)",
            borderWidth: "1px",
          }}
        >
          <span
            className="font-medium text-sm"
            style={{ color: "var(--accent-blue)" }}
          >
            {selectedMovements.length} movement(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button text-[var(--sidebar-text)] transition-colors"
              style={{ backgroundColor: "var(--accent-blue)" }}
              onClick={handleExport}
            >
              <Download className="icon-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Page size selector and refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-4">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs">
            <label className="text-xs" style={{ color: "var(--sidebar-text)" }}>
              Show:
            </label>
            <select
              value={pagination.page_size}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="compact-input rounded text-sm"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              entries
            </span>
          </div>
          <button
            onClick={() => fetchMovements(pagination.current_page)}
            className="p-1 transition-colors"
            style={{ color: "var(--text-secondary)" }}
            title="Refresh data"
          >
            <svg
              className="icon-sm"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Showing {(pagination.current_page - 1) * pagination.page_size + 1} to{" "}
          {Math.min(
            pagination.current_page * pagination.page_size,
            pagination.count,
          )}{" "}
          of {pagination.count} entries
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
        </div>
      )}

      {/* Movements Table */}
      {!loading && (
        <>
          <div
            className="overflow-x-auto rounded-md"
            style={{ borderColor: "var(--border-color)", borderWidth: "1px" }}
          >
            <table className="min-w-full compact-table">
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr>
                  <th
                    scope="col"
                    className="w-12 px-4 py-2 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedMovements.length === movements.length &&
                        movements.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>ID</span>
                      {getSortIcon("id")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("product_name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Product</span>
                      {getSortIcon("product_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("variant_name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Variant</span>
                      {getSortIcon("variant_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("warehouse_name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Warehouse</span>
                      {getSortIcon("warehouse_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("movement_type")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Type</span>
                      {getSortIcon("movement_type")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("change")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Quantity</span>
                      {getSortIcon("change")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Date</span>
                      {getSortIcon("created_at")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-bg)" }}>
                {sortedMovements.map((movement) => {
                  const TypeIcon = getTypeIcon(movement.movement_type);
                  const displayQuantity = stockMovementAPI.getChangeDisplay(
                    movement.change,
                  );

                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-[var(--card-secondary-bg)] transition-colors"
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedMovements.includes(movement.id)}
                          onChange={() => toggleMovementSelection(movement.id)}
                          className="h-3 w-3 rounded"
                          style={{ color: "var(--accent-blue)" }}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div
                          className="text-sm font-medium"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          #{movement.id}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {movement.reference_code
                            ? movement.reference_code.length > 30
                              ? movement.reference_code.slice(0, 30) + "..."
                              : movement.reference_code
                            : "No reference"}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div
                          className="text-sm font-medium"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {movement.stock_item_data?.product_data?.name ||
                            "N/A"}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          SKU:{" "}
                          {movement.stock_item_data?.product_data?.sku || "N/A"}
                        </div>
                        <div
                          className="text-xs mt-1"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {movement.reason}
                        </div>
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {movement.stock_item_data?.variant_data?.name || "N/A"}
                        {movement.stock_item_data?.variant_data?.attributes && (
                          <div
                            className="text-xs mt-1"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {Object.entries(
                              movement.stock_item_data?.variant_data.attributes,
                            )
                              .filter(([_, value]) => value)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(", ")}
                          </div>
                        )}
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {movement.stock_item_data?.warehouse_data?.name ||
                          "N/A"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(movement.movement_type)}`}
                        >
                          <TypeIcon className="icon-xs mr-xs" />
                          {stockMovementAPI.getMovementTypeLabel(
                            movement.movement_type,
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div
                          className="text-sm font-medium"
                          style={{
                            color:
                              movement.movement_type === "incoming"
                                ? "var(--accent-green)"
                                : "var(--accent-red)",
                          }}
                        >
                          {displayQuantity}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Current: {movement.current_quantity}
                        </div>
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDate(movement.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {sortedMovements.length === 0 && (
            <div
              className="text-center py-12 rounded-md"
              style={{ borderColor: "var(--border-color)", borderWidth: "1px" }}
            >
              <div
                className="text-5xl mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                📊
              </div>
              <h3
                className="text-base font-medium mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                No stock movements found
              </h3>
              <p
                className="mb-4 max-w-md mx-auto text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {Object.values(filters).some((value) => value)
                  ? "Try adjusting your filters to see more results."
                  : "There are no stock movements recorded yet."}
              </p>
              {Object.values(filters).some((value) => value) && (
                <button
                  className="compact-button text-[var(--sidebar-text)] transition-colors"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Table Footer with Pagination */}
          {sortedMovements.length > 0 && (
            <div className="mt-4">
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StockMovementsPage;
