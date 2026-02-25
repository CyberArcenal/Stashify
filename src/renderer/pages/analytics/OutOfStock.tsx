// components/OutOfStockReportPage.tsx
import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Download,
  Filter,
  Search,
  AlertTriangle,
  Package,
  TrendingDown,
  BarChart3,
  ShoppingCart,
  ChevronDown,
  RefreshCw,
  X,
  Building,
  MapPin,
} from "lucide-react";
import outOfStockAPI, {
  OutOfStockReportData,
  OutOfStockItem,
} from "@/renderer/api/outStock";
import { useNavigate } from "react-router-dom";
import { dialogs } from "@/renderer/utils/dialogs";
import { showApiError, showSuccess } from "@/renderer/utils/notification";

// Color palettes - using existing CSS variables
const COLORS = [
  "var(--accent-red)",
  "var(--accent-orange)",
  "var(--warning-color)",
  "var(--accent-blue)",
  "var(--accent-emerald)",
  "var(--accent-purple)",
];
const PIE_COLORS = ["var(--accent-red)", "var(--accent-emerald)"];

const OutOfStockReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<OutOfStockReportData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [exportLoading, setExportLoading] = useState<
    "pdf" | "csv" | "excel" | null
  >(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await outOfStockAPI.getOutOfStockReport();
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await outOfStockAPI.refreshOutOfStockReport();
      setReportData(data);

      // Brief success indication
      setTimeout(() => setRefreshing(false), 1000);
    } catch (err: any) {
      setError(err.message);
      setRefreshing(false);
    }
  };

  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    try {
      setExportLoading(format);
      setError(null);
      setShowExportDropdown(false);

      const params: { category: string; include_backorder: boolean } = {
        category:
          categoryFilter && categoryFilter !== "all" ? categoryFilter : "",
        include_backorder: false,
      };

      if (categoryFilter && categoryFilter !== "all") {
        params.category = categoryFilter;
      }

      // Default: exclude backorders unless filter logic says otherwise
      params.include_backorder = false;

      await outOfStockAPI.exportReport(format, params);
      showSuccess("Out-of-stock report exported successfully");
    } catch (err: any) {
      console.error("Export failed:", err);
      showApiError(err?.message || "Export failed");
    } finally {
      setExportLoading(null);
    }
  };

  // Filter stock items based on search and filters
  const filteredStockItems =
    reportData?.stockItems.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.variant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.warehouse.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesWarehouse =
        warehouseFilter === "all" || item.warehouse === warehouseFilter;

      return (
        matchesSearch && matchesCategory && matchesStatus && matchesWarehouse
      );
    }) || [];

  // Get unique categories for filter
  const categories = Array.from(
    new Set(reportData?.stockItems.map((item) => item.category) || []),
  );
  // Get unique warehouses for filter
  const warehouses = Array.from(
    new Set(reportData?.stockItems.map((item) => item.warehouse) || []),
  );

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="compact-card rounded-md shadow-lg border transition-all duration-200"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <p
            className="font-semibold text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
              {entry.dataKey === "count" && " items"}
              {entry.dataKey === "value" && " items"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setWarehouseFilter("all");
  };

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
            <p
              className="mt-2 text-sm"
              style={{ color: "var(--sidebar-text)" }}
            >
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
        <div className="text-center" style={{ color: "var(--danger-color)" }}>
          <AlertTriangle className="icon-xl mx-auto mb-2" />
          <p className="text-base font-semibold mb-1">Error Loading Report</p>
          <p className="mb-2 text-sm">{error}</p>
          <button
            onClick={loadReportData}
            className="compact-button text-[var(--sidebar-text)] rounded-md transition-all duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { summary, charts, performanceSummary } = reportData;

  return (
    <div
      className="compact-card rounded-md shadow-md border transition-all duration-200"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Enhanced Page Header */}
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
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Monitor items with zero inventory across warehouse locations
          </p>
        </div>
        <div className="flex gap-xs">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="compact-button rounded-md flex items-center transition-colors hover:bg-[var(--card-hover-bg)]"
            style={{
              backgroundColor: showFilters
                ? "var(--accent-blue)"
                : "var(--card-secondary-bg)",
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
            className="compact-button rounded-md flex items-center transition-colors hover:bg-[var(--card-hover-bg)] disabled:opacity-50"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
          >
            <RefreshCw
              className={`icon-sm mr-xs ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>

          {/* Enhanced Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={exportLoading !== null}
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
              style={{ backgroundColor: "var(--accent-blue)" }}
            >
              <Download className="icon-sm mr-xs" />
              {exportLoading
                ? `Exporting ${exportLoading.toUpperCase()}...`
                : "Export Report"}
              <ChevronDown
                className={`icon-sm ml-xs transition-transform ${showExportDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {/* Enhanced Dropdown Menu */}
            {showExportDropdown && (
              <div
                className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg border z-10 transition-all duration-200"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  borderColor: "var(--border-color)",
                }}
              >
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-4 py-2 text-sm flex items-center disabled:opacity-50 hover:bg-[var(--card-bg)] transition-colors"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Download className="icon-sm mr-2" />
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-4 py-2 text-sm flex items-center disabled:opacity-50 hover:bg-[var(--card-bg)] transition-colors"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Download className="icon-sm mr-2" />
                  Export as Excel
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-4 py-2 text-sm flex items-center disabled:opacity-50 hover:bg-[var(--card-bg)] transition-colors"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Download className="icon-sm mr-2" />
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Error */}
      {error && (
        <div
          className="mb-4 p-3 rounded-md border transition-all duration-200"
          style={{
            backgroundColor: "var(--accent-red-light)",
            borderColor: "var(--danger-color)",
          }}
        >
          <div
            className="flex items-center"
            style={{ color: "var(--danger-color)" }}
          >
            <AlertTriangle className="icon-sm mr-2" />
            <span className="text-sm">Export failed: {error}</span>
          </div>
        </div>
      )}

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-4">
        <div
          className="compact-stats rounded-md border relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                Total Stock Items
              </div>
              <div
                className="text-xl font-bold mt-xs"
                style={{ color: "var(--sidebar-text)" }}
              >
                {summary.totalStockItems}
              </div>
            </div>
            <div
              className="p-1 rounded-md"
              style={{ backgroundColor: "var(--accent-blue-light)" }}
            >
              <Package
                className="icon-md"
                style={{ color: "var(--accent-blue)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-blue)", opacity: 0.1 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md border relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                Out of Stock
              </div>
              <div
                className="text-xl font-bold mt-xs"
                style={{ color: "var(--danger-color)" }}
              >
                {summary.outOfStockCount}
              </div>
              <div
                className="text-xs mt-xs"
                style={{ color: "var(--danger-color)" }}
              >
                {summary.outOfStockPercentage.toFixed(1)}% of total
              </div>
            </div>
            <div
              className="p-1 rounded-md"
              style={{ backgroundColor: "var(--accent-red-light)" }}
            >
              <AlertTriangle
                className="icon-md"
                style={{ color: "var(--danger-color)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--danger-color)", opacity: 0.1 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md border relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                Longest Out of Stock
              </div>
              <div
                className="text-xl font-bold mt-xs"
                style={{ color: "var(--accent-orange)" }}
              >
                {performanceSummary.longestOutOfStock}d
              </div>
              <div
                className="text-xs mt-xs"
                style={{ color: "var(--accent-orange)" }}
              >
                Maximum days
              </div>
            </div>
            <div
              className="p-1 rounded-md"
              style={{ backgroundColor: "var(--accent-orange-light)" }}
            >
              <TrendingDown
                className="icon-md"
                style={{ color: "var(--accent-orange)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-orange)", opacity: 0.1 }}
          ></div>
        </div>

        <div
          className="compact-stats rounded-md border relative overflow-hidden transition-all duration-200 hover:scale-[1.02]"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                Avg. Days Out
              </div>
              <div
                className="text-xl font-bold mt-xs"
                style={{ color: "var(--accent-purple)" }}
              >
                {performanceSummary.averageDaysOutOfStock.toFixed(1)}d
              </div>
              <div
                className="text-xs mt-xs"
                style={{ color: "var(--accent-purple)" }}
              >
                Average duration
              </div>
            </div>
            <div
              className="p-1 rounded-md"
              style={{ backgroundColor: "var(--accent-purple-light)" }}
            >
              <BarChart3
                className="icon-md"
                style={{ color: "var(--accent-purple)" }}
              />
            </div>
          </div>
          <div
            className="absolute top-0 right-0 w-8 h-8 rounded-bl-full"
            style={{ backgroundColor: "var(--accent-purple)", opacity: 0.1 }}
          ></div>
        </div>
      </div>

      {/* Enhanced Filters Section */}
      {showFilters && (
        <div
          className="compact-card rounded-md mb-4 p-3 transition-all duration-200"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: "var(--sidebar-text)" }}
            >
              <Filter className="icon-sm" />
              Advanced Filters
            </h4>
            <button
              onClick={resetFilters}
              className="text-xs compact-button flex items-center gap-1 transition-colors"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--card-bg)",
              }}
            >
              <X className="icon-xs" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-sm">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Search
              </label>
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 icon-sm"
                  style={{ color: "var(--sidebar-text)" }}
                />
                <input
                  type="text"
                  placeholder="Search products, categories, warehouses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="compact-input w-full pl-8 rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="compact-input w-full rounded-md transition-colors"
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--sidebar-text)",
                  borderColor: "var(--border-color)",
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="compact-input w-full rounded-md transition-colors"
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
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Warehouse
              </label>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="compact-input w-full rounded-md transition-colors"
                style={{
                  backgroundColor: "var(--card-bg)",
                  color: "var(--sidebar-text)",
                  borderColor: "var(--border-color)",
                }}
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse} value={warehouse}>
                    {warehouse}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Critical Alert Banner */}
      <div
        className="compact-card rounded-md text-[var(--sidebar-text)] mb-4 transition-all duration-200 hover:scale-[1.01]"
        style={{
          background:
            "linear-gradient(to right, var(--danger-color), var(--danger-hover))",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1 flex items-center text-sm">
              <AlertTriangle className="icon-sm mr-xs" />
              Critical Inventory Alert
            </h3>
            <p className="text-xs opacity-90">
              {summary.outOfStockCount} items are completely out of stock across{" "}
              {summary.affectedWarehouses} warehouses, affecting sales and
              customer satisfaction.
            </p>
          </div>
          <button
            onClick={() => {
              navigate(`/purchases/form`);
            }}
            className="compact-button rounded-md font-semibold transition-all duration-200 hover:scale-[1.05] hover:bg-gray-100 flex items-center"
            style={{ backgroundColor: "white", color: "var(--danger-color)" }}
          >
            <ShoppingCart className="icon-sm mr-xs" />
            Create Purchase Orders
          </button>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-sm mb-4">
        {/* Bar Chart: Top Categories with Out of Stock Items */}
        <div
          className="compact-card rounded-md border transition-all duration-200 hover:scale-[1.01]"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <h3
            className="font-semibold mb-2 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Out of Stock by Category
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.barChart}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
              />
              <XAxis
                dataKey="name"
                stroke="var(--sidebar-text)"
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="var(--sidebar-text)" fontSize={10} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="count"
                name="Out of Stock Items"
                fill="var(--accent-red)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart: Out of Stock vs In Stock ratio */}
        <div
          className="compact-card rounded-md border transition-all duration-200 hover:scale-[1.01]"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <h3
            className="font-semibold mb-2 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Inventory Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={charts.pieChart}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${((percent as number) * 100).toFixed(0)}%)`
                }
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {charts.pieChart.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} items`, "Count"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced Out of Stock Items Table */}
      <div
        className="overflow-x-auto rounded-md border compact-table transition-all duration-200"
        style={{ borderColor: "var(--border-color)" }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Product
              </th>
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Variant
              </th>
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Category
              </th>
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Warehouse
              </th>
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Location
              </th>
              <th
                className="text-right px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Current Stock
              </th>
              <th
                className="text-right px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Reorder Level
              </th>
              <th
                className="text-right px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Days Out
              </th>
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Supplier
              </th>
              <th
                className="text-center px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Status
              </th>
              <th
                className="text-left px-4 py-2 text-xs font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStockItems.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-[var(--card-secondary-bg)] transition-colors duration-150"
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                <td
                  className="px-4 py-2 font-medium text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <div className="flex flex-col">
                    <span>{item.product}</span>
                    {item.sku && (
                      <span className="text-xs text-gray-500">
                        SKU: {item.sku}
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className="px-4 py-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {item.variant}
                </td>
                <td
                  className="px-4 py-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {item.category}
                </td>
                <td
                  className="px-4 py-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <div className="flex items-center gap-1">
                    <Building className="icon-xs" />
                    {item.warehouse}
                  </div>
                </td>
                <td
                  className="px-4 py-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <div className="flex items-center gap-1">
                    <MapPin className="icon-xs" />
                    {item.warehouseLocation || "N/A"}
                  </div>
                </td>
                <td
                  className="px-4 py-2 text-right font-medium text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {item.currentStock}
                </td>
                <td
                  className="px-4 py-2 text-right text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {item.reorderLevel}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`font-medium text-sm transition-colors duration-200 ${
                      item.daysOutOfStock > 7
                        ? "text-[var(--danger-color)]"
                        : item.daysOutOfStock > 3
                          ? "text-[var(--accent-orange)]"
                          : "text-[var(--warning-color)]"
                    }`}
                  >
                    {item.daysOutOfStock} days
                  </span>
                </td>
                <td
                  className="px-4 py-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {item.supplier}
                </td>
                <td className="px-4 py-2 text-center">
                  <span
                    className="inline-flex items-center px-xs py-xs rounded-full text-xs font-medium transition-all duration-200 hover:scale-[1.05]"
                    style={{
                      backgroundColor: item.allowBackorder
                        ? "var(--accent-orange-light)"
                        : "var(--accent-red-light)",
                      color: item.allowBackorder
                        ? "var(--accent-orange)"
                        : "var(--danger-color)",
                    }}
                  >
                    <AlertTriangle className="icon-xs mr-xs" />
                    {item.status}
                    {item.allowBackorder && " (Backorder)"}
                  </span>
                </td>
                <td
                  className="px-4 py-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formatDate(item.lastUpdated)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Empty State */}
      {filteredStockItems.length === 0 && (
        <div className="text-center py-8 transition-all duration-200">
          <div className="mb-2" style={{ color: "var(--sidebar-text)" }}>
            <Package className="icon-xl mx-auto" />
          </div>
          <p className="text-base" style={{ color: "var(--sidebar-text)" }}>
            {summary.outOfStockCount === 0
              ? "No Out of Stock Items"
              : "No Items Match Your Filters"}
          </p>
          <p className="mt-xs text-sm" style={{ color: "var(--sidebar-text)" }}>
            {summary.outOfStockCount === 0
              ? "All items are currently in stock across all warehouses"
              : "Try adjusting your search or filters"}
          </p>
          {Object.values({
            searchTerm,
            categoryFilter,
            statusFilter,
            warehouseFilter,
          }).some((value) => value && value !== "all") && (
            <button
              className="compact-button text-[var(--sidebar-text)] rounded-md transition-all duration-200 hover:scale-[1.02] mt-2"
              style={{ backgroundColor: "var(--accent-blue)" }}
              onClick={resetFilters}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Enhanced Performance Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-sm">
        <div
          className="compact-card rounded-md text-[var(--sidebar-text)] transition-all duration-200 hover:scale-[1.01]"
          style={{
            background:
              "linear-gradient(to right, var(--danger-color), var(--danger-hover))",
          }}
        >
          <h4 className="font-semibold mb-1 text-sm">Most Affected Category</h4>
          <p className="text-xl font-bold">
            {performanceSummary.mostAffectedCategory}
          </p>
          <p className="text-xs opacity-90">
            {performanceSummary.mostAffectedCategoryCount} items out of stock in
            this category
          </p>
          {performanceSummary.mostAffectedCategoryLostSales && (
            <p className="text-xs opacity-90 mt-1">
              ₱
              {performanceSummary.mostAffectedCategoryLostSales.toLocaleString()}{" "}
              estimated lost sales
            </p>
          )}
        </div>
        <div
          className="compact-card rounded-md text-[var(--sidebar-text)] transition-all duration-200 hover:scale-[1.01]"
          style={{
            background:
              "linear-gradient(to right, var(--accent-orange), var(--accent-orange-hover))",
          }}
        >
          <h4 className="font-semibold mb-1 text-sm">Restocking Priority</h4>
          <p className="text-xl font-bold">
            {performanceSummary.restockingPriority}
          </p>
          <p className="text-xs opacity-90">
            {summary.outOfStockCount} items need immediate restocking
          </p>
        </div>
      </div>

      {/* Warehouse Impact Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-sm">
        <div
          className="compact-card rounded-md text-[var(--sidebar-text)] transition-all duration-200 hover:scale-[1.01]"
          style={{
            background:
              "linear-gradient(to right, var(--accent-blue), var(--accent-indigo))",
          }}
        >
          <h4 className="font-semibold mb-1 text-sm">
            Most Affected Warehouse
          </h4>
          <p className="text-xl font-bold">
            {performanceSummary.mostAffectedWarehouse}
          </p>
          <p className="text-xs opacity-90">
            {performanceSummary.mostAffectedWarehouseCount} items out of stock
          </p>
        </div>
        <div
          className="compact-card rounded-md text-[var(--sidebar-text)] transition-all duration-200 hover:scale-[1.01]"
          style={{
            background:
              "linear-gradient(to right, var(--accent-purple), var(--accent-indigo))",
          }}
        >
          <h4 className="font-semibold mb-1 text-sm">
            Total Affected Warehouses
          </h4>
          <p className="text-xl font-bold">
            {performanceSummary.affectedWarehousesCount ||
              summary.affectedWarehouses}
          </p>
          <p className="text-xs opacity-90">
            Warehouses with out of stock items
          </p>
        </div>
      </div>

      {/* Enhanced Footer */}
      <div
        className="flex justify-between items-center mt-4 pt-3"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div
          className="text-xs flex items-center gap-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--accent-green)" }}
          ></div>
          Report generated:{" "}
          {reportData.metadata?.generatedAt
            ? formatDate(reportData.metadata.generatedAt)
            : formatDate(new Date().toISOString())}
          {reportData.metadata?.reportType && (
            <span
              className="ml-2 px-1 py-0.5 rounded text-xs"
              style={{
                backgroundColor: "var(--accent-blue-light)",
                color: "var(--accent-blue)",
              }}
            >
              {reportData.metadata.reportType}
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {filteredStockItems.length} of {reportData.stockItems.length} out of
          stock items
        </div>
      </div>
    </div>
  );
};

export default OutOfStockReportPage;
