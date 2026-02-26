// src/renderer/pages/inventory-report/components/FilterBar.tsx
import React from "react";
import { X } from "lucide-react";

interface FilterBarProps {
  dateRange: "3months" | "6months" | "1year" | "custom";
  setDateRange: (range: any) => void;
  activeTab: "overview" | "stock" | "analysis";
  setActiveTab: (tab: any) => void;
  exportFormat: "csv" | "excel" | "pdf";
  setExportFormat: (format: any) => void;
  onClose: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  dateRange,
  setDateRange,
  activeTab,
  setActiveTab,
  exportFormat,
  setExportFormat,
  onClose,
}) => {
  return (
    <div
      className="compact-card rounded-md m-4 p-3"
      style={{
        backgroundColor: "var(--card-secondary-bg)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--sidebar-text)" }}>
          Report Filters
        </h4>
        <button
          onClick={onClose}
          className="text-xs compact-button flex items-center gap-1"
          style={{ color: "var(--text-secondary)", backgroundColor: "var(--card-bg)" }}
        >
          <X className="icon-xs" />
          Close
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="compact-input w-full rounded-md"
            style={{ backgroundColor: "var(--card-bg)", color: "var(--sidebar-text)", borderColor: "var(--border-color)" }}
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            View Mode
          </label>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="compact-input w-full rounded-md"
            style={{ backgroundColor: "var(--card-bg)", color: "var(--sidebar-text)", borderColor: "var(--border-color)" }}
          >
            <option value="overview">Overview</option>
            <option value="stock">Stock Details</option>
            <option value="analysis">Analysis</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Export Format
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="compact-input w-full rounded-md"
            style={{ backgroundColor: "var(--card-bg)", color: "var(--sidebar-text)", borderColor: "var(--border-color)" }}
          >
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;