import React from "react";
import { Search, X } from "lucide-react";
import type { Filters } from "../hooks/useOutOfStockReport";

interface FilterBarProps {
  filters: { search: string; category: string; status: string; warehouse: string };
  categories: string[];
  warehouses: string[];
  onFilterChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  categories,
  warehouses,
  onFilterChange,
  onReset,
}) => {
  return (
    <div
      className="compact-card rounded-md mb-4 p-3 transition-all duration-200"
      style={{
        backgroundColor: "var(--card-secondary-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--sidebar-text)" }}>
          Advanced Filters
        </h4>
        <button
          onClick={onReset}
          className="text-xs compact-button flex items-center gap-1 transition-colors"
          style={{ color: "var(--text-secondary)", backgroundColor: "var(--card-bg)" }}
        >
          <X className="icon-xs" />
          Clear All
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Search
          </label>
          <div className="relative">
            <Search
              className="absolute left-2 top-1/2 transform -translate-y-1/2 icon-sm"
              style={{ color: "var(--sidebar-text)" }}
            />
            <input
              type="text"
              placeholder="Search products, categories..."
              value={filters.search}
              onChange={(e) => onFilterChange("search", e.target.value)}
              className="compact-input w-full pl-8 rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--sidebar-text)",
                borderColor: "var(--border-color)",
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange("category", e.target.value)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              color: "var(--sidebar-text)",
              borderColor: "var(--border-color)",
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              color: "var(--sidebar-text)",
              borderColor: "var(--border-color)",
            }}
          >
            <option value="all">All Status</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="backorder">Backorder</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--sidebar-text)" }}>
            Warehouse
          </label>
          <select
            value={filters.warehouse}
            onChange={(e) => onFilterChange("warehouse", e.target.value)}
            className="compact-input w-full rounded-md"
            style={{
              backgroundColor: "var(--card-bg)",
              color: "var(--sidebar-text)",
              borderColor: "var(--border-color)",
            }}
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh} value={wh}>{wh}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;