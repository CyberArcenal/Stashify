// components/ProfitLossReportPage.tsx
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Filter,
  RefreshCw,
  ChevronDown,
  X,
  Eye,
  Percent,
  Calendar,
  Users,
  Package,
  FileText,
  Activity,
  Target,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  PieChart as PieChartIcon,
  Layers,
} from "lucide-react";
import type { ProfitLossReportData } from "../../../api/analytics/profitLoss";
import profitLossAPI from "../../../api/analytics/profitLoss";
import { dialogs } from "../../../utils/dialogs";
import {
  profitLossExportAPI,
  type ProfitLossExportParams,
} from "../../../api/exports/profitLoss";
import { showApiError, showSuccess } from "../../../utils/notification";
import { formatCurrency } from "../../../utils/formatters";

// Color palettes using CSS variables
const COLORS = [
  "var(--primary-color)",
  "var(--sidebar-text)",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
];
const CHART_COLORS = {
  revenue: "var(--primary-color)",
  expenses: "#FF8042",
  netProfit: "var(--sidebar-text)",
  cogs: "#FFBB28",
  operatingExpenses: "#8884D8",
  grossProfit: "var(--accent-emerald)",
};

const ProfitLossReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<
    "3months" | "6months" | "1year" | "custom"
  >("1year");
  const [reportData, setReportData] = useState<ProfitLossReportData | null>(
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "details" | "analysis"
  >("overview");

  // Fetch profit loss data
  const fetchProfitLossData = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const params = { period: dateRange };

      // Use mock data for development, switch to real API in production
      const data = await profitLossAPI.getProfitLossReport(params);

      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch profit & loss data");
      console.error("Error fetching profit loss data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Enhanced export function using profitLossExportAPI
  const handleExport = async () => {
    if (!reportData) {
      await dialogs.warning("No report data available to export.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Profit/Loss Report",
      message: `Are you sure you want to export this report in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      setExportLoading(true);
      setError(null);

      // Prepare export parameters
      const exportParams: ProfitLossExportParams = {
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
        profitLossExportAPI.validateExportParams(exportParams);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        return;
      }

      // Export using the enhanced API
      await profitLossExportAPI.exportProfitLoss(exportParams);
      showSuccess("Profit/Loss report exported successfully");
    } catch (err: any) {
      console.error("Error exporting report:", err);
      showApiError(err?.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchProfitLossData(true);
  };

  // Fetch data when dateRange changes
  useEffect(() => {
    fetchProfitLossData();
  }, [dateRange]);

  // Calculate values from report data
  const calculateValues = (data: ProfitLossReportData) => {
    const { summary, profitLossByMonth, expenseBreakdown } = data;

    // Prepare chart data
    const chartData = profitLossByMonth.map((row) => {
      const netProfit =
        row.netProfit ||
        profitLossAPI.calculateNetProfit(
          row.revenue,
          row.costOfGoodsSold,
          row.operatingExpenses,
        );
      const totalExpenses = row.costOfGoodsSold + row.operatingExpenses;
      const profitMargin =
        row.profitMargin ||
        profitLossAPI.calculateProfitMargin(row.revenue, netProfit);
      const grossProfit =
        row.grossProfit ||
        profitLossAPI.calculateGrossProfit(row.revenue, row.costOfGoodsSold);
      const grossMargin =
        row.grossMargin ||
        profitLossAPI.calculateGrossProfitMargin(row.revenue, grossProfit);

      return {
        month: row.month,
        revenue: row.revenue,
        grossRevenue: row.grossRevenue,
        vatCollected: row.vatCollected,
        costOfGoodsSold: row.costOfGoodsSold,
        operatingExpenses: row.operatingExpenses,
        totalExpenses: totalExpenses,
        grossProfit: grossProfit,
        netProfit: netProfit,
        profitMargin: profitMargin,
        grossMargin: grossMargin,
      };
    });

    // Enhanced expense breakdown
    const enhancedExpenseBreakdown = expenseBreakdown.map((item) => ({
      name: item.category,
      value: item.amount,
      percentage: item.percentage,
      asPercentOfRevenue: item.asPercentOfRevenue,
      description: item.description,
    }));

    return { chartData, expenseBreakdown: enhancedExpenseBreakdown };
  };

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
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
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
              Loading profit & loss report...
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
            onClick={() => fetchProfitLossData()}
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
          <BarChart3 className="w-12 h-12 mx-auto mb-3 transition-colors duration-300" />
          <p className="text-sm">No profit & loss data available.</p>
        </div>
      </div>
    );
  }

  const {
    summary,
    performanceMetrics,
    profitLossByMonth,
    expenseBreakdown,
    profitLossTrend,
    metadata,
  } = reportData;
  const { chartData, expenseBreakdown: enhancedExpenseBreakdown } =
    calculateValues(reportData);

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
                style={{ backgroundColor: "var(--accent-purple)" }}
              ></div>
              Profit & Loss Report
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
                  <option value="details">Details</option>
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
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "details" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "details"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "details"
                  ? "var(--primary-color)"
                  : "transparent",
            }}
          >
            <FileText className="icon-sm mr-1 inline-block" />
            Detailed View
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
            {/* Total Revenue Card */}
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
                  <DollarSign
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-blue)" }}
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
                  {summary.growthRate.toFixed(1)}%
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(summary.totalRevenue)}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Revenue
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Gross Revenue:{" "}
                  {formatCurrency(
                    summary.grossProfit + summary.totalCostOfGoodsSold,
                  )}
                </div>
              </div>
            </div>

            {/* Gross Profit Card */}
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
                  style={{ background: "var(--accent-emerald-dark)" }}
                >
                  <TrendingUp
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-emerald)" }}
                  />
                </div>
                <div
                  className="text-xs px-1.5 py-0.5 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: "var(--accent-emerald-light)",
                    color: "var(--accent-emerald)",
                  }}
                >
                  Gross
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-emerald)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(summary.grossProfit)}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Gross Profit
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Percent className="inline-block w-2.5 h-2.5 mr-0.5" />
                  Margin:{" "}
                  {((summary.grossProfit / summary.totalRevenue) * 100).toFixed(
                    1,
                  )}
                  %
                </div>
              </div>
            </div>

            {/* Net Profit Card */}
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
                  style={{
                    background:
                      summary.netProfit >= 0
                        ? "var(--accent-green-dark)"
                        : "var(--accent-red-dark)",
                  }}
                >
                  {summary.netProfit >= 0 ? (
                    <TrendingUp
                      className="icon-lg transition-colors duration-300"
                      style={{ color: "var(--accent-green)" }}
                    />
                  ) : (
                    <TrendingDown
                      className="icon-lg transition-colors duration-300"
                      style={{ color: "var(--accent-red)" }}
                    />
                  )}
                </div>
                <div
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${summary.netProfit >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                >
                  {summary.netProfit >= 0 ? (
                    <TrendingUp className="icon-xs mr-0.5" />
                  ) : (
                    <TrendingDown className="icon-xs mr-0.5" />
                  )}
                  {summary.profitMargin.toFixed(1)}%
                </div>
              </div>
              <h3
                className={`text-xl font-bold mb-0.5 transition-colors duration-300 ${summary.netProfit >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
              >
                {formatCurrency(summary.netProfit)}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Net Profit
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className={`text-xs transition-colors duration-300 ${summary.netProfit >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                >
                  {summary.netProfit >= 0 ? "Profit" : "Loss"}:{" "}
                  {summary.profitMargin.toFixed(1)}% margin
                </div>
              </div>
            </div>

            {/* Profit Margin Card */}
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
                  <Percent
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-purple)" }}
                  />
                </div>
                <div
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${summary.profitMargin >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                >
                  Industry: 15.2%
                </div>
              </div>
              <h3
                className={`text-xl font-bold mb-0.5 transition-colors duration-300 ${summary.profitMargin >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
              >
                {summary.profitMargin.toFixed(1)}%
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Profit Margin
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {summary.profitMargin >= 0
                    ? "✓ Profitable"
                    : "⚠️ Loss-making"}
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
            {/* Net Profit Trend */}
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
                <TrendingUp className="icon-sm" />
                Net Profit Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                    tickFormatter={(value) => `₱${value / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="netProfit"
                    name="Net Profit"
                    stroke={CHART_COLORS.netProfit}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.netProfit, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue vs Expenses */}
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
                <BarChart3 className="icon-sm" />
                Revenue vs Expenses
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                    tickFormatter={(value) => `₱${value / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill={CHART_COLORS.revenue}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="totalExpenses"
                    name="Total Expenses"
                    fill={CHART_COLORS.expenses}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Expense Breakdown */}
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
                <PieChartIcon className="icon-sm" />
                Expense Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={enhancedExpenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, payload }) =>
                      `${name} (${payload?.percentage.toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {enhancedExpenseBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => {
                      const item = props.payload;
                      return [
                        <div key="tooltip">
                          <p className="font-semibold">{item.name}</p>
                          <p>Amount: {formatCurrency(Number(value))}</p>
                          <p>Percentage: {item.percentage}%</p>
                          <p>Revenue Ratio: {item.asPercentOfRevenue}%</p>
                          {item.description && (
                            <p className="text-xs opacity-75">
                              {item.description}
                            </p>
                          )}
                        </div>,
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Margin Trend */}
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
                <Activity className="icon-sm" />
                Profit Margin Trend
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                  />
                  <YAxis
                    stroke="var(--sidebar-text)"
                    fontSize={11}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toFixed(1)}%`,
                      "Profit Margin",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="profitMargin"
                    name="Profit Margin"
                    stroke="#8884D8"
                    strokeWidth={2}
                    dot={{ fill: "#8884D8", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Metrics */}
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
                  className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-purple)]"
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
                      Best Month
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {performanceMetrics.bestMonth}
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Worst Month
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-red)" }}
                    >
                      {performanceMetrics.worstMonth}
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Highest Margin
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {performanceMetrics.highestMargin.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Lowest Margin
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-red)" }}
                    >
                      {performanceMetrics.lowestMargin.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                  <div className="flex justify-between items-center">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Months Analyzed
                    </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {performanceMetrics.totalMonths ||
                        profitLossByMonth.length}
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
                  className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)]"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Layers className="icon-sm transition-colors duration-300" />
                  Financial Summary
                </h3>
              </div>
              <div className="space-y-2 transition-colors duration-300">
                {[
                  {
                    label: "Total COGS",
                    value: formatCurrency(summary.totalCostOfGoodsSold),
                    color: "var(--accent-orange)",
                  },
                  {
                    label: "Operating Expenses",
                    value: formatCurrency(summary.totalOperatingExpenses),
                    color: "var(--accent-orange)",
                  },
                  {
                    label: "Total Expenses",
                    value: formatCurrency(summary.totalExpenses),
                    color: "var(--accent-orange)",
                  },
                  {
                    label: "Gross Profit",
                    value: formatCurrency(summary.grossProfit),
                    color: "var(--accent-emerald)",
                  },
                  {
                    label: "Growth Rate",
                    value: `${summary.growthRate.toFixed(1)}%`,
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

      {/* Details Tab */}
      {activeTab === "details" && (
        <>
          {/* Detailed Table */}
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
                Detailed Profit & Loss Statement
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
                        Month
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Revenue
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Gross Rev
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        VAT
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        COGS
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Op. Expenses
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Gross Profit
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Net Profit
                      </th>
                      <th
                        className="text-right p-3 text-xs font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, index) => (
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
                          {row.month}
                        </td>
                        <td
                          className="p-3 text-right font-medium text-sm"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          {formatCurrency(row.revenue)}
                        </td>
                        <td
                          className="p-3 text-right text-sm"
                          style={{ color: "var(--accent-blue-light)" }}
                        >
                          {row.grossRevenue
                            ? formatCurrency(row.grossRevenue)
                            : "-"}
                        </td>
                        <td
                          className="p-3 text-right text-sm"
                          style={{ color: "var(--accent-yellow)" }}
                        >
                          {row.vatCollected
                            ? formatCurrency(row.vatCollected)
                            : "-"}
                        </td>
                        <td
                          className="p-3 text-right text-sm"
                          style={{ color: "var(--accent-orange)" }}
                        >
                          {formatCurrency(row.costOfGoodsSold)}
                        </td>
                        <td
                          className="p-3 text-right text-sm"
                          style={{ color: "var(--accent-orange)" }}
                        >
                          {formatCurrency(row.operatingExpenses)}
                        </td>
                        <td
                          className="p-3 text-right font-medium text-sm"
                          style={{ color: "var(--accent-emerald)" }}
                        >
                          {formatCurrency(row.grossProfit)}
                        </td>
                        <td
                          className={`p-3 text-right font-medium text-sm ${
                            row.netProfit >= 0
                              ? "text-[var(--accent-green)]"
                              : "text-[var(--accent-red)]"
                          }`}
                        >
                          {formatCurrency(row.netProfit)}
                        </td>
                        <td
                          className={`p-3 text-right text-sm ${
                            row.profitMargin >= 0
                              ? "text-[var(--accent-green)]"
                              : "text-[var(--accent-red)]"
                          }`}
                        >
                          {row.profitMargin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Table Footer with Totals */}
                  <tfoot>
                    <tr
                      className="bg-[var(--card-secondary-bg)]"
                      style={{ borderTop: "2px solid var(--border-color)" }}
                    >
                      <td
                        className="p-3 font-bold text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        TOTAL
                      </td>
                      <td
                        className="p-3 text-right font-bold text-sm"
                        style={{ color: "var(--accent-blue)" }}
                      >
                        {formatCurrency(summary.totalRevenue)}
                      </td>
                      <td
                        className="p-3 text-right font-bold text-sm"
                        style={{ color: "var(--accent-blue-light)" }}
                      >
                        {formatCurrency(
                          summary.totalRevenue +
                            profitLossByMonth.reduce(
                              (acc, row) => acc + (row.vatCollected || 0),
                              0,
                            ),
                        )}
                      </td>
                      <td
                        className="p-3 text-right font-bold text-sm"
                        style={{ color: "var(--accent-yellow)" }}
                      >
                        {formatCurrency(
                          profitLossByMonth.reduce(
                            (acc, row) => acc + (row.vatCollected || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td
                        className="p-3 text-right font-bold text-sm"
                        style={{ color: "var(--accent-orange)" }}
                      >
                        {formatCurrency(summary.totalCostOfGoodsSold)}
                      </td>
                      <td
                        className="p-3 text-right font-bold text-sm"
                        style={{ color: "var(--accent-orange)" }}
                      >
                        {formatCurrency(summary.totalOperatingExpenses)}
                      </td>
                      <td
                        className="p-3 text-right font-bold text-sm"
                        style={{ color: "var(--accent-emerald)" }}
                      >
                        {formatCurrency(summary.grossProfit)}
                      </td>
                      <td
                        className={`p-3 text-right font-bold text-sm ${
                          summary.netProfit >= 0
                            ? "text-[var(--accent-green)]"
                            : "text-[var(--accent-red)]"
                        }`}
                      >
                        {formatCurrency(summary.netProfit)}
                      </td>
                      <td
                        className={`p-3 text-right font-bold text-sm ${
                          summary.profitMargin >= 0
                            ? "text-[var(--accent-green)]"
                            : "text-[var(--accent-red)]"
                        }`}
                      >
                        {summary.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Expense Breakdown Details */}
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
                Expense Breakdown Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {enhancedExpenseBreakdown.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                    style={{ border: "1px solid var(--border-color)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></div>
                        <span
                          className="font-medium text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length] + "20",
                          color: COLORS[index % COLORS.length],
                        }}
                      >
                        {item.percentage}%
                      </div>
                    </div>
                    <div
                      className="text-lg font-bold mb-1"
                      style={{ color: COLORS[index % COLORS.length] }}
                    >
                      {formatCurrency(item.value)}
                    </div>
                    <div
                      className="text-xs mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.description || "Business expense category"}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-secondary)" }}>
                        Revenue Ratio:
                      </span>
                      <span
                        className="font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {item.asPercentOfRevenue || "N/A"}%
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
                Business Analysis
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
                    Profitability Status
                  </div>
                  <div
                    className={`text-base font-bold mb-1 ${summary.netProfit >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                  >
                    {summary.netProfit >= 0 ? "Profitable" : "Loss-making"}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {summary.netProfit >= 0
                      ? `Profit margin: ${summary.profitMargin.toFixed(1)}%`
                      : `Loss margin: ${Math.abs(summary.profitMargin).toFixed(1)}%`}
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
                    Expense Efficiency
                  </div>
                  <div
                    className="text-base font-bold mb-1"
                    style={{ color: "var(--accent-orange)" }}
                  >
                    {(
                      (summary.totalExpenses / summary.totalRevenue) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Expenses to Revenue Ratio
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
                    Growth Rate
                  </div>
                  <div
                    className={`text-base font-bold mb-1 ${summary.growthRate >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                  >
                    {summary.growthRate >= 0 ? "+" : ""}
                    {summary.growthRate.toFixed(1)}%
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {summary.growthRateMethod || "Standard calculation"}
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
                      Best Performing Month
                    </div>
                    <div
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--accent-green-light)",
                        color: "var(--accent-green)",
                      }}
                    >
                      Recommended
                    </div>
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {performanceMetrics.bestMonth} achieved the highest net
                    profit of{" "}
                    {formatCurrency(
                      profitLossByMonth.find(
                        (m) => m.month === performanceMetrics.bestMonth,
                      )?.netProfit || 0,
                    )}
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
                      Areas for Improvement
                    </div>
                    <div
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "var(--accent-red-light)",
                        color: "var(--accent-red)",
                      }}
                    >
                      Attention
                    </div>
                  </div>
                  <div
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {performanceMetrics.worstMonth} recorded the lowest
                    performance. Consider reviewing expenses in this period.
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
                      Formula Version
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {metadata.formulaVersion}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Data Source
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {metadata.dataSource}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Price Methodology
                    </div>
                    <div
                      className="text-sm font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {metadata.priceMethodology}
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
                    Period: {metadata?.filtersApplied?.period}, Group by:{" "}
                    {metadata?.filtersApplied?.group_by}
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
          {summary.growthRateFallbackApplied && (
            <div
              className="mt-2 text-xs p-2 rounded-md"
              style={{
                backgroundColor: "var(--accent-yellow-light)",
                color: "var(--accent-yellow)",
              }}
            >
              Note: Growth rate calculation used fallback method due to zero or
              negative previous period profit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitLossReportPage;
