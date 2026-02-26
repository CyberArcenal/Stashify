import React, { useState } from "react";
import { Filter, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import useOutOfStockReport from "./hooks/useOutOfStockReport";
import FilterBar from "./components/FilterBar";
import ExportDropdown from "./components/ExportDropdown";
import MetricsCards from "./components/MetricsCards";
import StockTable from "./components/StockTable";
import ChartsSection from "./components/ChartsSection";
import PerformanceSummary from "./components/PerformanceSummary";
import ReportFooter from "./components/ReportFooter";

const OutOfStockReportPage: React.FC = () => {
  const {
    reportData,
    loading,
    error,
    refreshing,
    filters,
    setFilter,
    resetFilters,
    filteredItems,
    paginatedItems,
    pagination,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    categories,
    warehouses,
    exportLoading,
    handleExport,
    refreshData,
  } = useOutOfStockReport();

  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        className="compact-card rounded-md shadow-md border"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
              style={{ borderColor: "var(--accent-blue)" }}
            ></div>
            <p className="mt-2 text-sm" style={{ color: "var(--sidebar-text)" }}>
              Loading out of stock report...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="compact-card rounded-md shadow-md border"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="text-center py-8" style={{ color: "var(--danger-color)" }}>
          <p className="text-base font-semibold mb-1">Error Loading Report</p>
          <p className="mb-2 text-sm">{error}</p>
          <button
            onClick={refreshData}
            className="compact-button text-[var(--sidebar-text)] rounded-md"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const { summary, charts, performanceSummary } = reportData;

  return (
    <div
      className="compact-card rounded-md shadow-md border transition-all duration-200"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            <div
              className="w-2 h-6 rounded-full"
              style={{ backgroundColor: "var(--danger-color)" }}
            ></div>
            Out of Stock Items (Per Warehouse)
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Monitor items with zero inventory across warehouse locations
          </p>
        </div>
        <div className="flex gap-xs">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="compact-button rounded-md flex items-center transition-colors"
            style={{
              backgroundColor: showFilters ? "var(--accent-blue)" : "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
          >
            <Filter className="icon-sm mr-xs" />
            Filters
            {showFilters && <X className="icon-sm ml-xs" />}
          </button>

          <button
            onClick={refreshData}
            disabled={refreshing}
            className="compact-button rounded-md flex items-center transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--card-secondary-bg)", color: "var(--sidebar-text)" }}
          >
            <RefreshCw className={`icon-sm mr-xs ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          <ExportDropdown
            exportLoading={exportLoading}
            onExport={handleExport}
          />
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <FilterBar
          filters={filters}
          categories={categories}
          warehouses={warehouses}
          onFilterChange={setFilter}
          onReset={resetFilters}
        />
      )}

      {/* Metrics Cards */}
      <MetricsCards summary={summary} performance={performanceSummary} />

      {/* Critical Alert Banner */}
      <div
        className="compact-card rounded-md text-white mb-4 transition-all duration-200 hover:scale-[1.01]"
        style={{
          background: "linear-gradient(to right, var(--danger-color), var(--danger-hover))",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1 flex items-center text-sm">
              Critical Inventory Alert
            </h3>
            <p className="text-xs opacity-90">
              {summary.outOfStockCount} items are completely out of stock across{" "}
              {summary.affectedWarehouses} warehouses, affecting sales and customer satisfaction.
            </p>
          </div>
          <button
            onClick={() => navigate("/purchases/form")}
            className="compact-button rounded-md font-semibold transition-all duration-200 hover:scale-[1.05] flex items-center"
            style={{ backgroundColor: "white", color: "var(--danger-color)" }}
          >
            Create Purchase Orders
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <ChartsSection charts={charts} />

      {/* Stock Table with Pagination */}
      <StockTable
        items={paginatedItems}
        pagination={pagination}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Performance Summary */}
      <PerformanceSummary performance={performanceSummary} summary={summary} />

      {/* Footer */}
      <ReportFooter
        totalItems={filteredItems.length}
        allItemsCount={reportData.stockItems.length}
        generatedAt={reportData.metadata?.generatedAt}
        reportType={reportData.metadata?.reportType}
      />
    </div>
  );
};

export default OutOfStockReportPage;