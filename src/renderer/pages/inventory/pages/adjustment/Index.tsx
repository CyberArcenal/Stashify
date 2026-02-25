// components/StockAdjustmentPage.tsx
import React, { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Download,
  Filter,
  Search,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  X,
  Calendar,
  User,
} from "lucide-react";
import productAPI, { ProductData } from "@/renderer/api/product";
import {
  inventoryLogAPI,
  InventoryTransactionLogData,
  InventoryLogSearchParams,
} from "@/renderer/api/inventoryLog";
import {
  stockAdjustmentAPI,
  StockAdjustmentData,
  StockAdjustmentForm,
} from "@/renderer/api/stockAdjustment";
import { warehouseAPI, WarehouseData } from "@/renderer/api/warehouse";
import ProductSelect from "@/renderer/components/Selects/product";
import Pagination from "@/renderer/components/UI/Pagination";
import { PaginationType } from "@/renderer/api/category";
import {
  logExportAPI,
  LogExportParams,
} from "@/renderer/api/exports/inventoryLog";
import { dialogs } from "@/renderer/utils/dialogs";
import {
  showSuccess,
  showError,
  showLoading,
  hideLoading,
  showToast,
} from "@/renderer/utils/notification";
import { stockItemAPI } from "@/renderer/api/stockItem";

