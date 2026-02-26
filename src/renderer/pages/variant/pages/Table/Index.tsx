// components/ProductVariantsPage.tsx
import {
  Download,
  Edit,
  Eye,
  Filter,
  Package,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Box,
} from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  productVariantAPI,
  ProductVariantData,
} from "@/renderer/api/productVariant";
import productAPI, { ProductData } from "@/renderer/api/product";
import Pagination from "@/renderer/components/UI/Pagination";
import { Pagination as PaginationType } from "@/renderer/api/category";
import { dialogs, showConfirm } from "@/renderer/utils/dialogs";
import {
  showApiError,
  showError,
  showSuccess,
} from "@/renderer/utils/notification";
import {
  variantExportAPI,
  VariantExportParams,
} from "@/renderer/api/exports/variant";
import { formatCurrency } from "@/renderer/utils/formatters";

interface ProductVariantWithDetails extends ProductVariantData {
  status: "in-stock" | "low-stock" | "out-of-stock";
  product_name?: string;
}

interface Filters {
  search: string;
  productId: string;
  low_stock: string;
  is_deleted: string;
  // Export-specific filters
  category?: string;
  status?: string;
}

interface SortConfig {
  key:
    | keyof ProductVariantWithDetails
    | "product_name"
    | "total_stock"
    | "profit_margin";
  direction: "asc" | "desc";
}

const ProductVariantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [exportLoading, setExportLoading] = useState(false);
  const [variants, setVariants] = useState<ProductVariantWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [pageSize, setPageSize] = useState<number>(10);

  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );

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
    productId: "",
    low_stock: "",
    is_deleted: "false",
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "desc",
  });

  // Available page sizes
  const pageSizes = [10, 25, 50, 100];

  // Debounce function for search
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearch = useDebounce(filters.search, 500);

  // Load data from API
  useEffect(() => {
    loadVariants(1);
  }, [
    debouncedSearch,
    filters.productId,
    filters.low_stock,
    filters.is_deleted,
    pageSize,
  ]);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await productAPI.findAll();
      setProducts(productsData);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const loadVariants = async (page: number = 1) => {
    try {
      setLoading(true);

      // Build search parameters for API
      const searchParams: any = {
        page_size: pageSize,
        page: page,
      };

      // Add search filter
      if (filters.search) {
        searchParams.search = filters.search;
      }

      // Add product filter
      if (filters.productId) {
        searchParams.product = parseInt(filters.productId);
      }

      // Add low stock filter
      if (filters.low_stock) {
        searchParams.low_stock = filters.low_stock === "true";
      }

      // Add deleted status filter
      if (filters.is_deleted) {
        searchParams.is_deleted = filters.is_deleted === "true";
      }

      // Load variants from the API with pagination and filters
      const response = await productVariantAPI.findPage(
        pageSize,
        page,
        searchParams,
      );
      //

      // Transform ProductVariantData to ProductVariantWithDetails
      const variantsWithDetails: ProductVariantWithDetails[] =
        response.data.map((variant) => ({
          ...variant,
          status: determineVariantStatus(variant),
          product_name: variant.product_display || undefined,
        }));

      setVariants(variantsWithDetails);
      setPagination(response.pagination);
      setSelectedVariants([]); // Reset selection when data changes
    } catch (error) {
      console.error("Failed to load variants:", error);
      setVariants([]);
      setPagination({
        current_page: 1,
        total_pages: 1,
        count: 0,
        page_size: pageSize,
        next: null,
        previous: null,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine variant status
  const determineVariantStatus = (
    variant: ProductVariantData,
  ): "in-stock" | "low-stock" | "out-of-stock" => {
    const totalStock =
      variant.stock_locations?.reduce((sum, loc) => sum + loc.quantity, 0) ||
      variant.quantity ||
      0;

    if (totalStock === 0) return "out-of-stock";
    // console.log('Total Stock:', totalStock, 'Low Stock Threshold:', variant.low_stock_threshold);
    if (totalStock <= variant.low_stock_threshold) return "low-stock";
    return "in-stock";
  };

  // Helper function to get total stock across all locations
  const getTotalStock = useCallback((variant: ProductVariantWithDetails) => {
    return (
      variant.stock_locations?.reduce((sum, loc) => sum + loc.quantity, 0) ||
      variant.quantity ||
      0
    );
  }, []);

  // Helper function to calculate profit margin
  const calculateProfitMargin = useCallback(
    (variant: ProductVariantWithDetails) => {
      const price = parseFloat(variant.net_price) || 0;
      const cost = parseFloat(variant.cost_per_item) || 0;
      if (price === 0) return 0;
      return ((price - cost) / price) * 100;
    },
    [],
  );

  // Helper function to calculate profit
  const calculateProfit = useCallback((variant: ProductVariantWithDetails) => {
    const price = parseFloat(variant.net_price) || 0;
    const cost = parseFloat(variant.cost_per_item) || 0;
    return price - cost;
  }, []);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      productId: "",
      low_stock: "",
      is_deleted: "false",
    });
  };

  const handlePageChange = (page: number) => {
    loadVariants(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    // Reset to first page when changing page size
    loadVariants(1);
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sort variants
  const sortedVariants = React.useMemo(() => {
    const sortableItems = [...variants];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case "product_name":
            aValue = a.product_display;
            bValue = b.product_display;
            break;
          case "total_stock":
            aValue = getTotalStock(a);
            bValue = getTotalStock(b);
            break;
          case "profit_margin":
            aValue = calculateProfitMargin(a);
            bValue = calculateProfitMargin(b);
            break;
          default:
            aValue = a[sortConfig.key as keyof ProductVariantWithDetails];
        }

        // Handle null/undefined values
        if (aValue == null) aValue = "";
        if (bValue == null) bValue = "";

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
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
  }, [variants, sortConfig, getTotalStock, calculateProfitMargin]);

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  const toggleVariantSelection = (variantId: number) => {
    setSelectedVariants((prev) =>
      prev.includes(variantId)
        ? prev.filter((id) => id !== variantId)
        : [...prev, variantId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map((variant) => variant.id));
    }
  };

  const getStatusBadge = (status: ProductVariantWithDetails["status"]) => {
    switch (status) {
      case "in-stock":
        return "bg-[var(--accent-green-light)] text-[var(--accent-green)]";
      case "low-stock":
        return "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]";
      case "out-of-stock":
        return "bg-[var(--accent-red-light)] text-[var(--accent-red)]";
      default:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
    }
  };

  const getStatusText = (status: ProductVariantWithDetails["status"]) => {
    switch (status) {
      case "in-stock":
        return "In Stock";
      case "low-stock":
        return "Low Stock";
      case "out-of-stock":
        return "Out of Stock";
      default:
        return status;
    }
  };

  const getDeletedBadge = (isDeleted: boolean) => {
    return isDeleted
      ? "bg-[var(--accent-red-light)] text-[var(--accent-red)]"
      : "bg-[var(--accent-green-light)] text-[var(--accent-green)]";
  };

  const handleDeleteVariant = async (variantId: number) => {
    const confirmed = await showConfirm({
      title: "Delete Variant",
      message:
        "Are you sure you want to delete this variant? This action cannot be undone.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await productVariantAPI.delete(variantId);
      await loadVariants(pagination.current_page);
    } catch (error) {
      console.error("Failed to delete variant:", error);
      alert("Failed to delete variant. Please try again.");
    }
  };

  const handleSoftDeleteVariant = async (variantId: number) => {
    const confirmed = await showConfirm({
      title: "Archive Variant",
      message:
        "Are you sure you want to archive this variant? You can restore it later.",
      icon: "warning",
      confirmText: "Archive",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await productVariantAPI.softDelete(variantId);
      await loadVariants(pagination.current_page);
    } catch (error) {
      console.error("Failed to archive variant:", error);
      alert("Failed to archive variant. Please try again.");
    }
  };

  const handleRestoreVariant = async (variantId: number) => {
    try {
      await productVariantAPI.restore(variantId);
      await loadVariants(pagination.current_page);
    } catch (error) {
      console.error("Failed to restore variant:", error);
      alert("Failed to restore variant. Please try again.");
    }
  };

  const handleRefresh = () => {
    loadVariants(pagination.current_page);
  };

  const exportToCSV = () => {
    const variantsToExport =
      selectedVariants.length > 0
        ? variants.filter((variant) => selectedVariants.includes(variant.id))
        : variants;

    const headers = [
      "ID",
      "Variant Name",
      "Product",
      "SKU",
      "Barcode",
      "Stock",
      "Price",
      "Cost",
      "Profit",
      "Margin",
      "Status",
      "Archived",
    ];

    const rows = variantsToExport.map((variant) => [
      variant.id.toString(),
      `"${variant.name.replace(/"/g, '""')}"`,
      `"${(variant.product_display || "").replace(/"/g, '""')}"`,
      variant.sku,
      variant.barcode,
      getTotalStock(variant).toString(),
      `₱${formatCurrency(variant.net_price)}`,
      variant.cost_per_item
        ? `₱${formatCurrency(variant.cost_per_item)}`
        : "₱0.00",
      `₱${formatCurrency(calculateProfit(variant))}`,
      `${calculateProfitMargin(variant).toFixed(1)}%`,
      getStatusText(variant.status),
      variant.is_deleted ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `product-variants-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (variants.length === 0) {
      await dialogs.warning("No variants available to export.");
      return;
    }

    // Build export description
    let exportDescription = `${pagination.count} variant(s) in ${exportFormat.toUpperCase()} format`;

    const activeFilters = [];
    if (filters.productId) {
      const productName = products.find(
        (p) => p.id.toString() === filters.productId,
      )?.name;
      if (productName) activeFilters.push(productName);
    }
    if (filters.low_stock)
      activeFilters.push(
        filters.low_stock === "true" ? "Low Stock" : "Adequate Stock",
      );
    if (filters.is_deleted)
      activeFilters.push(filters.is_deleted === "true" ? "Archived" : "Active");
    if (filters.search) activeFilters.push(`Search: "${filters.search}"`);

    if (activeFilters.length > 0) {
      exportDescription += ` with filters: ${activeFilters.join(", ")}`;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Variants",
      message: `Are you sure you want to export ${exportDescription}?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      setExportLoading(true);

      const exportParams: VariantExportParams = {
        format: exportFormat,
        product: filters.productId
          ? products.find((p) => p.id.toString() === filters.productId)?.name
          : undefined,
        low_stock: filters.low_stock as "true" | "false" | undefined,
        search: filters.search || undefined,
      };

      await variantExportAPI.exportVariants(exportParams);
      showSuccess("Variants exported successfully");
    } catch (error: any) {
      console.error("Export failed:", error);
      showApiError(error.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  // Fix for pagination display
  const getDisplayRange = () => {
    const start = (pagination.current_page - 1) * pagination.page_size + 1;
    const end = Math.min(
      pagination.current_page * pagination.page_size,
      pagination.count,
    );
    return { start, end };
  };

  const { start, end } = getDisplayRange();

  // Add this function after the existing handler functions
  const handleDeleteSelected = async () => {
    if (selectedVariants.length === 0) return;

    const variantCount = selectedVariants.length;
    const confirmed = await showConfirm({
      title: "Delete Variants",
      message: `Are you sure you want to delete ${variantCount} variant(s)? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      // Delete variants one by one
      for (const variantId of selectedVariants) {
        await productVariantAPI.delete(variantId);
      }

      showSuccess(`Successfully deleted ${variantCount} variant(s)`);
      await loadVariants(pagination.current_page);
    } catch (error) {
      console.error("Failed to delete variants:", error);
      showError(
        `Failed to delete ${variantCount} variant(s). Please try again.`,
      );
    }
  };

  const handleSoftDeleteSelected = async () => {
    if (selectedVariants.length === 0) return;

    const variantCount = selectedVariants.length;
    const confirmed = await showConfirm({
      title: "Archive Variants",
      message: `Are you sure you want to archive ${variantCount} variant(s)? You can restore them later.`,
      icon: "warning",
      confirmText: "Archive",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      // Soft delete variants one by one
      for (const variantId of selectedVariants) {
        await productVariantAPI.softDelete(variantId);
      }

      showSuccess(`Successfully archived ${variantCount} variant(s)`);
      await loadVariants(pagination.current_page);
    } catch (error) {
      console.error("Failed to archive variants:", error);
      showError(
        `Failed to archive ${variantCount} variant(s). Please try again.`,
      );
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedVariants.length === 0) return;

    const variantCount = selectedVariants.length;
    const confirmed = await showConfirm({
      title: "Restore Variants",
      message: `Are you sure you want to restore ${variantCount} variant(s)?`,
      icon: "info",
      confirmText: "Restore",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      // Restore variants one by one
      for (const variantId of selectedVariants) {
        await productVariantAPI.restore(variantId);
      }

      showSuccess(`Successfully restored ${variantCount} variant(s)`);
      await loadVariants(pagination.current_page);
    } catch (error) {
      console.error("Failed to restore variants:", error);
      showError(
        `Failed to restore ${variantCount} variant(s). Please try again.`,
      );
    }
  };

  return (
    <div
      className="compact-card rounded-md shadow-md border border-[var(--border-color)]"
      style={{ backgroundColor: "var(--card-bg)" }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--sidebar-text)]">
            Product Variants
          </h2>
          <p className="text-[var(--text-secondary)] mt-xs text-sm">
            Manage your product variants, inventory, and pricing
          </p>
        </div>
        <div className="flex flex-wrap gap-xs w-full sm:w-auto">
          <button
            className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md flex items-center hover:bg-[var(--border-color)] transition-colors"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-xs" />
            Filters {showFilters ? "↑" : "↓"}
          </button>
          <button
            onClick={handleRefresh}
            className="compact-button bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md flex items-center hover:bg-[var(--border-color)] transition-colors"
          >
            <Download className="icon-sm mr-xs" />
            Refresh
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
                className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
                style={{
                  color: "var(--sidebar-text)",
                  backgroundColor: "var(--card-secondary-bg)",
                }}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exportLoading || variants.length === 0}
              className="compact-button rounded-md flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-xs"
              style={{
                backgroundColor:
                  exportLoading || variants.length === 0
                    ? "var(--text-tertiary)"
                    : "var(--accent-green)",
                color: "var(--sidebar-text)",
              }}
              title={
                variants.length === 0
                  ? "No variants to export"
                  : `Export ${pagination.count} variants`
              }
            >
              <Download className="icon-xs" />
              {exportLoading ? "..." : "Export"}
            </button>
          </div>

          <Link
            to="/products"
            className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md flex items-center transition-colors"
          >
            <Package className="icon-sm mr-xs" />
            View Products
          </Link>
        </div>
      </div>

      {/* Export Summary Banner - Show only when variants exist */}
      {variants.length > 0 && (
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
                  {variants.filter((v) => !v.is_deleted).length} Active
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {variants.filter((v) => v.is_deleted).length} Archived
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {
                    variants.filter(
                      (v) => determineVariantStatus(v) === "out-of-stock",
                    ).length
                  }{" "}
                  Out of Stock
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {
                    variants.filter(
                      (v) => determineVariantStatus(v) === "low-stock",
                    ).length
                  }{" "}
                  Low Stock
                </span>
              </div>
            </div>

            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Total: {pagination.count} variants • Ready for export
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm mb-4 compact-card bg-[var(--card-secondary-bg)] rounded-md border border-[var(--border-color)]">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-xs">
              Search
            </label>
            <input
              type="text"
              placeholder="Search variants by name, SKU, or barcode..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-xs">
              Product
            </label>
            <select
              value={filters.productId}
              onChange={(e) => handleFilterChange("productId", e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)]"
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id.toString()}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-xs">
              Stock Level
            </label>
            <select
              value={filters.low_stock}
              onChange={(e) => handleFilterChange("low_stock", e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)]"
            >
              <option value="">All Stock Levels</option>
              <option value="true">Low Stock (≤10)</option>
              <option value="false">Adequate Stock</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-xs">
              Status
            </label>
            <select
              value={filters.is_deleted}
              onChange={(e) => handleFilterChange("is_deleted", e.target.value)}
              className="compact-input w-full border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)]"
            >
              <option value="false">Active</option>
              <option value="true">Archived</option>
              <option value="">All</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-4">
            <button
              onClick={resetFilters}
              className="compact-button w-full bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--border-color)] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedVariants.length > 0 && (
        <div className="mb-2 compact-card bg-[var(--accent-blue-dark)] rounded-md border border-[var(--accent-blue)] flex items-center justify-between p-2">
          <span className="text-[var(--sidebar-text)] font-medium text-sm">
            {selectedVariants.length} variant(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={exportToCSV}
              title="Export selected"
            >
              <Download className="icon-sm" />
              Export
            </button>
            <button
              className="compact-button bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={handleSoftDeleteSelected}
              title="Archive selected"
            >
              <Trash2 className="icon-sm" />
              Archive
            </button>
            <button
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={handleRestoreSelected}
              title="Restore selected"
            >
              <Plus className="icon-sm" />
              Restore
            </button>
            <button
              className="compact-button bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={handleDeleteSelected}
              title="Permanently delete selected"
            >
              <Trash2 className="icon-sm" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Page size selector and refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-2">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs">
            <label className="text-sm text-[var(--sidebar-text)]">Show:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="compact-input border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--input-text)] text-sm focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)]"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-sm text-[var(--text-secondary)]">
              entries
            </span>
          </div>
        </div>
        <div className="text-sm text-[var(--text-secondary)]">
          {pagination.count > 0 ? (
            <>
              Showing {start} to {end} of {pagination.count} entries
            </>
          ) : (
            "No entries found"
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)]"></div>
        </div>
      )}

      {/* Variants Table */}
      {!loading && (
        <>
          <div className="overflow-x-auto rounded-md border border-[var(--border-color)] compact-table">
            <table className="min-w-full divide-y divide-[var(--border-color)]">
              <thead className="bg-[var(--card-secondary-bg)]">
                <tr>
                  <th
                    scope="col"
                    className="w-10 px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    <input
                      type="checkbox"
                      checked={
                        variants.length > 0 &&
                        selectedVariants.length === variants.length
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 text-[var(--accent-blue)] rounded focus:ring-[var(--accent-blue)] border-[var(--border-color)]"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Variant</span>
                      {getSortIcon("name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("product_name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Product</span>
                      {getSortIcon("product_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("sku")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>SKU</span>
                      {getSortIcon("sku")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("total_stock")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Stock</span>
                      {getSortIcon("total_stock")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("net_price")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Price</span>
                      {getSortIcon("net_price")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("cost_per_item")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Cost</span>
                      {getSortIcon("cost_per_item")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("profit_margin")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Margin</span>
                      {getSortIcon("profit_margin")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--border-color)] transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Status</span>
                      {getSortIcon("status")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                {sortedVariants.map((variant) => (
                  <tr
                    key={variant.id}
                    className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${
                      selectedVariants.includes(variant.id)
                        ? "bg-[var(--accent-blue-dark)]"
                        : ""
                    } ${variant.is_deleted ? "opacity-60" : ""}`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedVariants.includes(variant.id)}
                        onChange={() => toggleVariantSelection(variant.id)}
                        className="h-3 w-3 text-[var(--accent-blue)] rounded focus:ring-[var(--accent-blue)] border-[var(--border-color)]"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          {variant.primary_image_url ? (
                            <img
                              className="h-8 w-8 rounded-md object-cover border border-[var(--border-color)]"
                              src={variant.primary_image_url}
                              alt={variant.name}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-md bg-[var(--card-secondary-bg)] flex items-center justify-center border border-[var(--border-color)]">
                              <Box className="h-4 w-4 text-[var(--text-secondary)]" />
                            </div>
                          )}
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-[var(--sidebar-text)] line-clamp-1">
                            {variant.name}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            ID: {variant.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--sidebar-text)]">
                      <div className="font-medium">
                        {variant.product_display}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Product ID: {variant.product}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)] font-mono">
                      {variant.sku || "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--sidebar-text)]">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {getTotalStock(variant)}
                        </span>
                        {variant.stock_locations &&
                          variant.stock_locations.length > 0 && (
                            <span className="text-xs text-[var(--text-secondary)]">
                              across {variant.stock_locations.length} locations
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-[var(--sidebar-text)]">
                      {formatCurrency(parseFloat(variant.price))}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                      {variant.cost_per_item
                        ? `${formatCurrency(parseFloat(variant.cost_per_item))}`
                        : "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <div
                        className={`font-medium ${
                          calculateProfitMargin(variant) >= 0
                            ? "text-[var(--accent-green)]"
                            : "text-[var(--accent-red)]"
                        }`}
                      >
                        {calculateProfitMargin(variant).toFixed(1)}%
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {formatCurrency(calculateProfit(variant))}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getStatusBadge(variant.status)}`}
                        >
                          {getStatusText(variant.status)}
                        </span>
                        <span
                          className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getDeletedBadge(variant.is_deleted)}`}
                        >
                          {variant.is_deleted ? "Archived" : "Active"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() =>
                            navigate(`/products/variants/view/${variant.id}`)
                          }
                          className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors p-1 rounded hover:bg-[var(--accent-blue-light)]"
                          title="View Details"
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(
                              `/products/${variant.product_data.id}/variants/form/${variant.id}`,
                            )
                          }
                          className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] transition-colors p-1 rounded hover:bg-[var(--accent-blue-light)]"
                          title="Edit Variant"
                          disabled={variant.is_deleted}
                        >
                          <Edit className="icon-sm" />
                        </button>
                        {!variant.is_deleted ? (
                          <button
                            onClick={() => handleSoftDeleteVariant(variant.id)}
                            className="text-[var(--accent-orange)] hover:text-[var(--accent-orange-hover)] transition-colors p-1 rounded hover:bg-[var(--accent-orange-light)]"
                            title="Archive Variant"
                          >
                            <Trash2 className="icon-sm" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreVariant(variant.id)}
                            className="text-[var(--accent-green)] hover:text-[var(--accent-green-hover)] transition-colors p-1 rounded hover:bg-[var(--accent-green-light)]"
                            title="Restore Variant"
                          >
                            <Plus className="icon-sm" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {sortedVariants.length === 0 && (
            <div className="text-center py-8 border border-[var(--border-color)] rounded-md">
              <div className="text-[var(--text-secondary)] text-4xl mb-2">
                <Box className="icon-xl mx-auto" />
              </div>
              <p className="text-base text-[var(--text-secondary)]">
                No variants found.
              </p>
              <p className="text-[var(--text-secondary)] mt-xs text-sm">
                {Object.values(filters).some((value) => value)
                  ? "Try adjusting your search or filters"
                  : "Variants will appear when you add them to products"}
              </p>
              <div className="mt-2 gap-xs flex justify-center">
                {Object.values(filters).some((value) => value) && (
                  <button
                    className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/products"
                  className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md inline-block transition-colors"
                >
                  View Products
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {sortedVariants.length > 0 && pagination.total_pages > 1 && (
            <div className="mt-2">
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                className="mt-2"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductVariantsPage;
