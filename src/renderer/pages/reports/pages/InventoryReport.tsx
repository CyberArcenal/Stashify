// components/InventoryReportPage.tsx
import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  Filter,
  Package,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ChevronDown,
  X,
  Eye,
  Percent,
  Calendar,
  DollarSign,
  Layers,
  Warehouse,
  TrendingDown,
  ArrowUpRight,
  ChevronRight,
  Box,
  FileText,
  Activity,
  Target,
} from "lucide-react";
import inventoryReportAPI, {
  InventoryReportData,
  InventorySummary,
  PerformanceMetrics,
} from "@/renderer/api/inventoryReport";
import { useNavigate } from "react-router-dom";
import {
  inventoryExportAPI,
  InventoryExportParams,
} from "@/renderer/api/exports/inventory";
import { formatCurrency } from "@/renderer/utils/formatters";
import { dialogs } from "@/renderer/utils/dialogs";
import { showApiError, showSuccess } from "@/renderer/utils/notification";

const InventoryReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<
    "3months" | "6months" | "1year" | "custom"
  >("6months");
  const [reportData, setReportData] = useState<InventoryReportData | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "stock" | "analysis">(
    "overview",
  );

  // Fetch inventory data
  const fetchInventoryData = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const params = { period: dateRange };

      const data = await inventoryReportAPI.getInventoryReport(params); // Use this in production

      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory data");
      console.error("Error fetching inventory data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Enhanced export function using inventoryExportAPI
  const handleExport = async () => {
    if (!reportData) {
      await dialogs.warning("No report data available to export.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Inventory Report",
      message: `Are you sure you want to export this report in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      setExportLoading(true);
      setError(null);

      // Prepare export parameters
      const exportParams: InventoryExportParams = {
        format: exportFormat,
        period:
          dateRange === "3months"
            ? "3months"
            : dateRange === "6months"
              ? "6months"
              : dateRange === "1year"
                ? "1year"
                : "custom",
        group_by: "month",
      };

      // Add date range if custom
      if (dateRange === "custom" && reportData?.dateRange) {
        exportParams.start_date = reportData.dateRange.startDate;
        exportParams.end_date = reportData.dateRange.endDate;
      }

      // Validate parameters
      const validationErrors =
        inventoryExportAPI.validateExportParams(exportParams);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        return;
      }

      // Export using the enhanced API
      await inventoryExportAPI.exportInventory(exportParams);
      showSuccess("Inventory report exported successfully");
    } catch (err: any) {
      console.error("Error exporting report:", err);
      showApiError(err?.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchInventoryData(true);
  };

  // Fetch data when dateRange changes
  useEffect(() => {
    fetchInventoryData();
  }, [dateRange]);

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
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {entry.dataKey === "stockValue" ||
              entry.dataKey === "currentValue"
                ? formatCurrency(entry.value)
                : entry.value}
              {entry.dataKey === "stock" && " units"}
              {entry.dataKey === "value" && " items"}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
  const PieChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            {data.name}
          </p>
          <p className="text-sm" style={{ color: data.color }}>
            Stock: {data.value} items
          </p>
          <p className="text-sm" style={{ color: data.color }}>
            Value: {formatCurrency(data.stockValue)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="compact-card rounded-lg transition-all duration-300 ease-in-out"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex justify-center items-center h-48">
          <div className="text-center">
            <div
              className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3 transition-colors duration-300"
              style={{ borderColor: "var(--primary-color)" }}
            ></div>
            <p
              className="text-sm transition-colors duration-300"
              style={{ color: "var(--sidebar-text)" }}
            >
              Loading inventory report...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="compact-card rounded-lg transition-all duration-300 ease-in-out"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          className="text-center p-6 transition-colors duration-300"
          style={{ color: "var(--danger-color)" }}
        >
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 transition-colors duration-300" />
          <p className="text-base font-semibold mb-1 transition-colors duration-300">
            Error Loading Report
          </p>
          <p className="text-sm mb-3 transition-colors duration-300">{error}</p>
          <button
            onClick={() => fetchInventoryData()}
            className="btn btn-primary btn-sm rounded-md flex items-center mx-auto transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
          >
            <RefreshCw className="icon-sm mr-1" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!reportData) {
    return (
      <div
        className="compact-card rounded-lg transition-all duration-300 ease-in-out"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          className="text-center p-6 transition-colors duration-300"
          style={{ color: "var(--sidebar-text)" }}
        >
          <Package className="w-12 h-12 mx-auto mb-3 transition-colors duration-300" />
          <p className="text-sm">No inventory data available.</p>
        </div>
      </div>
    );
  }

  const {
    summary,
    performanceMetrics,
    stockByCategory,
    lowStockProducts,
    stockMovements,
    metadata,
  } = reportData;

  return (
    <div className="space-y-4 transition-all duration-300 ease-in-out">
      {/* Page Header */}
      <div
        className="compact-card rounded-lg transition-all duration-300 ease-in-out"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="flex justify-between items-center p-4">
          <div className="transition-colors duration-300">
            <h2
              className="text-lg font-semibold flex items-center gap-1.5 transition-colors duration-300"
              style={{ color: "var(--sidebar-text)" }}
            >
              <div
                className="w-1.5 h-5 rounded-full transition-colors duration-300"
                style={{ backgroundColor: "var(--accent-green)" }}
              ></div>
              Inventory Analytics
            </h2>
            <p
              className="text-xs transition-colors duration-300"
              style={{ color: "var(--text-secondary)" }}
            >
              {reportData.dateRange.startDate} to {reportData.dateRange.endDate}
            </p>
          </div>
          <div className="flex items-center gap-2 transition-colors duration-300">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary btn-sm rounded-md flex items-center transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
              style={{
                backgroundColor: showFilters
                  ? "var(--accent-blue)"
                  : "var(--card-secondary-bg)",
              }}
            >
              <Filter className="icon-sm mr-1" />
              Filters
              {showFilters && <X className="icon-sm ml-1" />}
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary btn-sm rounded-md flex items-center transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw
                className={`icon-sm mr-1 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {/* Enhanced Export Section */}
            <div
              className="flex items-center gap-1 rounded-md px-2"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                borderWidth: "1px",
              }}
            >
              <label
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: "var(--text-secondary)" }}
              >
                Export as:
              </label>
              <select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as "csv" | "excel" | "pdf")
                }
                className="compact-input border-0 text-sm font-medium focus:ring-0 cursor-pointer px-1 py-1"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  color: "var(--sidebar-text)",
                }}
                disabled={exportLoading}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
              <button
                onClick={handleExport}
                disabled={exportLoading || !reportData}
                className="btn btn-primary btn-sm rounded-md flex items-center transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: exportLoading
                    ? "var(--secondary-color)"
                    : "var(--accent-green)",
                }}
              >
                <Download className="icon-sm mr-1" />
                {exportLoading ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div
            className="compact-card rounded-md m-4 p-3 transition-all duration-200"
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
                Report Filters
              </h4>
              <button
                onClick={() => setShowFilters(false)}
                className="text-xs compact-button flex items-center gap-1 transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  backgroundColor: "var(--card-bg)",
                }}
              >
                <X className="icon-xs" />
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="compact-input w-full rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  View Mode
                </label>
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as any)}
                  className="compact-input w-full rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <option value="overview">Overview</option>
                  <option value="stock">Stock Details</option>
                  <option value="analysis">Analysis</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) =>
                    setExportFormat(e.target.value as "csv" | "excel" | "pdf")
                  }
                  className="compact-input w-full rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div
        className="compact-card rounded-lg transition-all duration-300 ease-in-out"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div
          className="flex border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "overview" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "overview"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "overview"
                  ? "var(--primary-color)"
                  : "transparent",
            }}
          >
            <BarChart3 className="icon-sm mr-1 inline-block" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "stock" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "stock"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "stock" ? "var(--primary-color)" : "transparent",
            }}
          >
            <Package className="icon-sm mr-1 inline-block" />
            Stock Details
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "analysis" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "analysis"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "analysis"
                  ? "var(--primary-color)"
                  : "transparent",
            }}
          >
            <Activity className="icon-sm mr-1 inline-block" />
            Analysis
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 ease-in-out">
            {/* Total Products Card */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-3 transition-colors duration-300">
                <div
                  className="p-2 rounded-lg transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-sm"
                  style={{ background: "var(--accent-blue-dark)" }}
                >
                  <Package
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-blue)" }}
                  />
                </div>
                <div
                  className="text-xs px-1.5 py-0.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--accent-blue-light)",
                    color: "var(--accent-blue)",
                  }}
                >
                  {summary.totalCategories} categories
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {summary.totalProducts}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Products
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Categories: {summary.totalCategories}
                </div>
              </div>
            </div>

            {/* Total Stock Card */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-3 transition-colors duration-300">
                <div
                  className="p-2 rounded-lg transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-sm"
                  style={{ background: "var(--accent-green-dark)" }}
                >
                  <Warehouse
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-green)" }}
                  />
                </div>
                <div
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${summary.growthRate >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                >
                  {summary.growthRate >= 0 ? (
                    <TrendingUp className="icon-xs mr-0.5" />
                  ) : (
                    <TrendingDown className="icon-xs mr-0.5" />
                  )}
                  {summary.growthRate >= 0 ? "+" : ""}
                  {summary.growthRate}%
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-green)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {summary.totalStock}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Stock
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <TrendingUp className="inline-block w-2.5 h-2.5 mr-0.5" />
                  Growth: {summary.growthRate}%
                </div>
              </div>
            </div>

            {/* Low Stock Items Card */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-3 transition-colors duration-300">
                <div
                  className="p-2 rounded-lg transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-sm"
                  style={{ background: "var(--accent-red-dark)" }}
                >
                  <AlertTriangle
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-red)" }}
                  />
                </div>
                <div
                  className="text-xs px-1.5 py-0.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--accent-red-light)",
                    color: "var(--accent-red)",
                  }}
                >
                  Needs attention
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-red)]"
                style={{ color: "var(--accent-red)" }}
              >
                {summary.lowStockCount}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Low Stock Items
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <button
                  onClick={() => navigate("/products/low-stock")}
                  className="text-xs font-medium hover:underline flex items-center transition-all duration-200 ease-in-out"
                  style={{ color: "var(--primary-color)" }}
                >
                  <Eye className="icon-xs mr-1" />
                  View all low stock
                </button>
              </div>
            </div>

            {/* Stock Value Card */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-3 transition-colors duration-300">
                <div
                  className="p-2 rounded-lg transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-sm"
                  style={{ background: "var(--accent-purple-dark)" }}
                >
                  <DollarSign
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-purple)" }}
                  />
                </div>
                <div
                  className="text-xs px-1.5 py-0.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--accent-purple-light)",
                    color: "var(--accent-purple)",
                  }}
                >
                  Total Value
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-purple)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(summary.totalStockValue)}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Stock Value
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Turnover: {summary.stockTurnoverRate}x
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
            {/* Stock by Category */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <PieChart className="icon-sm" />
                Stock by Category
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stockByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} (${((percent as number) * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stockByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieChartTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top Low Stock Products */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <AlertTriangle className="icon-sm" />
                Low Stock Products
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lowStockProducts}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke="var(--sidebar-text)" fontSize={11} />
                  <Tooltip
                    content={<CustomTooltip />}
                    formatter={(value, name) => {
                      if (name === "Current Value")
                        return [formatCurrency(Number(value)), name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="stock"
                    name="Current Stock"
                    fill="var(--accent-orange)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="reorderLevel"
                    name="Reorder Level"
                    fill="var(--sidebar-text)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stock Movements - Full Width */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md lg:col-span-2"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <TrendingUp className="icon-sm" />
                Stock Movements (In vs Out)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stockMovements}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                  />
                  <YAxis stroke="var(--sidebar-text)" fontSize={11} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="stockIn"
                    name="Stock In"
                    stroke="var(--accent-blue)"
                    strokeWidth={2}
                    dot={{ fill: "var(--accent-blue)", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stockOut"
                    name="Stock Out"
                    stroke="var(--sidebar-text)"
                    strokeWidth={2}
                    dot={{ fill: "var(--sidebar-text)", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netChange"
                    name="Net Change"
                    stroke="var(--accent-orange)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "var(--accent-orange)", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-4 transition-colors duration-300">
                <h3
                  className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)]"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Target className="icon-sm transition-colors duration-300" />
                  Performance Metrics
                </h3>
              </div>
              <div className="space-y-3 transition-colors duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Highest Category
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {performanceMetrics.highestStockCategory}
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Stock Count
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {performanceMetrics.highestStockCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Highest Value
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-purple)" }}
                    >
                      {formatCurrency(performanceMetrics.highestStockValue)}
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Avg. Value
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-purple)" }}
                    >
                      {formatCurrency(performanceMetrics.averageStockValue)}
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Stock Turnover Rate
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {performanceMetrics.stockTurnoverRate}x
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-4 transition-colors duration-300">
                <h3
                  className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-green)]"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Layers className="icon-sm transition-colors duration-300" />
                  Inventory Summary
                </h3>
              </div>
              <div className="space-y-2 transition-colors duration-300">
                {[
                  {
                    label: "Total Products",
                    value: summary.totalProducts,
                    color: "var(--accent-blue)",
                  },
                  {
                    label: "Total Categories",
                    value: summary.totalCategories,
                    color: "var(--accent-blue)",
                  },
                  {
                    label: "Total Stock",
                    value: summary.totalStock,
                    color: "var(--accent-green)",
                  },
                  {
                    label: "Low Stock Items",
                    value: summary.lowStockCount,
                    color: "var(--accent-red)",
                  },
                  {
                    label: "Growth Rate",
                    value: `${summary.growthRate}%`,
                    color:
                      summary.growthRate >= 0
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-1.5 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] group/item"
                  >
                    <span
                      className="text-xs transition-colors duration-300"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="text-xs font-medium transition-colors duration-300"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Stock Details Tab */}
      {activeTab === "stock" && (
        <>
          {/* Low Stock Products Table */}
          <div
            className="compact-card rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="p-4">
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <AlertTriangle className="icon-sm" />
                Low Stock Products
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                    >
                      <th
                        className="text-left p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Product
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Category
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Current Stock
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Reorder Level
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Stock Value
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Status
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map((product, index) => (
                      <tr
                        key={index}
                        className="hover:bg-[var(--card-secondary-bg)] transition-colors duration-150"
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <td
                          className="p-3 font-medium text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {product.name}
                          {(product.variantId || product.productId) && (
                            <div className="text-xs text-gray-500">
                              ID: {product.productId}
                              {product.variantId ? `-${product.variantId}` : ""}
                            </div>
                          )}
                        </td>
                        <td
                          className="p-3 text-right text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {product.category}
                        </td>
                        <td
                          className="p-3 text-right font-medium text-sm"
                          style={{ color: "var(--accent-orange)" }}
                        >
                          {product.stock}
                        </td>
                        <td
                          className="p-3 text-right text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {product.reorderLevel}
                        </td>
                        <td
                          className="p-3 text-right font-medium text-sm"
                          style={{ color: "var(--accent-purple)" }}
                        >
                          {formatCurrency(product.currentValue)}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor:
                                product.stock <= product.reorderLevel * 0.5
                                  ? "var(--accent-red-light)"
                                  : "var(--accent-yellow-light)",
                              color:
                                product.stock <= product.reorderLevel * 0.5
                                  ? "var(--accent-red)"
                                  : "var(--accent-yellow)",
                            }}
                          >
                            {product.stock <= product.reorderLevel * 0.5
                              ? "Critical"
                              : "Low"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() =>
                              navigate(`/products/${product.productId}`)
                            }
                            className="text-xs px-2 py-1 rounded-md hover:underline transition-all duration-200"
                            style={{
                              color: "var(--primary-color)",
                              backgroundColor: "var(--card-secondary-bg)",
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Stock By Category Details */}
          <div
            className="compact-card rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="p-4">
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Package className="icon-sm" />
                Category Stock Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stockByCategory.map((category, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span
                          className="font-medium text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {category.name}
                        </span>
                      </div>
                      <div
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: category.color + "20",
                          color: category.color,
                        }}
                      >
                        {((category.value / summary.totalStock) * 100).toFixed(
                          1,
                        )}
                        %
                      </div>
                    </div>
                    <div
                      className="text-lg font-bold mb-1"
                      style={{ color: category.color }}
                    >
                      {category.value} items
                    </div>
                    <div
                      className="text-sm mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Value: {formatCurrency(category.stockValue)}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-secondary)" }}>
                        Average per item:
                      </span>
                      <span
                        className="font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {formatCurrency(category.stockValue / category.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Analysis Tab */}
      {activeTab === "analysis" && (
        <>
          {/* Business Analysis */}
          <div
            className="compact-card rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="p-4">
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Activity className="icon-sm" />
                Inventory Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Stock Health
                  </div>
                  <div
                    className={`text-base font-bold mb-1 ${summary.lowStockCount === 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-orange)]"}`}
                  >
                    {summary.lowStockCount === 0
                      ? "Healthy"
                      : "Needs Attention"}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {summary.lowStockCount} items below reorder level
                  </div>
                </div>
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Turnover Efficiency
                  </div>
                  <div
                    className="text-base font-bold mb-1"
                    style={{
                      color:
                        summary.stockTurnoverRate > 1
                          ? "var(--accent-green)"
                          : "var(--accent-orange)",
                    }}
                  >
                    {summary.stockTurnoverRate}x
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {summary.stockTurnoverRate > 1
                      ? "Good turnover"
                      : "Low turnover"}
                  </div>
                </div>
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Stock Growth
                  </div>
                  <div
                    className={`text-base font-bold mb-1 ${summary.growthRate >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                  >
                    {summary.growthRate >= 0 ? "+" : ""}
                    {summary.growthRate}%
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Compared to last period
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div
            className="compact-card rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="p-4">
              <h3
                className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Target className="icon-sm" />
                Performance Insights
              </h3>
              <div className="space-y-3">
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="font-medium text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Highest Value Category
                    </div>
                    <div
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--accent-purple-light)",
                        color: "var(--accent-purple)",
                      }}
                    >
                      Top Performer
                    </div>
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {performanceMetrics.highestStockCategory} has the highest
                    stock value of{" "}
                    {formatCurrency(performanceMetrics.highestStockValue)}
                  </div>
                </div>
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ border: "1px solid var(--border-color)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="font-medium text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Stock Turnover Analysis
                    </div>
                    <div
                      className={`text-xs px-1.5 py-0.5 rounded-full ${performanceMetrics.stockTurnoverRate > 1 ? "bg-[var(--accent-green-light)] text-[var(--accent-green)]" : "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]"}`}
                    >
                      {performanceMetrics.stockTurnoverRate > 1
                        ? "Good"
                        : "Low"}
                    </div>
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Turnover rate of {performanceMetrics.stockTurnoverRate}x
                    indicates{" "}
                    {performanceMetrics.stockTurnoverRate > 1
                      ? "efficient"
                      : "slow"}{" "}
                    inventory movement
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          {metadata && (
            <div
              className="compact-card rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="p-4">
                <h3
                  className="font-semibold mb-4 text-sm flex items-center gap-1.5"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <FileText className="icon-sm" />
                  Report Metadata
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Generated At
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {new Date(metadata.generatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Categories
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {metadata.totalCategories}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Low Stock Count
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {metadata.lowStockCount}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Movements
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {metadata.totalMovements}
                    </div>
                  </div>
                </div>
                <div
                  className="mt-3 pt-3"
                  style={{ borderTop: "1px solid var(--border-color)" }}
                >
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Filters Applied:
                  </div>
                  <div
                    className="text-xs font-medium mt-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Period: {metadata.filtersApplied.period}, Group by:{" "}
                    {metadata.filtersApplied.group_by}, Low stock only:{" "}
                    {metadata.filtersApplied.low_stock_only ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div
        className="compact-card rounded-lg transition-all duration-300 ease-in-out"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        <div className="p-4">
          <div className="flex justify-between items-center">
            <div
              className="text-xs flex items-center gap-2"
              style={{ color: "var(--text-secondary)" }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--accent-green)" }}
              ></div>
              Report generated: {new Date().toLocaleDateString("en-PH")}
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Data period: {reportData.dateRange.startDate} to{" "}
              {reportData.dateRange.endDate}
            </div>
          </div>
          {summary.lowStockCount > 0 && (
            <div
              className="mt-2 text-xs p-2 rounded-md"
              style={{
                backgroundColor: "var(--accent-orange-light)",
                color: "var(--accent-orange)",
              }}
            >
              ⚠️ {summary.lowStockCount} products need reordering. Check the low
              stock section.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryReportPage;
