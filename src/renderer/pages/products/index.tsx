// src/renderer/pages/inventory/index.tsx
import React, { useState } from "react";
import { Plus, Download, Filter, Package, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../components/UI/Button";
import Pagination from "../../components/Shared/Pagination1";
import { dialogs } from "../../utils/dialogs";
import { showSuccess, showError, showInfo } from "../../utils/notification";

import useProducts, { type ProductWithDetails } from "./hooks/useProducts";
import useProductForm from "./hooks/useProductForm";
import useProductView from "./hooks/useProductView";

import FilterBar from "./components/FilterBar";
import ProductTable from "./components/ProductTable";
import ProductFormDialog from "./components/ProductFormDialog";
import ProductViewDialog from "./components/ProductViewDialog";

import {
  productExportAPI,
  type ProductExportParams,
} from "../../api/exports/product"; // from second product.ts
import productAPI from "../../api/core/product";
import ProductImageFormDialog from "../productImage/components/ProductImageFormDialog";
import useVariantForm from "../productVariant/hooks/useVariantForm";
import VariantFormDialog from "../productVariant/components/VariantFormDialog";
import { useProductImageForm } from "../productImage/hooks/useProductImageForm";
import ProductTaxAssignmentDialog from "../inventory/components/ProductTaxAssignmentDialog";
import { useProductTaxAssignment } from "../inventory/hooks/useProductTaxAssignment";
import { useBulkProductTaxAssignment } from "../inventory/hooks/bulk/useProductTaxAssignment";
import BulkProductTaxAssignmentDialog from "../inventory/components/bulk/ProductTaxAssignmentDialog";

const ProductsPage: React.FC = () => {
  const {
    paginatedProducts,
    products,
    filters,
    loading,
    error,
    categories,
    pagination,
    selectedProducts,
    setSelectedProducts,
    sortConfig,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    reload,
    handleFilterChange,
    resetFilters,
    toggleProductSelection,
    toggleSelectAll,
    handleSort,
  } = useProducts();

  const formDialog = useProductForm();
  const imageForm = useProductImageForm(); // new hook
  const variantForm = useVariantForm(); // assuming existing
  const viewDialog = useProductView();
  const taxAssignmentHook = useProductTaxAssignment(reload);
  const bulkTaxAssignmentHook = useBulkProductTaxAssignment(reload);

  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const handleOpenTaxAssignment = (product: ProductWithDetails) => {
    taxAssignmentHook.open(product.id);
  };
  const handleDelete = async (product: any) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Product",
      message: `Are you sure you want to delete ${product.name}?`,
    });
    if (!confirmed) return;
    try {
      await productAPI.delete(product.id);
      showInfo("Product deleted successfully.");
      reload();
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Delete",
      message: `Delete ${selectedProducts.length} products?`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(selectedProducts.map((id) => productAPI.delete(id)));
      showSuccess(`${selectedProducts.length} products deleted.`);
      setSelectedProducts([]);
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Archive = set is_deleted = true
  const handleArchiveSelected = async () => {
    if (selectedProducts.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Archive Products",
      message: `Archive ${selectedProducts.length} products?`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        selectedProducts.map((id) =>
          productAPI.update(id, { is_deleted: true }),
        ),
      );
      showSuccess(`${selectedProducts.length} products archived.`);
      setSelectedProducts([]);
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Restore = set is_deleted = false
  const handleRestoreSelected = async () => {
    if (selectedProducts.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Restore Products",
      message: `Restore ${selectedProducts.length} products?`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        selectedProducts.map((id) =>
          productAPI.update(id, { is_deleted: false }),
        ),
      );
      showSuccess(`${selectedProducts.length} products restored.`);
      setSelectedProducts([]);
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleExport = async () => {
    if (products.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Export Products",
      message: `Export ${pagination.count} products as ${exportFormat.toUpperCase()}?`,
    });
    if (!confirmed) return;
    setExportLoading(true);
    try {
      const exportParams: ProductExportParams = {
        format: exportFormat,
        category: filters.categoryId
          ? categories.find((c) => c.id.toString() === filters.categoryId)?.name
          : undefined,
        status:
          filters.is_published === "true"
            ? "published"
            : filters.is_published === "false"
              ? "unpublished"
              : undefined,
        low_stock:
          filters.low_stock === "true"
            ? "true"
            : filters.low_stock === "false"
              ? "false"
              : undefined,
        search: filters.search || undefined,
      };
      await productExportAPI.exportProducts(exportParams);
      showSuccess("Export started.");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const getDisplayRange = () => {
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, pagination.count);
    return { start, end };
  };
  const { start, end } = getDisplayRange();

  const handlePublish = async (product: ProductWithDetails) => {
    if (
      !(await dialogs.confirm({
        title: "Publish Product",
        message: "Are you sure do you want to publish this product.",
        icon: "warning",
      }))
    )
      return;
    try {
      await productAPI.update(product.id, { is_published: true });
      showSuccess("Product published");
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleUnpublish = async (product: ProductWithDetails) => {
    if (
      !(await dialogs.confirm({
        title: "Unpublish Product",
        message: "Are you sure do you want to Unpublished this product.",
        icon: "warning",
      }))
    )
      return;
    try {
      await productAPI.update(product.id, { is_published: false });
      showSuccess("Product unpublished");
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleActivate = async (product: ProductWithDetails) => {
    if (
      !(await dialogs.confirm({
        title: "Activate Product",
        message: "Are you sure do you want to activate this product.",
        icon: "info",
      }))
    )
      return;
    try {
      await productAPI.update(product.id, { is_active: true });
      showSuccess("Product activated");
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeactivate = async (product: ProductWithDetails) => {
    if (
      !(await dialogs.confirm({
        title: "Deactivate",
        message: "Are you sure do you want to deactivate this product.",
        icon: "warning",
      }))
    )
      return;
    try {
      await productAPI.update(product.id, { is_active: false });
      showSuccess("Product deactivated");
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <div
      className="compact-card rounded-md shadow-md border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
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
            className="compact-button rounded-md flex items-center transition-colors ease-in-out hover:scale-105 hover:shadow-md disabled:opacity-50"
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
            onClick={reload}
            disabled={loading}
            className="btn btn-secondary btn-sm rounded-md flex items-center transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md disabled:opacity-50"
          >
            <RefreshCw
              className={`icon-sm mr-1 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {/* Export */}
          <div
            className="flex items-center gap-xs border rounded-md px-2 py-1"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center gap-1">
              <label
                className="text-xs"
                style={{ color: "var(--sidebar-text)" }}
              >
                Export:
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
                style={{ color: "var(--sidebar-text)" }}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <Button
              onClick={handleExport}
              disabled={exportLoading || products.length === 0}
              className="compact-button rounded-md flex items-center gap-1 px-2 py-1 text-xs"
            >
              <Download className="icon-xs" />
              {exportLoading ? "..." : "Export"}
            </Button>
          </div>

          <Button
            onClick={formDialog.openAdd}
            variant="success"
            size="sm"
            icon={Plus}
            iconPosition="left"
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Summary Banner */}
      {products.length > 0 && (
        <div
          className="mb-4 compact-card rounded-md border p-3 flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></span>
              {products.filter((p) => p.is_published).length} Published
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></span>
              {products.filter((p) => !p.is_published).length} Unpublished
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></span>
              {products.filter((p) => p.total_quantity === 0).length} Out of
              Stock
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></span>
              {
                products.filter(
                  (p) => p.total_quantity > 0 && p.total_quantity <= 5,
                ).length
              }{" "}
              Low Stock
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Total: {pagination.count} products
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
          categories={categories}
        />
      )}

      {/* Bulk Selection */}
      {selectedProducts.length > 0 && (
        <div
          className="mb-2 compact-card rounded-md border flex items-center justify-between p-2"
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
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white rounded-md"
              onClick={() => bulkTaxAssignmentHook.open(selectedProducts)}
              title="Assign taxes to selected products"
            >
              Assign Tax
            </button>
            <button
              className="compact-button rounded-md"
              style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
              onClick={handleExport}
              title="Export selected"
            >
              <Download className="icon-sm" />
            </button>
            <button
              className="compact-button bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-white rounded-md"
              onClick={handleArchiveSelected}
              title="Archive selected"
            >
              Archive
            </button>
            <button
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-white rounded-md"
              onClick={handleRestoreSelected}
              title="Restore selected"
            >
              Restore
            </button>
            <button
              className="compact-button bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white rounded-md"
              onClick={handleBulkDelete}
              title="Delete selected"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Page Size & Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm mb-2">
        <div className="flex items-center gap-sm">
          <label className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Show:
          </label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="compact-input border rounded text-sm"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            entries
          </span>
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

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-4">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-4 text-red-500">Error: {error}</div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          <ProductTable
            products={paginatedProducts}
            selectedProducts={selectedProducts}
            onToggleSelect={toggleProductSelection}
            onToggleSelectAll={toggleSelectAll}
            onSort={handleSort}
            sortConfig={sortConfig}
            onView={(product) => {
              viewDialog.open(product.id);
            }}
            onEdit={formDialog.openEdit}
            onDelete={handleDelete}
            reload={reload}
            onManageImages={(product) => {
              imageForm.open(product.id);
            }}
            onAddVariant={(product) => {
              variantForm.openAdd(product.id);
            }}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onActivate={handleActivate}
            onDeactivate={handleDeactivate}
            onTaxSettings={handleOpenTaxAssignment}
          />

          {/* Empty State */}
          {products.length === 0 && (
            <div
              className="text-center py-8 border rounded-md"
              style={{ borderColor: "var(--border-color)" }}
            >
              <Package
                className="icon-xl mx-auto mb-2"
                style={{ color: "var(--text-secondary)" }}
              />
              <p className="text-base" style={{ color: "var(--sidebar-text)" }}>
                No products found.
              </p>
              <p
                className="mt-xs text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                {Object.values(filters).some((v) => v)
                  ? "Try adjusting your search or filters"
                  : "Start by creating your first product"}
              </p>
              <div className="mt-2 gap-xs flex justify-center">
                {Object.values(filters).some((v) => v) && (
                  <button
                    className="compact-button rounded-md"
                    style={{
                      backgroundColor: "var(--accent-blue)",
                      color: "white",
                    }}
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/products/form"
                  className="compact-button rounded-md inline-block"
                  style={{
                    backgroundColor: "var(--accent-green)",
                    color: "white",
                  }}
                >
                  Add First Product
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {products.length > 0 && pagination.total_pages > 1 && (
            <div className="mt-2">
              <Pagination
                currentPage={currentPage}
                totalItems={pagination.count}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
                showPageSize={false}
              />
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <ProductFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        productId={formDialog.productId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={reload}
      />

      <ProductViewDialog
        product={viewDialog.product}
        movements={viewDialog.movements}
        salesStats={viewDialog.salesStats}
        loading={viewDialog.loading}
        isOpen={viewDialog.isOpen}
        onClose={viewDialog.close}
      />

      {/* Image Form Dialog */}
      {imageForm.productId && (
        <ProductImageFormDialog
          isOpen={imageForm.isOpen}
          productId={imageForm.productId}
          onClose={imageForm.close}
          onSuccess={reload}
        />
      )}

      <VariantFormDialog
        isOpen={variantForm.isOpen}
        mode={variantForm.mode}
        variantId={variantForm.variantId}
        productId={variantForm.productId} // we need to add this to variantForm state
        initialData={variantForm.initialData}
        onClose={variantForm.close}
        onSuccess={reload}
      />

      <ProductTaxAssignmentDialog hook={taxAssignmentHook} />
      <BulkProductTaxAssignmentDialog hook={bulkTaxAssignmentHook} />
    </div>
  );
};

export default ProductsPage;