const StockAdjustmentPage: React.FC = () => {
  const [logs, setLogs] = useState<InventoryTransactionLogData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [currentStockQuantity, setCurrentStockQuantity] = useState<number>(0);

  // Enhanced states
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [quickActions, setQuickActions] = useState([
    { label: "Quick +10", value: 10 },
    { label: "Quick +50", value: 50 },
    { label: "Quick -5", value: -5 },
    { label: "Quick -10", value: -10 },
  ]);

  // Export states
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Get action types for dropdown
  const actionTypes = stockAdjustmentAPI.getActionTypes();
  const allActions = actionTypes.map((a) => a.value);

  const [form, setForm] = useState<StockAdjustmentForm>({
    product_id: undefined,
    variant_id: undefined,
    warehouse_id: 0,
    quantity: 0,
    action: "manual_adjustment",
    notes: "",
  });

  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
    loadProductsAndWarehouses();
  }, [currentPage, searchTerm, typeFilter, locationFilter]);

  const loadProductsAndWarehouses = async () => {
    try {
      const [productsData, warehousesData] = await Promise.all([
        productAPI.findAll(),
        warehouseAPI.findAll(),
      ]);
      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error("Failed to load products and warehouses:", error);
      showError("Failed to load products and warehouses");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Build search parameters
      const searchParams: InventoryLogSearchParams = {
        actions: allActions,
      };

      // Add type filter
      if (typeFilter === "increase") {
        searchParams.change_min = 1;
      } else if (typeFilter === "decrease") {
        searchParams.change_max = -1;
      }

      // Add location filter
      if (locationFilter !== "all") {
        searchParams.warehouse = parseInt(locationFilter);
      }

      // Add date range filter
      if (dateRange.from) {
        searchParams.date_from = dateRange.from;
      }
      if (dateRange.to) {
        searchParams.date_to = dateRange.to;
      }

      // Load logs with pagination
      const response = await inventoryLogAPI.findPage(
        itemsPerPage,
        currentPage,
        searchParams,
      );

      setLogs(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to load data:", error);
      showError("Failed to load adjustment history");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get product name by ID
  const getProductName = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.name : "Unknown Product";
  };

  // Helper function to get variant name by ID
  const getVariantName = (productId: number, variantId?: number) => {
    if (!variantId) return "Default";

    const product = products.find((p) => p.id === productId);
    if (!product || !product.variants_data) return "Default";

    const variant = product.variants_data.find((v) => v.id === variantId);
    return variant ? variant.name : "Default";
  };

  // Helper function to get category by product ID
  const getCategory = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    return product?.category_display || "Uncategorized";
  };

  // Helper function to get warehouse name by ID
  const getWarehouseName = (warehouseId: number) => {
    const warehouse = warehouses.find((w) => w.id === warehouseId);
    return warehouse ? warehouse.name : "Unknown Warehouse";
  };

  // Get selected product details
  const selectedProduct = products.find((p) => p.id === form.product_id);

  // Get available variants for selected product
  const availableVariants = selectedProduct?.variants_data || [];

  // Get stock quantity for selected product/variant in selected warehouse
  // const getCurrentStock = () => {
  //   if (!selectedProduct || !form.warehouse_id) return 0;

  //   // If variant is selected, find variant stock
  //   if (form.variant_id) {
  //     const variant = availableVariants.find(v => v.id === form.variant_id);
  //     return variant ? variant.quantity : 0;
  //   }

  //   // Otherwise, use main product quantity
  //   return selectedProduct.quantity;
  // };

  // Get stock quantity for selected product/variant in selected warehouse
  const _getCurrentStock = async () => {
    if (!selectedProduct || !form.warehouse_id) {
      setCurrentStockQuantity(0);
    }

    // If variant is selected, find variant stock
    const stockItem = await stockItemAPI.getUniqueStock(
      form.product_id,
      form.variant_id,
      form.warehouse_id,
    );
    setCurrentStockQuantity(stockItem.quantity);
  };

  useEffect(() => {
    _getCurrentStock();
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

    if (!form.warehouse_id) {
      errors.push("• Please select a warehouse");
    }

    if (form.quantity === 0) {
      errors.push("• Quantity cannot be zero");
    }

    if (!form.notes?.trim()) {
      errors.push("• Please provide a reason for the adjustment");
    }

    if (form.quantity < 0 && Math.abs(form.quantity) > currentStockQuantity) {
      errors.push(
        `• Cannot decrease more than current stock (${currentStockQuantity} units)`,
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
      message: `Are you sure do you want to adjust this stocks?`,
      confirmText: "Continue",
      cancelText: "Cancel",
      icon: "info",
    });
    if (!proceed) return;

    try {
      setSubmitting(true);

      // Validate the adjustment data first
      const validation = stockAdjustmentAPI.validateAdjustmentData(form);
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
          title: "Adjustment Warnings",
          message: `The following warnings were detected:\n\n${validation.warnings.join("\n")}\n\nDo you want to continue?`,
          confirmText: "Continue",
          cancelText: "Cancel",
          icon: "warning",
        });
        if (!proceed) return;
      }

      // Submit the adjustment

      const result: StockAdjustmentData =
        await stockAdjustmentAPI.adjustStock(form);

      // Show success message with details
      showSuccess(
        `Stock adjustment successful! ${form.quantity > 0 ? "Added" : "Removed"} ${Math.abs(form.quantity)} units. New stock: ${result.quantity_after}`,
      );

      // Reset form
      setForm({
        product_id: undefined,
        variant_id: undefined,
        warehouse_id: 0,
        quantity: 0,
        action: "manual_adjustment",
        notes: "",
      });

      // Reload logs to show the new adjustment
      await loadData();
      setCurrentPage(1); // Reset to first page after new adjustment
    } catch (error: any) {
      console.error("Failed to adjust stock:", error);
      await dialogs.error(
        "Adjustment Failed",
        error.message ||
          "Failed to process stock adjustment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Quick action handlers
  const handleQuickAction = (value: number) => {
    setForm((prev) => ({
      ...prev,
      quantity: prev.quantity + value,
    }));
    showToast(`Quick adjustment: ${value > 0 ? "+" : ""}${value}`, "info", {
      duration: 2000,
    });
  };

  const handleProductChange = (productId: string) => {
    const productIdNum = productId ? parseInt(productId) : undefined;
    setForm({
      product_id: productIdNum,
      variant_id: undefined,
      warehouse_id: form.warehouse_id || 0,
      quantity: 0,
      action: form.action,
      notes: form.notes,
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

  const handleWarehouseChange = (warehouseId: string) => {
    const warehouseIdNum = parseInt(warehouseId);
    setForm({
      ...form,
      warehouse_id: warehouseIdNum,
      quantity: 0,
    });
  };

  const handleActionChange = (action: string) => {
    const actionObj = actionTypes.find((a) => a.value === action);

    setForm({
      ...form,
      action,
      notes: actionObj ? actionObj.label : "Manual adjustment",
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    loadData();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setLocationFilter("all");
    setDateRange({ from: "", to: "" });
    setCurrentPage(1);
  };

  // Enhanced Export Functionality for Stock Adjustments
  const handleExport = async () => {
    if (logs.length === 0) {
      await dialogs.info("No Data", "There is no adjustment data to export.");
      return;
    }

    try {
      setExportLoading(true);

      // Prepare export parameters based on current filters
      const exportParams: LogExportParams = {
        format: exportFormat,
        action:
          typeFilter !== "all"
            ? typeFilter === "increase"
              ? "manual_adjustment"
              : "correction"
            : undefined,
        warehouse: locationFilter !== "all" ? locationFilter : undefined,
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
        search: searchTerm || undefined,
        change_type:
          typeFilter !== "all"
            ? typeFilter === "increase"
              ? "increase"
              : "decrease"
            : undefined,
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
        action:
          typeFilter !== "all"
            ? typeFilter === "increase"
              ? "manual_adjustment"
              : "correction"
            : undefined,
        warehouse: locationFilter !== "all" ? locationFilter : undefined,
        date_from: dateRange.from || undefined,
        date_to: dateRange.to || undefined,
        search: searchTerm || undefined,
        change_type:
          typeFilter !== "all"
            ? typeFilter === "increase"
              ? "increase"
              : "decrease"
            : undefined,
      };

      const previewData = await logExportAPI.getExportPreview(previewParams);

      // Show preview summary in dialog
      const increases = previewData.analytics.action_breakdown.find(
        (a) => a.total_change > 0,
      );
      const decreases = previewData.analytics.action_breakdown.find(
        (a) => a.total_change < 0,
      );

      await dialogs.info(
        "Export Preview",
        `Total Adjustments: ${previewData.metadata.total_records}\nTotal Quantity Changed: ${previewData.analytics.total_quantity_changed}\nIncreases: ${increases?.total_change || 0} units\nDecreases: ${Math.abs(decreases?.total_change || 0)} units\nDate Range: ${previewData.metadata.date_range}`,
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
      "Product",
      "Variant",
      "Category",
      "Warehouse",
      "Previous Stock",
      "New Stock",
      "Change Amount",
      "Adjustment Type",
      "Reason",
      "Performed By",
    ];

    const rows = logs.map((log) => [
      formatDate(log.created_at),
      log.product_data?.name || "N/A",
      log.variant_data?.name || "Default",
      log.product_data?.category || "Uncategorized",
      log.warehouse_data?.name || "N/A",
      log.quantity_before.toString(),
      log.quantity_after.toString(),
      log.change_amount.toString(),
      log.change_amount > 0 ? "Increase" : "Decrease",
      log.notes || "No reason provided",
      log.performed_by_data?.full_name || "Unknown User",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-adjustments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showSuccess("CSV export completed!");
  };

  // Calculate summary from current page logs
  const totalAdjustments = pagination.count;
  const increaseCount = logs.filter((log) => log.change_amount > 0).length;
  const decreaseCount = logs.filter((log) => log.change_amount < 0).length;
  const netChange = logs.reduce((sum, log) => sum + log.change_amount, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Stock level indicators
  const getStockLevelColor = (current: number, previous: number) => {
    if (current > previous) return "var(--accent-green)";
    if (current < previous) return "var(--accent-red)";
    return "var(--text-secondary)";
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
            Stock Adjustment
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage inventory stock levels and track adjustments
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
              className="compact-input border-0 bg-transparent text-sm font-medium focus:ring-0 cursor-pointer px-1 py-1"
              style={{ color: "var(--sidebar-text)" }}
              disabled={exportLoading}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading || logs.length === 0}
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs"
              style={{
                backgroundColor:
                  exportLoading || logs.length === 0
                    ? "var(--secondary-color)"
                    : "var(--success-color)",
                opacity: exportLoading || logs.length === 0 ? 0.6 : 1,
              }}
              title="Export all adjustments with current filters"
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
                    disabled={exportLoading || logs.length === 0}
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
                    disabled={exportLoading || logs.length === 0}
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
                      <span>Increases:</span>
                      <span>{increaseCount}</span>
                    </div>
                    <div
                      className="px-3 py-1 text-xs flex justify-between"
                      style={{ color: "var(--accent-red)" }}
                    >
                      <span>Decreases:</span>
                      <span>{decreaseCount}</span>
                    </div>
                    <div
                      className="px-3 py-1 text-xs flex justify-between"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      <span>Net Change:</span>
                      <span>
                        {netChange > 0 ? "+" : ""}
                        {netChange}
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
            Total Adjustments
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {totalAdjustments}
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
            Stock Increases
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--accent-green)" }}
          >
            <Plus className="icon-sm" />
            {increaseCount}
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
            Stock Decreases
          </div>
          <div
            className="text-xl font-bold mt-1 flex items-center gap-1"
            style={{ color: "var(--accent-red)" }}
          >
            <Minus className="icon-sm" />
            {decreaseCount}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-red)", opacity: 0.1 }}
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
            Net Change
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{
              color:
                netChange >= 0 ? "var(--accent-green)" : "var(--accent-red)",
            }}
          >
            {netChange > 0 ? "+" : ""}
            {netChange}
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{
              backgroundColor:
                netChange >= 0 ? "var(--accent-green)" : "var(--accent-red)",
              opacity: 0.1,
            }}
          ></div>
        </div>
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
              onClick={clearFilters}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar className="icon-xs inline mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, from: e.target.value }))
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
                Date To
              </label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, to: e.target.value }))
                }
                className="compact-input w-full rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilterChange}
                className="compact-button w-full text-[var(--sidebar-text)] rounded-md"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Adjustment Form */}
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
            <Plus className="icon-sm" />
            Add Stock Adjustment
          </h3>
          <div className="flex gap-1">
            {quickActions.map((action, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickAction(action.value)}
                disabled={!form.product_id || !form.warehouse_id}
                className="compact-button text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                style={{
                  backgroundColor:
                    action.value > 0
                      ? "var(--accent-green)"
                      : "var(--accent-red)",
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
              value={form.product_id ? form.product_id : 0}
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
              Warehouse *
            </label>
            <select
              value={form.warehouse_id || ""}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              required
            >
              <option value="">Select Warehouse</option>
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
              Action Type
            </label>
            <select
              value={form.action}
              onChange={(e) => handleActionChange(e.target.value)}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              {actionTypes.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
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
              min={form.quantity < 0 ? -currentStockQuantity : 1}
              max={form.quantity > 0 ? undefined : -1}
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
                    : form.quantity > 0
                      ? "var(--accent-green)"
                      : "var(--accent-red)",
                color: "var(--sidebar-text)",
              }}
              placeholder="Enter quantity"
              required
            />
            {form.quantity < 0 && (
              <div
                className="text-xs mt-1 flex items-center gap-1"
                style={{ color: "var(--text-secondary)" }}
              >
                <AlertTriangle className="icon-xs" />
                Max decrease: {currentStockQuantity} units
              </div>
            )}
            {form.quantity > 0 && (
              <div
                className="text-xs mt-1 flex items-center gap-1"
                style={{ color: "var(--accent-green)" }}
              >
                <Plus className="icon-xs" />
                Adding stock
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Reason *
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="compact-input w-full rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              placeholder="Enter reason for adjustment"
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-6">
            <button
              type="submit"
              className="compact-button w-full text-[var(--sidebar-text)] rounded-md font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
              style={{
                backgroundColor:
                  form.quantity > 0
                    ? "var(--accent-green)"
                    : form.quantity < 0
                      ? "var(--accent-red)"
                      : "var(--accent-blue)",
                opacity: submitting ? 0.7 : 1,
              }}
              disabled={
                submitting ||
                !form.product_id ||
                !form.warehouse_id ||
                form.quantity === 0 ||
                !form.notes?.trim() ||
                (availableVariants.length > 0 && !form.variant_id) ||
                (form.quantity < 0 &&
                  Math.abs(form.quantity) > currentStockQuantity)
              }
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : form.quantity > 0 ? (
                <>
                  <Plus className="icon-sm mr-sm" />
                  Increase Stock ({form.quantity} units)
                </>
              ) : form.quantity < 0 ? (
                <>
                  <Minus className="icon-sm mr-sm" />
                  Decrease Stock ({Math.abs(form.quantity)} units)
                </>
              ) : (
                "Adjust Stock"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="flex flex-col md:flex-row gap-sm mb-4">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="relative">
            <Search
              className="absolute left-2 top-1/2 transform -translate-y-1/2 icon-sm"
              style={{ color: "var(--text-secondary)" }}
            />
            <input
              type="text"
              placeholder="Search adjustments by product, variant, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="compact-input w-full pl-8 rounded-md"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                style={{ color: "var(--text-secondary)" }}
              >
                <X className="icon-sm" />
              </button>
            )}
          </form>
        </div>
        <div className="flex gap-sm">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              handleFilterChange();
            }}
            className="compact-input rounded-md"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
          >
            <option value="all">All Types</option>
            <option value="increase">Increase Only</option>
            <option value="decrease">Decrease Only</option>
          </select>
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              handleFilterChange();
            }}
            className="compact-input rounded-md"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
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
            Loading adjustment history...
          </div>
        </div>
      )}

      {/* Enhanced Adjustment History Table */}
      {!loading && (
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
                  className="text-left p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Date
                </th>
                <th
                  className="text-left p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Product
                </th>
                <th
                  className="text-left p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Variant
                </th>
                <th
                  className="text-left p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Warehouse
                </th>
                <th
                  className="text-right p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Previous
                </th>
                <th
                  className="text-right p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  New
                </th>
                <th
                  className="text-center p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Change
                </th>
                <th
                  className="text-left p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Reason
                </th>
                <th
                  className="text-left p-2 text-xs font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  By
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-[var(--card-secondary-bg)] transition-colors group"
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                >
                  <td
                    className="p-2 text-xs"
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
                  <td className="p-2">
                    <div
                      className="font-medium text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.product_data?.name || "Unknown Product"}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {log.product_data?.category || "Uncategorized"}
                    </div>
                  </td>
                  <td
                    className="p-2 text-sm"
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
                    className="p-2 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {log.warehouse_data?.name || "Unknown Warehouse"}
                  </td>
                  <td
                    className="p-2 text-right font-medium text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {log.quantity_before}
                  </td>
                  <td
                    className="p-2 text-right font-medium text-sm"
                    style={{
                      color: getStockLevelColor(
                        log.quantity_after,
                        log.quantity_before,
                      ),
                    }}
                  >
                    {log.quantity_after}
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.change_amount > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.change_amount > 0 ? (
                        <Plus className="icon-xs mr-xs" />
                      ) : (
                        <Minus className="icon-xs mr-xs" />
                      )}
                      {Math.abs(log.change_amount)}
                    </span>
                  </td>
                  <td
                    className="p-2 text-sm max-w-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="truncate group-hover:whitespace-normal group-hover:overflow-visible">
                      {log.notes || "No reason provided"}
                    </div>
                  </td>
                  <td
                    className="p-2 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-1">
                      <User className="icon-xs" />
                      {log.performed_by_data?.full_name || "Unknown User"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enhanced Pagination */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, pagination.count)} of{" "}
            {pagination.count} adjustments
          </div>
          <Pagination
            pagination={pagination}
            onPageChange={handlePageChange}
            className="compact-pagination"
          />
        </div>
      )}

      {/* Enhanced Empty State */}
      {!loading && logs.length === 0 && (
        <div className="text-center py-12">
          <div
            className="mb-4 mx-auto w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
            }}
          >
            <Search className="w-8 h-8" />
          </div>
          <p
            className="text-base font-medium mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            No adjustments found
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {searchTerm ||
            typeFilter !== "all" ||
            locationFilter !== "all" ||
            dateRange.from ||
            dateRange.to
              ? "Try adjusting your search criteria or filters"
              : "Start by making your first stock adjustment above"}
          </p>
          {(searchTerm ||
            typeFilter !== "all" ||
            locationFilter !== "all" ||
            dateRange.from ||
            dateRange.to) && (
            <button
              onClick={clearFilters}
              className="compact-button text-[var(--sidebar-text)] rounded-md"
              style={{ backgroundColor: "var(--accent-blue)" }}
            >
              Clear All Filters
            </button>
          )}
        </div>
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
          Page {currentPage} of {pagination.total_pages}
        </div>
      </div>
    </div>
  );
};

export default StockAdjustmentPage;
