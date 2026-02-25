// components/StockItemsTablePage.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Edit,
  Package,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { stockItemAPI, StockItemData } from "@/renderer/api/stockItem";
import { warehouseAPI } from "@/renderer/api/warehouse";
import { showSuccess, showError } from "@/renderer/utils/notification";
import productAPI from "@/renderer/api/product";
import Pagination from "@/renderer/components/UI/Pagination";
import { Pagination as PaginationType } from "@/renderer/api/category";
import ProductSelect from "@/renderer/components/Selects/product";

interface StockItemWithDetails extends StockItemData {
  status?: "in_stock" | "low_stock" | "out_of_stock";
  product_name?: string;
  warehouse_name?: string;
  variant_sku?: string | null;
}

interface Filters {
  search?: string;
  product?: number;
  warehouse?: number;
  low_stock_only?: boolean;
  time_range?: "24h" | "7d" | "30d";
  is_active?: boolean;
}

interface SortConfig {
  key: keyof StockItemWithDetails | "available_quantity" | "stock_status";
  direction: "asc" | "desc";
}

const StockItemsTablePage: React.FC = () => {
  // Data states
  const [stockItems, setStockItems] = useState<StockItemWithDetails[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // UI states
  const [loading, setLoading] = useState<boolean>(false);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Filters state
  const [filters, setFilters] = useState<Filters>({});

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    reorder_level: number;
    low_stock_threshold: number;
  }>({ reorder_level: 0, low_stock_threshold: 0 });

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  // Sort
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "desc",
  });

  // Available page sizes
  const pageSizes = [10, 25, 50, 100];

  // Track if we should use client-side sorting
  const [useClientSort, setUseClientSort] = useState<boolean>(false);

  // Load products and warehouses once on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [productsData, warehousesData] = await Promise.all([
          productAPI.findAll(),
          warehouseAPI.findAll(),
        ]);
        setProducts(productsData);
        setWarehouses(warehousesData);
      } catch (error) {
        console.error("Failed to load initial data:", error);
        showError("Failed to load initial data");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load stock items based on filters, pagination
  const loadStockItems = useCallback(
    async (page: number = 1, customPageSize?: number) => {
      try {
        setTableLoading(true);

        const currentPageSize = customPageSize || pageSize;

        const searchParams: any = {
          page_size: currentPageSize,
          page: page,
          ...filters,
        };

        // Remove empty filters
        Object.keys(searchParams).forEach((key) => {
          if (
            searchParams[key] === undefined ||
            searchParams[key] === "" ||
            searchParams[key] === false
          ) {
            delete searchParams[key];
          }
        });

        // console.log('Loading stock items with params:', searchParams);

        const response = await stockItemAPI.findPage(
          currentPageSize,
          page,
          searchParams,
        );

        if (!response.status) {
          throw new Error(response.message || "Failed to fetch stock items");
        }

        // console.log('Stock items response:', response);

        // Process items: create unique IDs for items with id: 0
        const processedItems: StockItemWithDetails[] = response.data.map(
          (item, index) => {
            // Create a unique ID for items with id: 0
            const uniqueId =
              item.id === 0
                ? `temp-${item.product || "no-product"}-${item.variant || "no-variant"}-${item.warehouse}-${index}`
                : item.id;

            const enhancedItem: StockItemWithDetails = {
              ...item,
              // Use the unique ID for items with id: 0
              id:
                typeof uniqueId === "string"
                  ? parseInt(uniqueId.replace(/[^0-9]/g, "").slice(0, 8) || "0")
                  : uniqueId,
              product_name:
                item.product_name ||
                item.product_data?.name ||
                `Product ${item.product}`,
              warehouse_name:
                item.warehouse_name ||
                item.warehouse_data?.name ||
                `Warehouse ${item.warehouse}`,
              variant_sku: item.variant_sku || null,
              available_quantity: item.available_quantity || 0,
              reserved_quantity: item.reserved_quantity || 0,
              low_stock_threshold: item.low_stock_threshold || 0,
              reorder_level: item.reorder_level || 0,
              is_active: item.is_active !== false,
              status: stockItemAPI.getStockStatus(item),
            };
            return enhancedItem;
          },
        );

        setStockItems(processedItems);
        setPagination(response.pagination);
        setSelectedItems([]);

        // Determine if we should use client-side sorting
        const hasFilters = Object.keys(filters).length > 0;
        setUseClientSort(!hasFilters);
      } catch (error: any) {
        console.error("Failed to load stock items:", error);
        showError(
          "Failed to load stock items: " + (error.message || "Unknown error"),
        );
        setStockItems([]);
        setPagination({
          current_page: 1,
          total_pages: 1,
          count: 0,
          page_size: customPageSize || pageSize,
          next: null,
          previous: null,
        });
      } finally {
        setTableLoading(false);
      }
    },
    [filters, pageSize],
  );

  // Initial load of stock items
  useEffect(() => {
    loadStockItems(1);
  }, [loadStockItems]);

  // Handle page size change - reload data with new page size
  const handlePageSizeChange = (newSize: number) => {
    // console.log('Changing page size to:', newSize);
    setPageSize(newSize);
    // Reset to first page when changing page size
    setPagination((prev) => ({
      ...prev,
      current_page: 1,
      page_size: newSize,
    }));
    // Load with new page size
    loadStockItems(1, newSize);
  };

  // Handle page change
  const handlePageChange = async (page: number) => {
    // console.log('Changing to page:', page);
    setPagination((prev) => ({ ...prev, current_page: page }));
    await loadStockItems(page);
  };

  // Handle edit click
  const handleEditClick = (item: StockItemWithDetails) => {
    // Skip items with temporary IDs (id: 0)
    if (item.id < 1) {
      showError("Cannot edit temporary stock items. Please contact support.");
      return;
    }

    setEditingId(item.id);
    setEditValues({
      reorder_level: item.reorder_level,
      low_stock_threshold: item.low_stock_threshold,
    });
  };

  // Handle save click
  const handleSaveClick = async (id: number) => {
    try {
      // Skip items with temporary IDs
      if (id < 1) {
        showError("Cannot update temporary stock items.");
        return;
      }

      const updatedItem = await stockItemAPI.updateStockThresholds(
        id,
        editValues.low_stock_threshold,
        editValues.reorder_level,
      );

      // Update only the specific item in the state
      setStockItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                low_stock_threshold: updatedItem.low_stock_threshold,
                reorder_level: updatedItem.reorder_level,
                status: stockItemAPI.getStockStatus(updatedItem),
              }
            : item,
        ),
      );

      showSuccess("Stock thresholds updated successfully");
      setEditingId(null);
    } catch (error: any) {
      console.error("Failed to update stock thresholds:", error);
      showError(
        "Failed to update stock thresholds: " +
          (error.message || "Unknown error"),
      );
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    // console.log('Filter changed:', key, value);
    setFilters((prev) => ({ ...prev, [key]: value }));
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handleProductSelect = (
    productId: number,
    productName: string,
    price: number,
    sale_price: number,
    cost_per_item: number,
  ) => {
    // console.log('Product selected:', productId);
    setFilters((prev) => ({ ...prev, product: productId }));
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const resetFilters = () => {
    // console.log('Resetting filters');
    setFilters({});
    setShowFilters(false);
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  };

  const handleRefresh = async () => {
    // console.log('Refreshing data...');
    await loadStockItems(pagination.current_page);
  };

  const handleSort = (key: SortConfig["key"]) => {
    // console.log('Sorting by:', key);
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getSortIcon = (key: SortConfig["key"]) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="icon-sm" />
    ) : (
      <ChevronDown className="icon-sm" />
    );
  };

  const toggleItemSelection = (itemId: number) => {
    // Don't select items with temporary IDs
    if (itemId < 1) return;

    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const toggleSelectAll = () => {
    // Only select items with valid IDs
    const validItems = stockItems.filter((item) => item.id > 0);

    if (selectedItems.length === validItems.length && validItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(validItems.map((item) => item.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return "bg-[var(--accent-green-dark)] text-[var(--accent-green)]";
      case "low_stock":
        return "bg-[var(--accent-orange-dark)] text-[var(--accent-orange)]";
      case "out_of_stock":
        return "bg-[var(--accent-red-dark)] text-[var(--accent-red)]";
      default:
        return "bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "low_stock":
        return "Low Stock";
      case "out_of_stock":
        return "Out of Stock";
      default:
        return status;
    }
  };

  // Sort stock items - client side sorting (only when no filters or explicitly enabled)
  const sortedStockItems = React.useMemo(() => {
    if (!useClientSort) {
      return stockItems;
    }

    const sortableItems = [...stockItems];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortConfig.key) {
          case "available_quantity":
            aValue = a.available_quantity;
            bValue = b.available_quantity;
            break;
          case "stock_status":
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            aValue = a[sortConfig.key as keyof StockItemWithDetails];
            bValue = b[sortConfig.key as keyof StockItemWithDetails];
        }

        // Handle null/undefined values
        if (aValue == null) aValue = "";
        if (bValue == null) bValue = "";

        // Handle string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        // Handle number comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          if (sortConfig.direction === "asc") {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        }

        // String comparison
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
  }, [stockItems, sortConfig, useClientSort]);

  // Filter out invalid items (with null product names)
  const validStockItems = React.useMemo(() => {
    return sortedStockItems.filter(
      (item) =>
        item.product_name &&
        item.product_name !== `Product ${item.product}` &&
        item.product_name !== "Product null",
    );
  }, [sortedStockItems]);

  // Calculate stock summary from current data
  const totalItems = validStockItems.length;
  const totalLowStock = validStockItems.filter(
    (item) =>
      item.available_quantity <= item.low_stock_threshold &&
      item.available_quantity > 0,
  ).length;
  const totalOutOfStock = validStockItems.filter(
    (item) => item.available_quantity <= 0,
  ).length;
  const totalActiveItems = validStockItems.filter(
    (item) => item.is_active,
  ).length;
  const totalQuantity = validStockItems.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );

  // Get display range for pagination
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
            Stock Items
          </h2>
          <p
            className="mt-xs text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage inventory stock levels and reorder points
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
            title="Refresh stock items"
            disabled={tableLoading}
          >
            {tableLoading ? (
              <>
                <div
                  className="animate-spin rounded-full h-3 w-3 border-b-2 mr-xs"
                  style={{ borderColor: "var(--accent-blue)" }}
                ></div>
                Refreshing...
              </>
            ) : (
              <>
                <RotateCcw className="icon-sm mr-xs" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-sm mb-4">
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Valid Items
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {totalItems}
          </div>
          <div
            className="text-xs mt-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            {stockItems.length - totalItems} invalid
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Low Stock
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-orange)" }}
          >
            {totalLowStock}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Out of Stock
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-red)" }}
          >
            {totalOutOfStock}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Active Items
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-green)" }}
          >
            {totalActiveItems}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Total Quantity
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-blue)" }}
          >
            {totalQuantity}
          </div>
        </div>
      </div>

      {/* Data Quality Warning */}
      {stockItems.length > 0 &&
        validStockItems.length !== stockItems.length && (
          <div
            className="mb-4 p-3 rounded-md border"
            style={{
              backgroundColor: "var(--accent-orange-dark)",
              borderColor: "var(--accent-orange)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--accent-orange)" }}
                >
                  ⚠️ Data Quality Alert
                </span>
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--accent-orange)" }}
              >
                {stockItems.length - validStockItems.length} invalid items
                hidden
              </div>
            </div>
            <div
              className="mt-1 text-xs"
              style={{ color: "var(--accent-orange)" }}
            >
              Some stock items are missing product data. These items are hidden
              from the table.
            </div>
          </div>
        )}

      {/* Stock Health Warning */}
      {(totalLowStock > 0 || totalOutOfStock > 0) && (
        <div
          className="mb-4 p-3 rounded-md border"
          style={{
            backgroundColor:
              totalOutOfStock > 0
                ? "var(--accent-red-dark)"
                : "var(--accent-orange-dark)",
            borderColor:
              totalOutOfStock > 0
                ? "var(--accent-red)"
                : "var(--accent-orange)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span
                className="text-sm font-medium"
                style={{
                  color:
                    totalOutOfStock > 0
                      ? "var(--accent-red)"
                      : "var(--accent-orange)",
                }}
              >
                {totalOutOfStock > 0 ? "⚠️ Stock Alert" : "📊 Stock Health"}
              </span>
            </div>
            <div className="flex gap-4 text-xs">
              {totalLowStock > 0 && (
                <span style={{ color: "var(--accent-orange)" }}>
                  ⚠️ {totalLowStock} low stock items
                </span>
              )}
              {totalOutOfStock > 0 && (
                <span style={{ color: "var(--accent-red)" }}>
                  ❌ {totalOutOfStock} out of stock items
                </span>
              )}
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
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 transform -translate-y-1/2 icon-sm"
                style={{ color: "var(--text-secondary)" }}
              />
              <input
                type="text"
                placeholder="Search by product or SKU..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="compact-input w-full border rounded-md pl-8"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Product
            </label>
            <ProductSelect
              value={filters.product || 0}
              onChange={handleProductSelect}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Warehouse
            </label>
            <select
              value={filters.warehouse || ""}
              onChange={(e) =>
                handleFilterChange("warehouse", e.target.value || undefined)
              }
              className="compact-input w-full border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex items-center w-full">
              <input
                type="checkbox"
                id="lowStockOnly"
                checked={filters.low_stock_only || false}
                onChange={(e) =>
                  handleFilterChange("low_stock_only", e.target.checked)
                }
                className="h-4 w-4"
                style={{ color: "var(--accent-blue)" }}
              />
              <label
                htmlFor="lowStockOnly"
                className="ml-2 text-sm"
                style={{ color: "var(--sidebar-text)" }}
              >
                Low Stock Only
              </label>
            </div>
            <button
              onClick={resetFilters}
              className="compact-button rounded-md transition-colors"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "var(--sidebar-text)",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedItems.length > 0 && (
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
            {selectedItems.length} stock item(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button rounded-md transition-colors"
              style={{
                backgroundColor: "var(--accent-green)",
                color: "var(--sidebar-text)",
              }}
              onClick={() => {
                // Handle bulk edit
                // console.log('Bulk edit selected items:', selectedItems);
              }}
              title="Edit selected"
              disabled={selectedItems.some((id) => id < 1)}
            >
              <Edit className="icon-sm" />
              Edit Selected
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
              onChange={(e) => {
                const newSize = Number(e.target.value);
                // console.log('Page size dropdown changed to:', newSize);
                handlePageSizeChange(newSize);
              }}
              className="compact-input border rounded text-sm"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
              disabled={tableLoading}
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

      {/* Table Loading Indicator */}
      {tableLoading && (
        <div className="flex justify-center items-center py-4">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <span
            className="ml-2 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading stock items...
          </span>
        </div>
      )}

      {/* Stock Items Table */}
      {!tableLoading && (
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
                        validStockItems.length > 0 &&
                        selectedItems.length ===
                          validStockItems.filter((item) => item.id > 0).length
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("product_name")}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Product</span>
                      {getSortIcon("product_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("warehouse_name")}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Warehouse</span>
                      {getSortIcon("warehouse_name")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("quantity")}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Quantity</span>
                      {getSortIcon("quantity")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("available_quantity")}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Available</span>
                      {getSortIcon("available_quantity")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("low_stock_threshold")}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Low Stock</span>
                      {getSortIcon("low_stock_threshold")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("reorder_level")}
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <div className="flex items-center gap-xs">
                      <span>Reorder Point</span>
                      {getSortIcon("reorder_level")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                    onClick={() => handleSort("stock_status")}
                    style={{ color: "var(--text-secondary)" }}
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
                {validStockItems.map((item, index) => {
                  // Create a unique key for each row to avoid duplicate key warnings
                  const rowKey = `${item.product || "p"}-${item.variant || "v"}-${item.warehouse || "w"}-${index}`;

                  return (
                    <tr
                      key={rowKey}
                      className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${selectedItems.includes(item.id) ? "bg-[var(--accent-blue-dark)]" : ""}`}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <td className="px-2 py-2 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="h-3 w-3 rounded"
                          style={{ color: "var(--accent-blue)" }}
                          disabled={item.id < 1}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div
                              className="h-8 w-8 rounded-md flex items-center justify-center"
                              style={{
                                backgroundColor: "var(--card-secondary-bg)",
                              }}
                            >
                              <Package
                                className="icon-sm"
                                style={{ color: "var(--text-secondary)" }}
                              />
                            </div>
                          </div>
                          <div className="ml-2">
                            <div
                              className="text-sm font-medium line-clamp-1"
                              style={{ color: "var(--sidebar-text)" }}
                            >
                              {item.product_name}
                            </div>
                            {item.variant_sku && (
                              <div
                                className="text-xs"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                SKU: {item.variant_sku}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-4 py-2 whitespace-nowrap text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.warehouse_name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className="text-sm font-medium"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.quantity}
                          </span>
                          {item.reserved_quantity > 0 && (
                            <span
                              className="text-xs"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Reserved: {item.reserved_quantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            item.available_quantity <= 0
                              ? "text-[var(--accent-red)]"
                              : item.available_quantity <=
                                  item.low_stock_threshold
                                ? "text-[var(--accent-orange)]"
                                : "text-[var(--accent-green)]"
                          }`}
                        >
                          {item.available_quantity}
                        </div>
                      </td>

                      {/* Low Stock Threshold - Editable */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.low_stock_threshold}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                low_stock_threshold:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="compact-input w-20 text-center"
                            style={{
                              backgroundColor: "var(--card-secondary-bg)",
                              borderColor: "var(--border-color)",
                              color: "var(--sidebar-text)",
                            }}
                          />
                        ) : (
                          <div
                            className="text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.low_stock_threshold}
                          </div>
                        )}
                      </td>

                      {/* Reorder Point - Editable */}
                      <td className="px-4 py-2 whitespace-nowrap">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.reorder_level}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                reorder_level: parseInt(e.target.value) || 0,
                              })
                            }
                            className="compact-input w-20 text-center"
                            style={{
                              backgroundColor: "var(--card-secondary-bg)",
                              borderColor: "var(--border-color)",
                              color: "var(--sidebar-text)",
                            }}
                          />
                        ) : (
                          <div
                            className="text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {item.reorder_level}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getStatusBadge(item.status || "")}`}
                        >
                          {getStatusText(item.status || "")}
                        </span>
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === item.id ? (
                          <div className="flex justify-end gap-xs">
                            <button
                              onClick={() => handleSaveClick(item.id)}
                              className="compact-button rounded-md transition-colors"
                              style={{
                                backgroundColor: "var(--accent-green)",
                                color: "var(--sidebar-text)",
                              }}
                              disabled={item.id < 1}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="compact-button rounded-md transition-colors"
                              style={{
                                backgroundColor: "var(--card-secondary-bg)",
                                color: "var(--sidebar-text)",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(item)}
                            className="compact-button rounded-md flex items-center gap-1 transition-colors"
                            style={{
                              backgroundColor:
                                item.id < 1
                                  ? "var(--card-bg)"
                                  : "var(--card-secondary-bg)",
                              color:
                                item.id < 1
                                  ? "var(--text-tertiary)"
                                  : "var(--sidebar-text)",
                            }}
                            title={
                              item.id < 1
                                ? "Cannot edit temporary items"
                                : "Edit stock thresholds"
                            }
                            disabled={item.id < 1}
                          >
                            <Edit className="icon-sm" />
                            {item.id < 1 ? "N/A" : "Edit"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {validStockItems.length === 0 && !tableLoading && (
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
                No valid stock items found.
              </p>
              <p
                className="mt-xs text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                {stockItems.length > 0
                  ? `${stockItems.length - validStockItems.length} items hidden due to missing product data`
                  : Object.values(filters).some(
                        (value) => value && value !== false,
                      )
                    ? "Try adjusting your search or filters"
                    : "Stock items will appear here once they are added to warehouses"}
              </p>
              <div className="mt-2 gap-xs flex justify-center">
                {Object.values(filters).some(
                  (value) => value && value !== false,
                ) && (
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
              </div>
            </div>
          )}

          {/* Pagination */}
          {validStockItems.length > 0 && pagination.total_pages > 1 && (
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

export default StockItemsTablePage;
