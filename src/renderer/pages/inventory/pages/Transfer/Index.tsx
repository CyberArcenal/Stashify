// components/StockTransferPage.tsx
import React, { useState, useEffect } from "react";
import {
  Truck,
  Download,
  Filter,
  Search,
  ArrowRight,
  Package,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Calendar,
  User,
  X,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  stockTransferAPI,
  StockTransferForm,
  StockTransferValidationResult,
} from "@/renderer/api/stockTransfer";
import {
  inventoryLogAPI,
  InventoryTransactionLogData,
} from "@/renderer/api/inventoryLog";
import {
  warehouseAPI,
  WarehouseData as APIWarehouseData,
} from "@/renderer/api/warehouse";
import productAPI, {
  ProductData as APIProductData,
} from "@/renderer/api/product";
import ProductSelect from "@/renderer/components/Selects/product";
import Pagination from "@/renderer/components/UI/Pagination";
import { Pagination as PaginationType } from "@/renderer/api/category";
import ActionBadge, {
  ActionType,
} from "@/renderer/components/Badge/ActionBadge";
import {
  logExportAPI,
  LogExportParams,
} from "@/renderer/api/exports/inventoryLog";
import {
  showApiError,
  showSuccess,
  showError,
  showLoading,
  hideLoading,
} from "@/renderer/utils/notification";
import { dialogs } from "@/renderer/utils/dialogs";
import { stockItemAPI } from "@/renderer/api/stockItem";

interface Filters {
  search: string;
  status: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface SortConfig {
  key: keyof InventoryTransactionLogData | "product_name" | "warehouse_name";
  direction: "asc" | "desc";
}

const StockTransferPage: React.FC = () => {
  const [transfers, setTransfers] = useState<InventoryTransactionLogData[]>([]);
  const [products, setProducts] = useState<APIProductData[]>([]);
  const [warehouses, setWarehouses] = useState<APIWarehouseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransfers, setSelectedTransfers] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [currentStockQuantity, setCurrentStockQuantity] = useState<number>(0);

