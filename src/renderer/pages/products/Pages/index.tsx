// components/ProductsPage.tsx
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
} from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { CategoryData, ProductData } from "../../../api/core/product";
import productAPI from "../../../api/core/product";
import {
  showApiError,
  showError,
  showInfo,
  showSuccess,
} from "../../../utils/notification";
import { dialogs } from "../../../utils/dialogs";
import {
  productExportAPI,
  type ProductExportParams,
} from "../../../api/exports/product";
import Button from "../../../components/UI/Button";
import { formatCurrency } from "../../../utils/formatters";
import Pagination from "../../../components/UI/Pagination";

// Updated interface to match ProductData
interface ProductWithDetails extends ProductData {
  status: "in-stock" | "low-stock" | "out-of-stock";
  category_name?: string;
}

interface Filters {
  search: string;
  category_id: string;
  is_published: string;
  has_discount: string;
  low_stock: string;
  is_deleted: string; // Add this line
  time_range: string;
  status: string;
}

interface SortConfig {
  key: keyof ProductWithDetails | "variants_count" | "stock_status";
  direction: "asc" | "desc";
}

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
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
    category_id: "",
    is_published: "",
    has_discount: "",
    low_stock: "",
    is_deleted: "false",
    time_range: "",
    status: "",
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
    loadProducts(1);
  }, [
    debouncedSearch,
    filters.category_id,
    filters.is_published,
    filters.has_discount,
    filters.low_stock,
    filters.is_deleted,
    pageSize,
  ]);

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await categoryAPI.findAll();
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadProducts = async (page: number = 1) => {
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

      // Add category filter
      if (filters.category_id) {
        searchParams.category_id = parseInt(filters.category_id);
      }

      // Add published status filter
      if (filters.is_published) {
        searchParams.is_published = filters.is_published === "true";
      }

      // Add discount filter
      if (filters.has_discount) {
        searchParams.has_discount = filters.has_discount === "true";
      }

      // Add low stock filter
      if (filters.low_stock) {
        searchParams.low_stock = filters.low_stock === "true";
      }

      // Add deleted status filter - NEW
      if (filters.is_deleted) {
        searchParams.is_deleted = filters.is_deleted === "true";
      }

      // Load products from the API with pagination and filters
      const response = await productAPI.findPage(pageSize, page, searchParams);

      // Transform ProductData to ProductWithDetails
      const productsWithDetails: ProductWithDetails[] = response.data.map(
        (product) => ({
          ...product,
          status: determineProductStatus(product),
          category_name: product.category_display || undefined,
        }),
      );

      setProducts(productsWithDetails);
      setPagination(response.pagination);
      setSelectedProducts([]); // Reset selection when data changes
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
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

  // Helper function to determine product status
  const determineProductStatus = (
    product: ProductData,
  ): "in-stock" | "low-stock" | "out-of-stock" => {
    if (product.quantity === 0) return "out-of-stock";
    if (product.quantity <= 10) return "low-stock";
    return "in-stock";
  };

  const getArchiveBadge = (isDeleted: boolean) => {
    return isDeleted
      ? "bg-[var(--accent-red-light)] text-[var(--accent-red)]"
      : "bg-[var(--accent-green-light)] text-[var(--accent-green)]";
  };

  const getArchiveText = (isDeleted: boolean) => {
    return isDeleted ? "Archived" : "Active";
  };

  // Helper function to generate product image URL
  const generateProductImage = useCallback(
    (productName: string, primaryImageUrl?: string | null): string => {
      if (primaryImageUrl) return primaryImageUrl;
      return "https://tse3.mm.bing.net/th/id/OIP.NiCYJo8ykhvqYVYz-x-FZwAAAA?w=300&h=300&rs=1&pid=ImgDetMain&o=7&rm=3";
    },
    [],
  );

  // Helper function to get variant count
  const getVariantCount = useCallback((product: ProductWithDetails) => {
    return product.variants_data ? product.variants_data.length : 0;
  }, []);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category_id: "",
      is_published: "",
      has_discount: "",
      low_stock: "",
      time_range: "",
      is_deleted: "false",
      status: "",
    });
  };

  const handlePageChange = (page: number) => {
    loadProducts(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    // Reset to first page when changing page size
    loadProducts(1);
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sort products
  const sortedProducts = React.useMemo(() => {
    const sortableItems = [...products];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case "variants_count":
            aValue = getVariantCount(a);
            bValue = getVariantCount(b);
            break;
          case "stock_status":
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = a[sortConfig.key as keyof ProductWithDetails];
            bValue = b[sortConfig.key as keyof ProductWithDetails];
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
  }, [products, sortConfig, getVariantCount]);

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((product) => product.id));
    }
  };

  const getStatusBadge = (status: ProductWithDetails["status"]) => {
    switch (status) {
      case "in-stock":
        return "bg-[var(--accent-green-dark)] text-[var(--accent-green)]";
      case "low-stock":
        return "bg-[var(--accent-orange-dark)] text-[var(--accent-orange)]";
      case "out-of-stock":
        return "bg-[var(--accent-red-dark)] text-[var(--accent-red)]";
      default:
        return "bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]";
    }
  };

  const getStatusText = (status: ProductWithDetails["status"]) => {
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

  const handleDeleteProduct = async (productId: number) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Product",
      message: `Are you sure you want to delete this product? This action cannot be undone.`,
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      await productAPI.delete(productId);
      showInfo("Product deleted successfully.");
      await loadProducts(pagination.current_page);
    } catch (error) {
      console.error("Failed to delete product:", error);
      dialogs.alert({ message: "Failed to delete product. Please try again." });
    }
  };

  // New function to handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      await dialogs.warning("Please select products to delete.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Delete Selected Products",
      message: `Are you sure you want to delete ${selectedProducts.length} selected product(s)? This action cannot be undone.`,
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      // Delete selected products
      const deletePromises = selectedProducts.map((productId) =>
        productAPI.delete(productId),
      );
      await Promise.all(deletePromises);

      showSuccess(
        `${selectedProducts.length} product(s) deleted successfully.`,
      );
      setSelectedProducts([]);
      await loadProducts(pagination.current_page);
    } catch (error) {
      console.error("Failed to delete selected products:", error);
      dialogs.alert({
        message: "Failed to delete selected products. Please try again.",
      });
    }
  };

  const handleRefresh = () => {
    loadProducts(pagination.current_page);
  };

  const handleExport = async () => {
    if (products.length === 0) {
      await dialogs.warning("No products available to export.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Products",
      message: `Are you sure you want to export ${pagination.count} product(s) in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      setExportLoading(true);

      const exportParams: ProductExportParams = {
        format: exportFormat,
        category: filters.category_id
          ? categories.find((c) => c.id.toString() === filters.category_id)
              ?.name
          : undefined,
        status: filters.status as "published" | "unpublished" | undefined,
        low_stock: filters.low_stock as "true" | "false" | undefined,
        search: filters.search || undefined,
        time_range: filters.time_range as "24h" | "7d" | "30d" | undefined,
      };

      await productExportAPI.exportProducts(exportParams);
      showSuccess("Products exported successfully");
    } catch (error: any) {
      console.error("Export failed:", error);
      showApiError(error.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const handleSoftDeleteSelected = async () => {
    if (selectedProducts.length === 0) return;

    const variantCount = selectedProducts.length;
    const confirm = await dialogs.confirm({
      title: "Archeive?",
      message: `Are you sure you want to archive ${variantCount} product(s)? You can restore them later.`,
      icon: "info",
    });
    if (!confirm) return;

    try {
      // Soft delete variants one by one
      for (const productId of selectedProducts) {
        await productAPI.softDelete(productId);
      }

      showSuccess(`Successfully archived ${variantCount} product(s)`);
      await loadProducts(pagination.current_page);
    } catch (error) {
      console.error("Failed to archive variants:", error);
      showError(
        `Failed to archive ${variantCount} product(s). Please try again.`,
      );
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedProducts.length === 0) return;

    const variantCount = selectedProducts.length;
    const confirm = await dialogs.confirm({
      title: "Restore?",
      message: `Are you sure you want to restore ${variantCount} product(s) ?`,
      icon: "info",
    });
    if (!confirm) return;
    try {
      // Restore variants one by one
      for (const productId of selectedProducts) {
        await productAPI.restore(productId);
      }

      showSuccess(`Successfully restored ${variantCount} product(s)`);
      await loadProducts(pagination.current_page);
    } catch (error) {
      console.error("Failed to restore variants:", error);
      showError(
        `Failed to restore ${variantCount} product(s). Please try again.`,
      );
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

  return (
    <div
      className="compact-card rounded-md shadow-md border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-4">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Products
          </h2>
          <p
            className="mt-xs text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage your product inventory and details
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
          <button
            onClick={handleRefresh}
            className="compact-button rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            title="Refresh products"
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
              disabled={exportLoading || products.length === 0}
              className="compact-button rounded-md flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 text-xs"
              title={
                products.length === 0
                  ? "No products to export"
                  : `Export ${pagination.count} products`
              }
            >
              <Download className="icon-xs" />
              {exportLoading ? "..." : "Export"}
            </Button>
          </div>

          {/* Quick Export Options - Show on hover/dropdown if needed */}
          <div className="flex items-center gap-1">
            <select
              value={filters.time_range || ""}
              onChange={(e) => handleFilterChange("time_range", e.target.value)}
              className="compact-input border rounded text-xs px-2 py-1"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              title="Time range for export"
            >
              <option value="">All Time</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
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
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>

          <Button
            onClick={() => {
              navigate(`/products/form`);
            }}
            variant="success"
            size="sm"
            icon={Plus}
            iconPosition="left"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Export Summary Banner - Show only when products exist */}
      {products.length > 0 && (
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
                  {products.filter((p) => p.is_published).length} Published
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {products.filter((p) => !p.is_published).length} Unpublished
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {products.filter((p) => p.quantity === 0).length} Out of Stock
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {
                    products.filter((p) => p.quantity > 0 && p.quantity <= 5)
                      .length
                  }{" "}
                  Low Stock
                </span>
              </div>
            </div>

            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Total: {pagination.count} products • Ready for export
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm mb-4 compact-card rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="compact-input w-full border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Category
            </label>
            <select
              value={filters.category_id}
              onChange={(e) =>
                handleFilterChange("category_id", e.target.value)
              }
              className="compact-input w-full border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Published Status
            </label>
            <select
              value={filters.is_published}
              onChange={(e) =>
                handleFilterChange("is_published", e.target.value)
              }
              className="compact-input w-full border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Stock Level
            </label>
            <select
              value={filters.low_stock}
              onChange={(e) => handleFilterChange("low_stock", e.target.value)}
              className="compact-input w-full border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All</option>
              <option value="true">Low Stock (≤5)</option>
              <option value="false">Adequate Stock</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Archive Status
            </label>
            <select
              value={filters.is_deleted}
              onChange={(e) => handleFilterChange("is_deleted", e.target.value)}
              className="compact-input w-full border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="false">Active</option>
              <option value="true">Archived</option>
              <option value="">All</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-4">
            <button
              onClick={resetFilters}
              className="compact-button w-full rounded-md transition-colors"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "var(--sidebar-text)",
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedProducts.length > 0 && (
        <div
          className="mb-2 compact-card rounded-md border flex items-center justify-between"
          style={{
            backgroundColor: "var(--accent-blue-dark)",
            borderColor: "var(--accent-blue)",
          }}
        >
          <span
            className="font-medium text-sm"
            style={{ color: "var(--accent-green)" }}
          >
            {selectedProducts.length} product(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button rounded-md transition-colors"
              style={{
                backgroundColor: "var(--accent-blue)",
                color: "var(--sidebar-text)",
              }}
              onClick={handleExport}
              title="Export selected"
            >
              <Download className="icon-sm" />
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
              className="compact-button rounded-md transition-colors"
              style={{
                backgroundColor: "var(--accent-red)",
                color: "var(--sidebar-text)",
              }}
              onClick={handleBulkDelete}
              title="Delete selected"
            >
              <Trash2 className="icon-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Page size selector and refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-2">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs">
            <label className="text-sm" style={{ color: "var(--sidebar-text)" }}>
              Show:
            </label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="compact-input border rounded text-sm"
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
        </div>
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
        </div>
      )}

      {/* Products Table */}
      {!loading && (
        <>
          <div
            className="overflow-x-auto rounded-md border compact-table"
            style={{ borderColor: "var(--border-color)" }}
          >
            <table
              className="min-w-full"
              style={{ borderColor: "var(--border-color)" }}
            >
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr>
                  <th
                    scope="col"
                    className="w-10 px-2 py-2 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        products.length > 0 &&
                        selectedProducts.length === products.length
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded border-gray-300"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Product</span>
                      {getSortIcon("name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("sku")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>SKU</span>
                      {getSortIcon("sku")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("category_display")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Category</span>
                      {getSortIcon("category_display")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("quantity")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Quantity</span>
                      {getSortIcon("quantity")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("variants_count")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Variants</span>
                      {getSortIcon("variants_count")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Price</span>
                      {getSortIcon("price")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("stock_status")}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Status</span>
                      {getSortIcon("stock_status")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-bg)" }}>
                {sortedProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${selectedProducts.includes(product.id) ? "bg-[var(--accent-blue-dark)]" : ""}`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-2 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="h-3 w-3 rounded border-gray-300"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <img
                            className="h-8 w-8 rounded-md object-cover border"
                            src={generateProductImage(
                              product.name,
                              product.primary_image_url,
                            )}
                            alt={product.name}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop";
                            }}
                          />
                        </div>
                        <div className="ml-2">
                          <div
                            className="text-sm font-medium line-clamp-1"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {product.name}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--primary-color)" }}
                          >
                            ID: {product.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 py-2 whitespace-nowrap text-sm font-mono"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {product.sku}
                    </td>
                    <td
                      className="px-4 py-2 whitespace-nowrap text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {product.category_display || "-"}
                    </td>
                    <td
                      className="px-4 py-2 whitespace-nowrap text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{product.quantity}</span>
                        {product.variants_data &&
                          product.variants_data.length > 0 && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              across {product.variants_data.length} variants
                            </span>
                          )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-2 whitespace-nowrap text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {getVariantCount(product) > 0 ? (
                        <span
                          className="inline-flex items-center px-xs py-xs rounded-full text-xs"
                          style={{
                            backgroundColor: "var(--accent-green-dark)",
                            color: "var(--accent-green)",
                          }}
                        >
                          {getVariantCount(product)} variants
                        </span>
                      ) : (
                        <span style={{ color: "var(--primary-color)" }}>
                          Base Product
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-2 whitespace-nowrap text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getStatusBadge(product.status)}`}
                      >
                        {getStatusText(product.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() =>
                            navigate(`/products/view/${product.id}`)
                          }
                          className="transition-colors p-1 rounded"
                          style={{ color: "var(--accent-blue)" }}
                          title="View"
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/products/form/${product.id}`)
                          }
                          className="transition-colors p-1 rounded"
                          style={{ color: "var(--accent-blue)" }}
                          title="Edit"
                        >
                          <Edit className="icon-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="transition-colors p-1 rounded"
                          style={{ color: "var(--accent-red)" }}
                          title="Delete"
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {sortedProducts.length === 0 && (
            <div
              className="text-center py-8 border rounded-md"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div
                className="text-4xl mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                <Package className="icon-xl mx-auto" />
              </div>
              <p className="text-base" style={{ color: "var(--sidebar-text)" }}>
                No products found.
              </p>
              <p
                className="mt-xs text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                {Object.values(filters).some((value) => value)
                  ? "Try adjusting your search or filters"
                  : "Start by creating your first product"}
              </p>
              <div className="mt-2 gap-xs flex justify-center">
                {Object.values(filters).some((value) => value) && (
                  <button
                    className="compact-button rounded-md transition-colors"
                    style={{
                      backgroundColor: "var(--accent-blue)",
                      color: "var(--sidebar-text)",
                    }}
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/products/form"
                  className="compact-button rounded-md inline-block transition-colors"
                  style={{
                    backgroundColor: "var(--accent-green)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Add First Product
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {sortedProducts.length > 0 && pagination.total_pages > 1 && (
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

export default ProductsPage;
