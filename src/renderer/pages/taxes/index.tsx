// src/renderer/pages/taxes/index.tsx
import React, { useState } from "react";
import { Plus, Filter, RefreshCw } from "lucide-react";
import Button from "../../components/UI/Button";
import Pagination from "../../components/Shared/Pagination1";
import { dialogs } from "../../utils/dialogs";
import { showSuccess, showError, showInfo } from "../../utils/notification";

import { useTaxes } from "./hooks/useTaxes";
import { useTaxForm } from "./hooks/useTaxForm";
import FilterBar from "./components/FilterBar";
import TaxTable from "./components/TaxTable";
import TaxFormDialog from "./components/TaxFormDialog";
import taxAPI, { type Tax } from "../../api/core/tax";
import { useTaxView } from "./hooks/useTaxView";
import TaxViewDialog from "./components/TaxViewDialog";

const TaxesPage: React.FC = () => {
  const {
    taxes,
    loading,
    error,
    filters,
    pagination,
    sortConfig,
    handleFilterChange,
    resetFilters,
    handleSort,
    setPage,
    setPageSize,
    reload,
  } = useTaxes();

  const formDialog = useTaxForm();
  const viewDialog = useTaxView();
  const [showFilters, setShowFilters] = useState(false);

  const handleDelete = async (tax: Tax) => {
    const confirmed = await dialogs.confirm({
      title: "Delete Tax",
      message: `Are you sure you want to delete ${tax.name}?`,
      icon: "danger",
    });
    if (!confirmed) return;
    try {
      await taxAPI.delete(tax.id);
      showInfo("Tax deleted successfully.");
      reload();
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };
  const handleDefault = async (tax: Tax) => {
    const confirmed = await dialogs.confirm({
      title: "Mark As Default",
      message: `Are you sure you want to mark as default ${tax.name}?`,
      icon: "info",
    });
    if (!confirmed) return;
    try {
      await taxAPI.update(tax.id, { is_default: true });
      showInfo("Tax update successfully.");
      reload();
    } catch (err: any) {
      dialogs.alert({ title: "Error", message: err.message });
    }
  };

  const getDisplayRange = () => {
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Taxes
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage tax rates and types
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            className="compact-button rounded-md flex items-center px-3 py-2"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-1" />
            Filters {showFilters ? "↑" : "↓"}
          </button>
          <button
            onClick={reload}
            disabled={loading}
            className="btn btn-secondary btn-sm rounded-md flex items-center px-3 py-2"
          >
            <RefreshCw
              className={`icon-sm mr-1 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <Button
            onClick={formDialog.openAdd}
            variant="success"
            size="sm"
            icon={Plus}
            iconPosition="left"
          >
            Add Tax
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
        />
      )}

      {/* Page Size & Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Show:
          </label>
          <select
            value={pagination.limit}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="compact-input border rounded text-sm px-2 py-1"
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
          {pagination.total > 0
            ? `Showing ${start} to ${end} of ${pagination.total} entries`
            : "No entries found"}
        </div>
      </div>

      {/* Loading/Error/Table */}
      {loading && (
        <div className="flex justify-center py-4">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
        </div>
      )}
      {error && (
        <div className="text-center py-4 text-red-500">Error: {error}</div>
      )}
      {!loading && !error && (
        <>
          <TaxTable
            taxes={taxes}
            onSort={handleSort}
            sortConfig={sortConfig}
            onEdit={formDialog.openEdit}
            onDelete={handleDelete}
            onView={(tax) => viewDialog.open(tax.id)}
            onDefault={handleDefault}
          />
          {pagination.totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={pagination.page}
                totalItems={pagination.total}
                pageSize={pagination.limit}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10, 25, 50, 100]}
                showPageSize={false}
              />
            </div>
          )}
        </>
      )}

      {/* Form Dialog */}
      <TaxFormDialog
        isOpen={formDialog.isOpen}
        mode={formDialog.mode}
        taxId={formDialog.taxId}
        initialData={formDialog.initialData}
        onClose={formDialog.close}
        onSuccess={reload}
      />

      <TaxViewDialog hook={viewDialog} />
    </div>
  );
};

export default TaxesPage;