  // Enhanced states
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [quickActions] = useState([
    { label: "Quick +5", value: 5 },
    { label: "Quick +10", value: 10 },
    { label: "Quick +25", value: 25 },
    { label: "Quick +50", value: 50 },
  ]);

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
    status: "all",
    location: "all",
    startDate: "",
    endDate: "",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "desc",
  });

  // Available page sizes
  const pageSizes = [10, 25, 50, 100];

  // Load data on component mount
  useEffect(() => {
    loadData();
    loadWarehousesAndProducts();
  }, []);

  const loadWarehousesAndProducts = async () => {
    try {
      const [productsData, warehousesData] = await Promise.all([
        productAPI.findAll(),
        warehouseAPI.findAll(),
      ]);
      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error("Failed to load products or warehouses:", error);
      showError("Failed to load products or warehouses");
    }
  };

  const loadData = async (
    page: number = 1,
    pageSize: number = pagination.page_size,
  ) => {
    try {
      setLoading(true);

      const searchParams = {
        actions: ["transfer_in", "transfer_out"],
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== "all" && { action: filters.status }),
        ...(filters.location !== "all" && {
          warehouse_id: parseInt(filters.location),
        }),
        ...(filters.startDate && { date_from: filters.startDate }),
        ...(filters.endDate && { date_to: filters.endDate }),
      };

      const response = await inventoryLogAPI.findPage(
        pageSize,
        page,
        searchParams,
      );

      if (response.status) {
        setTransfers(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      showError("Failed to load transfer data");
    } finally {
      setLoading(false);
    }
  };

  // Load data when filters change
  useEffect(() => {
    loadData(1);
  }, [filters]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      location: "all",
      startDate: "",
      endDate: "",
    });
    setDateRange({ from: "", to: "" });
  };

  const handlePageChange = (page: number) => {
    loadData(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination((prev) => ({ ...prev, page_size: newSize }));
    loadData(1, newSize);
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sort transfers
  const sortedTransfers = React.useMemo(() => {
    const sortableItems = [...transfers];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case "product_name":
            aValue = a.product_data?.name?.toLowerCase() || "";
            bValue = b.product_data?.name?.toLowerCase() || "";
            break;
          case "warehouse_name":
            aValue = a.warehouse_data?.name?.toLowerCase() || "";
            bValue = b.warehouse_data?.name?.toLowerCase() || "";
            break;
          default:
            aValue = a[sortConfig.key as keyof InventoryTransactionLogData];
            bValue = b[sortConfig.key as keyof InventoryTransactionLogData];
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
  }, [transfers, sortConfig]);

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  // Form state
  const [form, setForm] = useState<StockTransferForm>({
    from_warehouse: 0,
    to_warehouse: 0,
    product_id: undefined,
    variant_id: undefined,
    quantity: 0,
    notes: "",
  });

  // Get selected product details
  const selectedProduct = products.find((p) => p.id === form.product_id);

  // Get available variants for selected product
  const availableVariants = selectedProduct?.variants_data || [];

  // Get stock quantity for selected product/variant in selected warehouse
  const getCurrentStock = async () => {
    if (!selectedProduct || !form.from_warehouse) {
      setCurrentStockQuantity(0);
    }

    // If variant is selected, find variant stock
    const stockItem = await stockItemAPI.getUniqueStock(
      form.product_id,
      form.variant_id,
      form.from_warehouse,
    );
    setCurrentStockQuantity(stockItem.quantity);
  };

  useEffect(() => {
    getCurrentStock();
  }, [form]);

  // Enhanced validation with detailed feedback
  const validateForm = async (): Promise<boolean> => {
    const errors: string[] = [];

    if (!form.product_id) {
      errors.push("• Please select a product");
    }

    if (
      selectedProduct?.variants_data &&
      selectedProduct.variants_data.length > 0 &&
      !form.variant_id
    ) {
      errors.push("• Please select a variant for this product");
    }

    if (!form.from_warehouse) {
      errors.push("• Please select source warehouse");
    }

    if (!form.to_warehouse) {
      errors.push("• Please select destination warehouse");
    }

    if (form.from_warehouse === form.to_warehouse) {
      errors.push("• Source and destination warehouses cannot be the same");
    }

    if (form.quantity <= 0) {
      errors.push("• Quantity must be greater than 0");
    }

    if (form.quantity > currentStockQuantity) {
      errors.push(
        `• Cannot transfer more than current stock (${getCurrentStock()} units)`,
      );
    }

    if (errors.length > 0) {
      await dialogs.error(
        "Validation Error",
        `Please fix the following issues:\n\n${errors.join("\n")}`,
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Enhanced validation
    if (!(await validateForm())) {
      return;
    }

    const proceed = await dialogs.confirm({
      title: "Are you sure?",
      message: `Are you sure do you want to Transfer stocks?`,
      confirmText: "Continue",
      cancelText: "Cancel",
      icon: "info",
    });
    if (!proceed) return;

    try {
      setSubmitting(true);

      // Validate the transfer data first
      const validation: StockTransferValidationResult =
        stockTransferAPI.validateTransferData(form);
      if (!validation.isValid) {
        await dialogs.error(
          "Validation Failed",
          `Please fix the following issues:\n\n${validation.errors.join("\n")}`,
        );
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        const proceed = await dialogs.confirm({
          title: "Transfer Warnings",
          message: `The following warnings were detected:\n\n${validation.warnings.join("\n")}\n\nDo you want to continue?`,
          confirmText: "Continue",
          cancelText: "Cancel",
          icon: "warning",
        });
        if (!proceed) return;
      }

      // Submit the transfer
      showLoading("Processing stock transfer...");
      const result = await stockTransferAPI.transferStock(form);

      // Show success message with details
      showSuccess(
        `Stock transfer successful! Transferred ${form.quantity} units. Reference: ${result.reference_code}`,
      );

      // Reset form
      setForm({
        from_warehouse: 0,
        to_warehouse: 0,
        product_id: undefined,
        variant_id: undefined,
        quantity: 0,
        notes: "",
      });

      // Reload transfers to show the new transfer
      await loadData(1);
    } catch (error: any) {
      console.error("Failed to transfer stock:", error);
      showApiError(error);
    } finally {
      setSubmitting(false);
      hideLoading();
    }
  };

  // Quick action handlers
  const handleQuickAction = (value: number) => {
    setForm((prev) => ({
      ...prev,
      quantity: prev.quantity + value,
    }));
  };

  const handleProductChange = (productId: string) => {
    const productIdNum = productId ? parseInt(productId) : undefined;
    setForm({
      ...form,
      product_id: productIdNum,
      variant_id: undefined,
      quantity: 0,
    });
  };

  const handleVariantChange = (variantId: string) => {
    const variantIdNum = variantId ? parseInt(variantId) : undefined;
    setForm({
      ...form,
      variant_id: variantIdNum,
      quantity: 0,
    });
  };

  const handleFromWarehouseChange = (fromWarehouseId: string) => {
    const fromWarehouseIdNum = parseInt(fromWarehouseId);
    setForm({
      ...form,
      from_warehouse: fromWarehouseIdNum,
      to_warehouse:
        form.to_warehouse === fromWarehouseIdNum ? 0 : form.to_warehouse,
      quantity: 0,
    });
  };

  const handleToWarehouseChange = (toWarehouseId: string) => {
    const toWarehouseIdNum = parseInt(toWarehouseId);
    setForm({
      ...form,
      to_warehouse: toWarehouseIdNum,
      quantity: 0,
    });
  };

  const toggleTransferSelection = (transferId: number) => {
    setSelectedTransfers((prev) =>
      prev.includes(transferId)
        ? prev.filter((id) => id !== transferId)
        : [...prev, transferId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedTransfers.length === transfers.length) {
      setSelectedTransfers([]);
    } else {
      setSelectedTransfers(transfers.map((transfer) => transfer.id));
    }
  };

  // Calculate summary from transfers
  const totalTransfers = transfers.filter(
    (log) => log.action === "transfer_out",
  ).length;
  const completedTransfers = totalTransfers;
  const pendingTransfers = 0;
  const totalItemsTransferred = transfers
    .filter((log) => log.action === "transfer_out")
    .reduce((sum, transfer) => sum + Math.abs(transfer.change_amount), 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Enhanced Export Functionality
  const handleExport = async () => {
    if (transfers.length === 0) {
      await dialogs.info("No Data", "There is no transfer data to export.");
      return;
    }

    try {
      setExportLoading(true);

      // Prepare export parameters based on current filters
      const exportParams: LogExportParams = {
        format: exportFormat,
        action: filters.status !== "all" ? filters.status : undefined,
        warehouse: filters.location !== "all" ? filters.location : undefined,
        date_from: filters.startDate || undefined,
        date_to: filters.endDate || undefined,
        search: filters.search || undefined,
      };

      // Validate export parameters
      const validationErrors = logExportAPI.validateExportParams(exportParams);
      if (validationErrors.length > 0) {
        await dialogs.error(
          "Export Validation",
          `Please fix the following issues:\n\n${validationErrors.join("\n")}`,
        );
        return;
      }

      // Execute export
      await logExportAPI.exportLogs(exportParams);
      showSuccess(
        `Export completed successfully! Format: ${exportFormat.toUpperCase()}`,
      );
    } catch (error: any) {
      console.error("Export failed:", error);
      await dialogs.error(
        "Export Failed",
        error.message || "Failed to export data. Please try again.",
      );
    } finally {
      setExportLoading(false);
      hideLoading();
    }
  };

  // Get export preview data
  const handleExportPreview = async () => {
    try {
      setExportLoading(true);

      const previewParams: Omit<LogExportParams, "format"> = {
        action: filters.status !== "all" ? filters.status : undefined,
        warehouse: filters.location !== "all" ? filters.location : undefined,
        date_from: filters.startDate || undefined,
        date_to: filters.endDate || undefined,
        search: filters.search || undefined,
      };

      const previewData = await logExportAPI.getExportPreview(previewParams);

      // Show preview summary
      await dialogs.info(
        "Export Preview",
        `Total Records: ${previewData.metadata.total_records}\nTotal Quantity Transferred: ${previewData.analytics.total_quantity_changed}\nDate Range: ${previewData.metadata.date_range}`,
      );
    } catch (error: any) {
      console.error("Preview failed:", error);
      await dialogs.error(
        "Preview Failed",
        error.message || "Failed to generate preview.",
      );
    } finally {
      setExportLoading(false);
    }
  };

  // Simple CSV export (keep for backward compatibility)
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Action",
      "Product",
      "Variant",
      "Warehouse",
      "Change Amount",
      "Previous Quantity",
      "New Quantity",
      "Reference ID",
      "Notes",
      "Performed By",
    ];

    const rows = transfers.map((log) => [
      formatDate(log.created_at),
      getActionDisplay(log.action),
      log.product_data?.name || "N/A",
      log.variant_data?.name || "N/A",
      log.warehouse_data?.name || "N/A",
      log.change_amount.toString(),
      log.quantity_before.toString(),
      log.quantity_after.toString(),
      log.reference_id || "N/A",
      log.notes || "",
      log.performed_by_data?.full_name || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-transfers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showSuccess("CSV export completed!");
  };

  const getActionDisplay = (action: string) => {
    switch (action) {
      case "transfer_in":
        return "Transfer In";
      case "transfer_out":
        return "Transfer Out";
      default:
        return action;
    }
  };

  // Stock level indicators
  const getStockLevelColor = (current: number, previous: number) => {
    if (current > previous) return "var(--accent-green)";
    if (current < previous) return "var(--accent-red)";
    return "var(--sidebar-text)";
  };

  return (
    <div
      className="compact-card rounded-md shadow-md"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
        borderWidth: "1px",
      }}
    >
      {/* Enhanced Page Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            <div
              className="w-2 h-6 rounded-full"
              style={{ backgroundColor: "var(--accent-blue)" }}
            ></div>
            Stock Transfer
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage inventory transfers between locations
          </p>
        </div>
        <div className="flex gap-sm">
          {/* Enhanced Filter Button */}
          <button
            className="compact-button rounded-md flex items-center transition-colors hover:bg-[var(--card-hover-bg)]"
            style={{
              backgroundColor: showFilters
                ? "var(--accent-blue)"
                : "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
            {showFilters && <X className="icon-sm ml-xs" />}
          </button>

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
              disabled={exportLoading || transfers.length === 0}
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs"
              style={{
                backgroundColor:
                  exportLoading || transfers.length === 0
                    ? "var(--secondary-color)"
                    : "var(--success-color)",
                opacity: exportLoading || transfers.length === 0 ? 0.6 : 1,
              }}
              title="Export all transfers with current filters"
            >
              <Download className="icon-sm mr-xs" />
              {exportLoading ? "Exporting..." : "Export"}
            </button>
          </div>

          {/* Enhanced Export Options Dropdown */}
          <div className="relative">
            <button
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center transition-colors hover:bg-[var(--accent-blue-hover)]"
              style={{ backgroundColor: "var(--accent-blue)" }}
              onClick={() => setShowExportOptions(!showExportOptions)}
              disabled={exportLoading}
            >
              <Download className="icon-sm mr-xs" />
              Options
              <ChevronDown
                className={`icon-sm ml-xs transition-transform ${showExportOptions ? "rotate-180" : ""}`}
              />
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
                    disabled={exportLoading || transfers.length === 0}
                    className="w-full text-left px-3 py-2 text-sm rounded-md disabled:opacity-50 hover:bg-[var(--card-hover-bg)] transition-colors flex items-center gap-2"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    📊 Preview Export Data
                  </button>
                  <button
                    onClick={() => {
                      exportToCSV();
                      setShowExportOptions(false);
                    }}
                    disabled={exportLoading || transfers.length === 0}
                    className="w-full text-left px-3 py-2 text-sm rounded-md disabled:opacity-50 hover:bg-[var(--card-hover-bg)] transition-colors flex items-center gap-2"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    📄 Quick CSV Export
                  </button>
                  <div
                    className="border-t mt-2 pt-2"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <div
                      className="px-3 py-1 text-xs flex justify-between"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span>Total Records:</span>
                      <span>{pagination.count}</span>
                    </div>
                    <div
                      className="px-3 py-1 text-xs flex justify-between"
                      style={{ color: "var(--accent-green)" }}
                    >
                      <span>Transfer Out:</span>
                      <span>
                        {
                          transfers.filter((t) => t.action === "transfer_out")
                            .length
                        }
                      </span>
                    </div>
                    <div
                      className="px-3 py-1 text-xs flex justify-between"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      <span>Transfer In:</span>
                      <span>
                        {
                          transfers.filter((t) => t.action === "transfer_in")
                            .length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-4">
        <div
          className="compact-stats rounded-md relative overflow-hidden"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Total Transfers
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {totalTransfers}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-blue)", opacity: 0.1 }}
          ></div>
        </div>
        <div
          className="compact-stats rounded-md relative overflow-hidden"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Completed
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--accent-green)" }}
          >
            <CheckCircle className="icon-sm" />
            {completedTransfers}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-green)", opacity: 0.1 }}
          ></div>
        </div>
        <div
          className="compact-stats rounded-md relative overflow-hidden"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Pending
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--warning-color)" }}
          >
            <AlertTriangle className="icon-sm" />
            {pendingTransfers}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--warning-color)", opacity: 0.1 }}
          ></div>
        </div>
        <div
          className="compact-stats rounded-md relative overflow-hidden"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
            borderWidth: "1px",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Items Transferred
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-purple)" }}
          >
            {totalItemsTransferred}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-purple)", opacity: 0.1 }}
          ></div>
        </div>
      </div>

      {/* Enhanced Transfer Form */}
      <div
        className="compact-card rounded-md mb-4"
        style={{
          backgroundColor: "var(--card-secondary-bg)",
          borderColor: "var(--border-color)",
          borderWidth: "1px",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-semibold text-sm flex items-center gap-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            <Truck className="icon-sm" />
            Create New Transfer
          </h3>
          <div className="flex gap-1">
            {quickActions.map((action, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickAction(action.value)}
                disabled={!form.product_id || !form.from_warehouse}
                className="compact-button text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "var(--accent-green)",
                  color: "var(--sidebar-text)",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-sm"
        >
          <div className="lg:col-span-2">
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Product *
            </label>
            <ProductSelect
              value={form.product_id || 0}
              onChange={(productId, productName, price) =>
                handleProductChange(productId.toString())
              }
              disabled={loading}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Variant {availableVariants.length > 0 ? "*" : ""}
            </label>
            <select
              value={form.variant_id || ""}
              onChange={(e) => handleVariantChange(e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              required={availableVariants.length > 0}
              disabled={!form.product_id}
            >
              <option value="">
                {availableVariants.length > 0
                  ? "Select Variant"
                  : "No Variants"}
              </option>
              {availableVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} ({variant.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              From Warehouse *
            </label>
            <select
              value={form.from_warehouse || ""}
              onChange={(e) => handleFromWarehouseChange(e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              required
            >
              <option value="">Select From</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              To Warehouse *
            </label>
            <select
              value={form.to_warehouse || ""}
              onChange={(e) => handleToWarehouseChange(e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              required
              disabled={!form.from_warehouse}
            >
              <option value="">Select To</option>
              {warehouses
                .filter((warehouse) => warehouse.id !== form.from_warehouse)
                .map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Current Stock
            </label>
            <div className="relative">
              <input
                type="number"
                value={currentStockQuantity}
                readOnly
                className="compact-input w-full rounded-md pr-8"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                {currentStockQuantity <= 10 && (
                  <AlertTriangle
                    className="icon-xs"
                    style={{ color: "var(--accent-red)" }}
                  />
                )}
              </div>
            </div>
            {currentStockQuantity <= 10 && (
              <div
                className="text-xs mt-1 flex items-center gap-1"
                style={{ color: "var(--accent-red)" }}
              >
                <AlertTriangle className="icon-xs" />
                Low stock warning
              </div>
            )}
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              max={currentStockQuantity}
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) })
              }
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor:
                  form.quantity === 0
                    ? "var(--border-color)"
                    : "var(--accent-green)",
                color: "var(--sidebar-text)",
              }}
              placeholder="Enter quantity"
              required
              disabled={!form.from_warehouse}
            />
            {form.from_warehouse && (
              <div
                className="text-xs mt-1 flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <Package className="icon-xs" />
                Available: {currentStockQuantity} units
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Remarks / Reference
            </label>
            <input
              type="text"
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              placeholder="Enter transfer reason or reference"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="compact-button w-full text-[var(--sidebar-text)] rounded-md font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor: "var(--accent-blue)",
                opacity: submitting ? 0.7 : 1,
              }}
              disabled={
                submitting ||
                !form.product_id ||
                !form.from_warehouse ||
                !form.to_warehouse ||
                form.quantity <= 0 ||
                (availableVariants.length > 0 && !form.variant_id) ||
                form.quantity > currentStockQuantity
              }
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Truck className="icon-sm mr-sm" />
                  Create Transfer ({form.quantity} units)
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Enhanced Filters Section */}
      {showFilters && (
        <div
          className="compact-card rounded-md mb-4 p-3"
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
              className="text-xs compact-button flex items-center gap-1"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--card-bg)",
              }}
            >
              <X className="icon-xs" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-sm">
            <div>
              <label
                className="block text-xs font-medium mb-1"
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
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Action Type
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="compact-input w-full rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              >
                <option value="all">All Actions</option>
                <option value="transfer_in">Transfer In</option>
                <option value="transfer_out">Transfer Out</option>
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Warehouse
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
                className="compact-input w-full rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
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
                className="compact-input w-full rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>

            <div className="flex items-end gap-xs md:col-span-2 lg:col-span-5">
              <button
                onClick={() => loadData(1)}
                className="compact-button flex-1 text-[var(--sidebar-text)] transition-colors"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedTransfers.length > 0 && (
        <div
          className="mb-2 compact-card rounded-md flex items-center justify-between"
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
            {selectedTransfers.length} transfer(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button text-[var(--sidebar-text)] rounded-md transition-colors"
              style={{ backgroundColor: "var(--accent-blue)" }}
              onClick={exportToCSV}
            >
              <Download className="icon-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Page size selector and refresh */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs">
            <label className="text-sm" style={{ color: "var(--sidebar-text)" }}>
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
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              entries
            </span>
          </div>
          <button
            onClick={() => loadData(pagination.current_page)}
            className="p-1 transition-colors hover:bg-[var(--card-secondary-bg)] rounded-md"
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
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Showing {(pagination.current_page - 1) * pagination.page_size + 1} to{" "}
          {Math.min(
            pagination.current_page * pagination.page_size,
            pagination.count,
          )}{" "}
          of {pagination.count} entries
        </div>
      </div>

      {/* Enhanced Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
            }}
          >
            <div
              className="animate-spin rounded-full h-4 w-4 border-b-2"
              style={{ borderColor: "var(--accent-blue)" }}
            ></div>
            Loading transfer history...
          </div>
        </div>
      )}

      {/* Enhanced Transfer History Table */}
      {!loading && (
        <>
          <div
            className="overflow-x-auto rounded-md"
            style={{ border: "1px solid var(--border-color)" }}
          >
            <table className="w-full border-collapse compact-table">
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <th
                    scope="col"
                    className="w-10 px-2 py-2 text-left text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedTransfers.length === transfers.length &&
                        transfers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--card-hover-bg)]"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-xs">
                      <Calendar className="icon-xs" />
                      <span>Date</span>
                      {getSortIcon("created_at")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--card-hover-bg)]"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("action")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Action</span>
                      {getSortIcon("action")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--card-hover-bg)]"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("product_name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Product</span>
                      {getSortIcon("product_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Variant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--card-hover-bg)]"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("warehouse_name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Warehouse</span>
                      {getSortIcon("warehouse_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-semibold cursor-pointer transition-colors hover:bg-[var(--card-hover-bg)]"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("change_amount")}
                  >
                    <div className="flex items-center justify-end gap-xs">
                      <span>Change</span>
                      {getSortIcon("change_amount")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Previous
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    New
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Reference
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Remarks
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    By
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTransfers.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--card-secondary-bg)] transition-colors group"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedTransfers.includes(log.id)}
                        onChange={() => toggleTransferSelection(log.id)}
                        className="h-3 w-3 rounded"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </td>
                    <td
                      className="px-4 py-2 text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      <div className="font-medium">
                        {formatDate(log.created_at).split(",")[0]}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDate(log.created_at).split(",")[1]}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <ActionBadge
                        action={log.action as ActionType}
                        size="sm"
                        showIcon={false}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div
                        className="font-medium text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {log.product_data?.name || "N/A"}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        SKU: {log.product_data?.sku || "N/A"}
                      </div>
                    </td>
                    <td
                      className="px-4 py-2 text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.variant_data ? (
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: "var(--card-bg)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {log.variant_data.name}
                        </span>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          -
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2 text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.warehouse_data?.name || "N/A"}
                    </td>
                    <td
                      className="px-4 py-2 text-right font-medium text-sm"
                      style={{
                        color:
                          log.change_amount > 0
                            ? "var(--accent-green)"
                            : "var(--accent-red)",
                      }}
                    >
                      <div className="flex items-center justify-end">
                        <Package
                          className="icon-sm mr-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                        {log.change_amount > 0 ? "+" : ""}
                        {log.change_amount}
                      </div>
                    </td>
                    <td
                      className="px-4 py-2 text-right text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.quantity_before}
                    </td>
                    <td
                      className="px-4 py-2 text-right font-medium text-sm"
                      style={{
                        color: getStockLevelColor(
                          log.quantity_after,
                          log.quantity_before,
                        ),
                      }}
                    >
                      {log.quantity_after}
                    </td>
                    <td
                      className="px-4 py-2 font-mono text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.reference_id || "N/A"}
                    </td>
                    <td
                      className="px-4 py-2 text-sm max-w-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <div className="truncate group-hover:whitespace-normal group-hover:overflow-visible">
                        {log.notes || "No remarks"}
                      </div>
                    </td>
                    <td
                      className="px-4 py-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <div className="flex items-center gap-1">
                        <User className="icon-xs" />
                        {log.performed_by_data?.full_name || "N/A"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Empty State */}
          {sortedTransfers.length === 0 && (
            <div className="text-center py-12">
              <div
                className="mb-4 mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  color: "var(--text-secondary)",
                }}
              >
                <Truck className="w-8 h-8" />
              </div>
              <p
                className="text-base font-medium mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                No transfers found
              </p>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                {filters.search ||
                filters.status !== "all" ||
                filters.location !== "all" ||
                filters.startDate ||
                filters.endDate
                  ? "Try adjusting your search criteria or filters"
                  : "Start by creating your first stock transfer above"}
              </p>
              {Object.values(filters).some(
                (value) => value && value !== "all",
              ) && (
                <button
                  className="compact-button text-[var(--sidebar-text)] rounded-md transition-colors"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                  onClick={resetFilters}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Enhanced Pagination */}
          {sortedTransfers.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
              <div
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Showing{" "}
                {(pagination.current_page - 1) * pagination.page_size + 1} to{" "}
                {Math.min(
                  pagination.current_page * pagination.page_size,
                  pagination.count,
                )}{" "}
                of {pagination.count} transfers
              </div>
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                className="compact-pagination"
              />
            </div>
          )}
        </>
      )}

      {/* Enhanced Table Footer */}
      <div
        className="flex justify-between items-center mt-4 pt-3"
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

export default StockTransferPage;
