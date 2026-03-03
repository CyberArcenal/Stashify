import React, { useState } from "react";
import { Plus, Download, Filter, Package, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import useVariants from "./hooks/useVariants";
import useVariantForm from "./hooks/useVariantForm";
import { useVariantView } from "./hooks/useVariantView";

import FilterBar from "./components/FilterBar";
import VariantTable from "./components/VariantTable";
import VariantFormDialog from "./components/VariantFormDialog";
import VariantViewDialog from "./components/VariantViewDialog";
import { dialogs } from "../../utils/dialogs";
import productVariantAPI from "../../api/core/productVariant";
import { showError, showInfo, showSuccess } from "../../utils/notification";
import {
  variantExportAPI,
  type VariantExportParams,
} from "../../api/exports/variant";
import Button from "../../components/UI/Button";
import Pagination from "../../components/Shared/Pagination1";
import { useBulkVariantTaxAssignment  } from "../inventory/hooks/bulk/useVariantTaxAssignment";
import VariantTaxAssignmentDialog from "../inventory/components/VariantTaxAssignmentDialog";
import { useVariantTaxAssignment } from "../inventory/hooks/useVariantTaxAssignment";
import BulkVariantTaxAssignmentDialog from "../inventory/components/bulk/VariantTaxAssignmentDialog";

const VariantsPage: React.FC = () => {
  const {
    paginatedVariants,
    allVariants, // full list (all variants)
    filters,
    loading,
    error,
    categories,
    pagination,
    selectedVariants,
    setSelectedVariants,
    sortConfig,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    reload,
    handleFilterChange,
    resetFilters,
    toggleVariantSelection,
    toggleSelectAll,
    handleSort,
  } = useVariants();

  const formDialog = useVariantForm();
  const variantView = useVariantView();
  const taxAssignmentHook = useVariantTaxAssignment(reload);

  const bulkTaxAssignmentHook = useBulkVariantTaxAssignment(reload);

  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );

  const handleDelete = async (variant: any) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Variant",
      message: `Are you sure you want to delete ${variant.name}?`,
    });
    if (!confirmed) return;
    try {
      await productVariantAPI.delete(variant.id);
      showInfo("Variant deleted successfully.");
      reload();
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVariants.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Bulk Delete",
      message: `Delete ${selectedVariants.length} variants?`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        selectedVariants.map((id) => productVariantAPI.delete(id)),
      );
      showSuccess(`${selectedVariants.length} variants deleted.`);
      setSelectedVariants([]);
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Archive = soft delete (set is_deleted = true) – gamit ang delete method
  const handleArchiveSelected = async () => {
    if (selectedVariants.length === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Archive Variants",
      message: `Archive ${selectedVariants.length} variants?`,
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        selectedVariants.map((id) => productVariantAPI.delete(id)),
      );
      showSuccess(`${selectedVariants.length} variants archived.`);
      setSelectedVariants([]);
      reload();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleExport = async () => {
    if (pagination.count === 0) return;
    const confirmed = await dialogs.confirm({
      title: "Export Variants",
      message: `Export ${pagination.count} variants as ${exportFormat.toUpperCase()}?`,
    });
    if (!confirmed) return;
    setExportLoading(true);
    try {
      const exportParams: VariantExportParams = {
        format: exportFormat,
        product: filters.productId ? String(filters.productId) : undefined,
        category: filters.categoryId ? String(filters.categoryId) : undefined,
        low_stock:
          filters.lowStock === "true"
            ? "true"
            : filters.lowStock === "false"
              ? "false"
              : undefined,
        search: filters.search || undefined,
      };
      await variantExportAPI.exportVariants(exportParams);
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

  function onEdit(id: number) {
    throw new Error("Function not implemented.");
  }

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
            Product Variants
          </h2>
          <p
            className="mt-xs text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage product variants, SKUs, and stock levels
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
              disabled={exportLoading || pagination.count === 0}
              className="compact-button rounded-md flex items-center gap-1 px-2 py-1 text-xs"
            >
              <Download className="icon-xs" />
              {exportLoading ? "..." : "Export"}
            </Button>
          </div>

          <Button
            onClick={() => {
              formDialog.openAdd(null);
            }}
            variant="success"
            size="sm"
            icon={Plus}
            iconPosition="left"
          >
            Add Variant
          </Button>
        </div>
      </div>

      {/* Summary Banner - only show if there are variants */}
      {allVariants && allVariants.length > 0 && (
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
              {
                allVariants.filter((v: { is_active: any }) => v.is_active)
                  .length
              }{" "}
              Active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-orange)]"></span>
              {
                allVariants.filter((v: { is_active: any }) => !v.is_active)
                  .length
              }{" "}
              Inactive
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-red)]"></span>
              {
                allVariants.filter(
                  (v: { total_quantity: number }) => v.total_quantity === 0,
                ).length
              }{" "}
              Out of Stock
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]"></span>
              {
                allVariants.filter(
                  (v: { total_quantity: number }) =>
                    v.total_quantity > 0 && v.total_quantity <= 5,
                ).length
              }{" "}
              Low Stock
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Total: {pagination.count} variants
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
      {selectedVariants.length > 0 && (
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
            {selectedVariants.length} variant(s) selected
          </span>
          <div className="flex gap-xs">
      
              <button
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-white rounded-md"
              onClick={() => bulkTaxAssignmentHook.open(selectedVariants)}
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
              title="Archive selected (soft delete)"
            >
              Archive
            </button>
            <button
              className="compact-button bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white rounded-md"
              onClick={handleBulkDelete}
              title="Delete selected permanently"
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
          <VariantTable
            variants={paginatedVariants}
            selectedVariants={selectedVariants}
            onToggleSelect={toggleVariantSelection}
            onToggleSelectAll={toggleSelectAll}
            onSort={handleSort}
            sortConfig={sortConfig}
            onView={(variant) => variantView.open(variant.id)}
            onEdit={(variant) => {
              formDialog.openEdit(variant, variant.productId || null);
            }}
            onDelete={handleDelete}
            onTax={(variant) => {
              taxAssignmentHook.open(variant.id);
            }}
          />

          {/* Empty State - only show when there are no variants after filtering */}
          {pagination.count === 0 && (
            <div
              className="text-center py-8 border rounded-md"
              style={{ borderColor: "var(--border-color)" }}
            >
              <Package
                className="icon-xl mx-auto mb-2"
                style={{ color: "var(--text-secondary)" }}
              />
              <p className="text-base" style={{ color: "var(--sidebar-text)" }}>
                No variants found.
              </p>
              <p
                className="mt-xs text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                {Object.values(filters).some((v) => v)
                  ? "Try adjusting your search or filters"
                  : "Start by creating your first variant"}
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
                  to="/variants/form"
                  className="compact-button rounded-md inline-block"
                  style={{
                    backgroundColor: "var(--accent-green)",
                    color: "white",
                  }}
                >
                  Add First Variant
                </Link>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination.count > 0 && pagination.total_pages > 1 && (
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
      <VariantFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        variantId={formDialog.variantId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={reload}
        productId={null}
      />

      <VariantTaxAssignmentDialog hook={taxAssignmentHook} />
      <BulkVariantTaxAssignmentDialog hook={bulkTaxAssignmentHook} />

      <VariantViewDialog
        isOpen={variantView.isOpen}
        variant={variantView.variant}
        stockItems={variantView.stockItems}
        movements={variantView.movements}
        loading={variantView.loading}
        loadingMovements={variantView.loadingMovements}
        onClose={variantView.close}
        onEdit={(id) => {
          const variant = allVariants.find((v) => v.id === id);
          if (variant) {
            formDialog.openEdit(variant, variant.productId || null);
          }
        }}
        onFetchMovements={variantView.fetchMovements}
      />
    </div>
  );
};

export default VariantsPage;
