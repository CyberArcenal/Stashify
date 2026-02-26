import React, { useState } from "react";
import { Download, Filter, RefreshCw, X } from "lucide-react";

import useInventoryReport from "./hooks/useInventoryReport";
import FilterBar from "./components/FilterBar";
import OverviewTab from "./components/OverviewTab";
import MetricsCards from "./components/MetricsCards";
import AnalysisTab from "./components/AnalysisTab";
import StockDetailsTab from "./components/StockDetailsTab";
import ReportFooter from "./components/ReportFooter";

const InventoryReportPage: React.FC = () => {
  const {
    reportData,
    loading,
    error,
    refreshing,
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    exportFormat,
    setExportFormat,
    exportLoading,
    handleExport,
    handleRefresh,
  } = useInventoryReport();

  const [showFilters, setShowFilters] = useState(false);

  // Transform data to ensure required fields have defaults
  const stockByCategory = reportData?.stockByCategory.map(cat => ({
    ...cat,
    stockValue: cat.stockValue ?? 0
  })) ?? [];

const lowStockProducts = reportData?.lowStockProducts
  .filter((p): p is typeof p & { productId: number } => p.productId != null)
  .map(p => ({
    ...p,
    currentValue: p.currentValue ?? 0,
    productId: p.productId,
    variantId: p.variantId ?? undefined, // convert null to undefined
  })) ?? [];

  if (loading) {
    return (
      <div
        className="compact-card rounded-lg"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex justify-center items-center h-48">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
              style={{ borderColor: "var(--primary-color)" }}
            ></div>
            <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
              Loading inventory report...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="compact-card rounded-lg"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="text-center p-6" style={{ color: "var(--danger-color)" }}>
          <div className="text-base font-semibold mb-1">Error Loading Report</div>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={handleRefresh}
            className="btn btn-primary btn-sm rounded-md flex items-center mx-auto"
          >
            <RefreshCw className="icon-sm mr-1" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div
        className="compact-card rounded-lg"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="text-center p-6" style={{ color: "var(--sidebar-text)" }}>
          No inventory data available.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="compact-card rounded-lg"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex justify-between items-center p-4">
          <div>
            <h2
              className="text-lg font-semibold flex items-center gap-1.5"
              style={{ color: "var(--sidebar-text)" }}
            >
              <div
                className="w-1.5 h-5 rounded-full"
                style={{ backgroundColor: "var(--accent-green)" }}
              ></div>
              Inventory Analytics
            </h2>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {reportData.dateRange.startDate} to {reportData.dateRange.endDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary btn-sm rounded-md flex items-center"
              style={{
                backgroundColor: showFilters ? "var(--accent-blue)" : "var(--card-secondary-bg)",
              }}
            >
              <Filter className="icon-sm mr-1" />
              Filters
              {showFilters && <X className="icon-sm ml-1" />}
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary btn-sm rounded-md flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`icon-sm mr-1 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {/* Export */}
            <div
              className="flex items-center gap-1 rounded-md px-2"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <label className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                Export as:
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="compact-input border-0 text-sm font-medium focus:ring-0 cursor-pointer px-1 py-1"
                style={{ backgroundColor: "var(--card-secondary-bg)", color: "var(--sidebar-text)" }}
                disabled={exportLoading}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
              <button
                onClick={handleExport}
                disabled={exportLoading || !reportData}
                className="btn btn-primary btn-sm rounded-md flex items-center disabled:opacity-50"
                style={{ backgroundColor: exportLoading ? "var(--secondary-color)" : "var(--accent-green)" }}
              >
                <Download className="icon-sm mr-1" />
                {exportLoading ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <FilterBar
            dateRange={dateRange}
            setDateRange={setDateRange}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>

      {/* Navigation Tabs */}
      <div
        className="compact-card rounded-lg"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border-color)" }}
      >
        <div className="flex border-b" style={{ borderColor: "var(--border-color)" }}>
          {(["overview", "stock", "analysis"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab ? "border-b-2" : ""
              }`}
              style={{
                color: activeTab === tab ? "var(--primary-color)" : "var(--text-secondary)",
                borderColor: activeTab === tab ? "var(--primary-color)" : "transparent",
              }}
            >
              {tab === "overview" && "Overview"}
              {tab === "stock" && "Stock Details"}
              {tab === "analysis" && "Analysis"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === "overview" && (
        <>
          <MetricsCards summary={reportData.summary} />
          <OverviewTab
            stockByCategory={stockByCategory}
            lowStockProducts={lowStockProducts}
            stockMovements={reportData.stockMovements}
            performanceMetrics={reportData.performanceMetrics}
            summary={reportData.summary}
          />
        </>
      )}

      {activeTab === "stock" && (
        <StockDetailsTab
          lowStockProducts={lowStockProducts}
          stockByCategory={stockByCategory}
          summary={reportData.summary}
        />
      )}

      {activeTab === "analysis" && (
        <AnalysisTab
          summary={reportData.summary}
          performanceMetrics={reportData.performanceMetrics}
          metadata={reportData.metadata}
        />
      )}

      {/* Footer */}
      <ReportFooter
        summary={reportData.summary}
        dateRange={reportData.dateRange}
        metadata={reportData.metadata}
      />
    </div>
  );
};

export default InventoryReportPage;