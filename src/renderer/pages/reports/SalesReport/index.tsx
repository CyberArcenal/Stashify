// components/SalesReport.tsx
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
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Download,
  Filter,
  Calendar,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  Package,
  Target,
  X,
  Percent,
  DollarSign,
  AlertTriangle,
  TrendingDown,
  Clock,
  Layers,
  PieChart as PieChartIcon,
  FileText,
  Activity,
  Users,
  AlertCircle,
  Zap,
} from "lucide-react";
import type {
  SalesReportData,
  SalesReportParams,
} from "../../../api/analytics/salesReport";
import salesReportAPI from "../../../api/analytics/salesReport";
import { dialogs } from "../../../utils/dialogs";
import {
  salesExportAPI,
  type SalesExportParams,
} from "../../../api/exports/sales";
import { showApiError, showSuccess } from "../../../utils/notification";
import { formatCurrency } from "../../../utils/formatters";

// Color palettes using CSS variables
const COLORS = [
  "var(--primary-color)",
  "var(--sidebar-text)",
  "var(--accent-yellow)",
  "var(--accent-orange)",
  "var(--accent-purple)",
  "var(--accent-green)",
  "var(--accent-red)",
  "var(--accent-blue)",
];

const SALES_COLORS = {
  sales: "var(--primary-color)",
  profit: "var(--sidebar-text)",
  target: "var(--accent-orange)",
  orders: "var(--accent-yellow)",
  cogs: "var(--accent-red)",
  revenue: "var(--accent-blue)",
  customers: "var(--accent-purple)",
};

// Default empty data structures
const DEFAULT_REPORT_DATA: Partial<SalesReportData> = {
  salesByMonth: [],
  topProducts: [],
  salesTrend: [],
  salesByCategory: [],
  quickStats: {
    totalSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    growthRate: 0,
    ordersGrowthRate: 0,
    reconciliationStatus: "consistent",
    growthRateMethod: "Standard",
    growthRateFallbackApplied: false,
  },
  performanceMetrics: {
    averageOrderValue: 0,
    conversionRate: 0,
    customerSatisfaction: 0,
    cogsToSalesRatio: 0,
  },
  dateRange: {
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    period: "",
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    formulaVersion: "1.0",
    profitFormulaVersion: "1.0",
    cogsIntegrationStatus: "integrated",
    reconciliationWarnings: [],
    totalMonths: 0,
    totalProducts: 0,
    totalCategories: 0,
  },
};

// Types for safe data handling
interface SafeSalesByMonth {
  month: string;
  sales: number;
  profit: number;
  cogs?: number;
  profitMargin?: number;
}

interface SafeTopProduct {
  name: string;
  revenue: number;
  units: number;
  profit?: number;
  cogs?: number;
  profitMargin?: number;
  category?: string;
}

interface SafeSalesTrend {
  month: string;
  sales: number;
  target: number;
}

interface SafeSalesByCategory {
  category: string;
  sales: number;
  percentage: number;
}

// Safe array access helper
const safeArray = <T,>(arr: T[] | undefined | null): T[] => {
  return Array.isArray(arr) ? arr : [];
};

// Safe number access helper
const safeNumber = (num: number | undefined | null, fallback = 0): number => {
  if (typeof num === "number" && !isNaN(num)) return num;
  return fallback;
};

// Safe string access helper
const safeString = (str: string | undefined | null, fallback = ""): string => {
  return str && typeof str === "string" ? str : fallback;
};

const SalesReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<
    "3months" | "6months" | "1year" | "custom"
  >("6months");
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "categories" | "trends"
  >("overview");

  // Fetch sales data
  const fetchSalesData = async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const params: SalesReportParams = {
        period: dateRange,
        group_by: "month",
      };

      const data = await salesReportAPI.getSalesReport(params);
      setReportData(data);
    } catch (err: any) {
      console.error("Error fetching sales data:", err);
      setError(err.message || "Failed to fetch sales report data");
      setReportData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Enhanced export function
  const handleExport = async () => {
    if (!reportData) {
      await dialogs.warning("No report data available to export.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Sales Report",
      message: `Are you sure you want to export this report in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      setExportLoading(true);
      setError(null);

      const exportParams: SalesExportParams = {
        format: exportFormat,
        period: dateRange,
        group_by: "month",
      };

      if (dateRange === "custom" && reportData?.dateRange) {
        exportParams.start_date = reportData.dateRange.startDate;
        exportParams.end_date = reportData.dateRange.endDate;
      }

      const validationErrors =
        salesExportAPI.validateExportParams(exportParams);
      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        return;
      }

      await salesExportAPI.exportSales(exportParams);
      showSuccess("Sales report exported successfully");
    } catch (err: any) {
      console.error("Error exporting report:", err);
      showApiError(err?.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchSalesData(true);
  };

  useEffect(() => {
    fetchSalesData();
  }, [dateRange]);

  // SAFE calculation of additional metrics
  const calculateAdditionalMetrics = () => {
    if (!reportData) {
      return {
        totalCOGS: 0,
        avgUnitsPerOrder: 0,
        targetAchievementRate: 0,
        bestMonth: "",
        worstMonth: "",
        bestProduct: null as SafeTopProduct | null,
        totalProfitMargin: 0,
        totalRevenue: 0,
        hasData: false,
      };
    }

    // Use safe array helpers
    const salesByMonth = safeArray<SafeSalesByMonth>(reportData.salesByMonth);
    const topProducts = safeArray<SafeTopProduct>(reportData.topProducts);
    const salesTrend = safeArray<SafeSalesTrend>(reportData.salesTrend);
    const quickStats = reportData.quickStats || DEFAULT_REPORT_DATA.quickStats!;

    // 1. Total COGS (safe reduce with initial value)
    const totalCOGS = salesByMonth.reduce((sum, month) => {
      return sum + safeNumber(month.cogs, 0);
    }, 0);

    // 2. Average Units per Order (safe calculation)
    const totalUnits = topProducts.reduce((sum, product) => {
      return sum + safeNumber(product.units, 0);
    }, 0);

    const avgUnitsPerOrder =
      safeNumber(quickStats.totalOrders) > 0
        ? totalUnits / safeNumber(quickStats.totalOrders)
        : 0;

    // 3. Target Achievement Rate (safe with division by zero check)
    let targetAchievementRate = 0;
    const validSalesTrend = salesTrend.filter(
      (trend) => safeNumber(trend.target) > 0,
    );

    if (validSalesTrend.length > 0) {
      const totalAchievement = validSalesTrend.reduce((sum, trend) => {
        const achievement =
          (safeNumber(trend.sales) / safeNumber(trend.target)) * 100;
        return sum + (achievement > 100 ? 100 : achievement);
      }, 0);
      targetAchievementRate = totalAchievement / validSalesTrend.length;
    }

    // 4. Best/Worst Month (safe with null check)
    let bestMonth = "";
    let worstMonth = "";

    if (salesByMonth.length > 0) {
      const monthsWithSales = salesByMonth.filter(
        (month) => !isNaN(safeNumber(month.sales)),
      );

      if (monthsWithSales.length > 0) {
        const best = monthsWithSales.reduce((max, current) =>
          safeNumber(current.sales) > safeNumber(max.sales) ? current : max,
        );
        const worst = monthsWithSales.reduce((min, current) =>
          safeNumber(current.sales) < safeNumber(min.sales) ? current : min,
        );

        bestMonth = safeString(best.month);
        worstMonth = safeString(worst.month);
      }
    }

    // 5. Best Product (safe with null check)
    let bestProduct: SafeTopProduct | null = null;
    const productsWithRevenue = topProducts.filter(
      (product) => safeNumber(product.revenue) > 0,
    );

    if (productsWithRevenue.length > 0) {
      bestProduct = productsWithRevenue.reduce((max, current) =>
        safeNumber(current.revenue) > safeNumber(max.revenue) ? current : max,
      );
    }

    // 6. Total Profit Margin (safe with division by zero check)
    const totalSales = safeNumber(quickStats.totalSales);
    const totalProfit = safeNumber(quickStats.totalProfit);
    const totalProfitMargin =
      totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    // 7. Total Revenue
    const totalRevenue = topProducts.reduce((sum, product) => {
      return sum + safeNumber(product.revenue, 0);
    }, 0);

    return {
      totalCOGS,
      avgUnitsPerOrder: Math.round(avgUnitsPerOrder * 10) / 10,
      targetAchievementRate: Math.round(targetAchievementRate * 10) / 10,
      bestMonth,
      worstMonth,
      bestProduct,
      totalProfitMargin: Math.round(totalProfitMargin * 10) / 10,
      totalRevenue,
      hasData: salesByMonth.length > 0 || topProducts.length > 0,
    };
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="compact-card rounded-md shadow-lg border transition-all duration-200 p-3"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <p
            className="font-semibold text-sm mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            {label}
          </p>
          {payload.map((entry: any, index: number) => {
            let displayValue = entry.value;
            const fieldName = String(entry.name || entry.dataKey).toLowerCase();

            // Format based on field type
            if (
              fieldName.includes("sales") ||
              fieldName.includes("profit") ||
              fieldName.includes("revenue") ||
              fieldName.includes("target") ||
              fieldName.includes("cogs")
            ) {
              displayValue = formatCurrency(entry.value);
            } else if (
              fieldName.includes("percentage") ||
              fieldName.includes("margin")
            ) {
              displayValue = `${entry.value.toFixed(1)}%`;
            }

            return (
              <p
                key={index}
                className="text-sm mb-1"
                style={{ color: entry.color }}
              >
                {entry.name}: {displayValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Get safe data for rendering
  const getSafeData = () => {
    if (!reportData) {
      return {
        salesByMonth: [] as SafeSalesByMonth[],
        topProducts: [] as SafeTopProduct[],
        salesTrend: [] as SafeSalesTrend[],
        salesByCategory: [] as SafeSalesByCategory[],
        quickStats: DEFAULT_REPORT_DATA.quickStats!,
        performanceMetrics: DEFAULT_REPORT_DATA.performanceMetrics!,
        dateRange: DEFAULT_REPORT_DATA.dateRange!,
        metadata: DEFAULT_REPORT_DATA.metadata!,
      };
    }

    return {
      salesByMonth: safeArray<SafeSalesByMonth>(reportData.salesByMonth),
      topProducts: safeArray<SafeTopProduct>(reportData.topProducts),
      salesTrend: safeArray<SafeSalesTrend>(reportData.salesTrend),
      salesByCategory: safeArray<SafeSalesByCategory>(
        reportData.salesByCategory,
      ),
      quickStats: reportData.quickStats || DEFAULT_REPORT_DATA.quickStats!,
      performanceMetrics:
        reportData.performanceMetrics ||
        DEFAULT_REPORT_DATA.performanceMetrics!,
      dateRange: reportData.dateRange || DEFAULT_REPORT_DATA.dateRange!,
      metadata: reportData.metadata || DEFAULT_REPORT_DATA.metadata!,
    };
  };

  // Calculate metrics
  const {
    totalCOGS,
    avgUnitsPerOrder,
    targetAchievementRate,
    bestMonth,
    worstMonth,
    bestProduct,
    totalProfitMargin,
    totalRevenue,
    hasData,
  } = calculateAdditionalMetrics();

  // Get safe data
  const {
    salesByMonth,
    topProducts,
    salesTrend,
    salesByCategory,
    quickStats,
    performanceMetrics,
    dateRange: dataDateRange,
    metadata,
  } = getSafeData();

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
              Loading sales report...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => fetchSalesData()}
            className="btn btn-primary btn-sm rounded-md flex items-center mx-auto transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
          >
            <RefreshCw className="icon-sm mr-1" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData || !hasData) {
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
          <p className="text-sm mb-3">
            No sales report data available for the selected period.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setDateRange("3months")}
              className="btn btn-secondary btn-sm"
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setDateRange("6months")}
              className="btn btn-primary btn-sm"
            >
              Last 6 Months
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                style={{ backgroundColor: "var(--accent-blue)" }}
              ></div>
              Sales Report
            </h2>
            <p
              className="text-xs transition-colors duration-300"
              style={{ color: "var(--text-secondary)" }}
            >
              {dataDateRange.startDate} to {dataDateRange.endDate}
              {metadata && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "var(--card-secondary-bg)",
                    color: "var(--primary-color)",
                  }}
                >
                  v{metadata.formulaVersion}
                </span>
              )}
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

            {/* Export Section */}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                  <Calendar className="inline w-2.5 h-2.5 mr-0.5" />
                  Start Date
                </label>
                <input
                  type="date"
                  className="compact-input w-full rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                  disabled={dateRange !== "custom"}
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Calendar className="inline w-2.5 h-2.5 mr-0.5" />
                  End Date
                </label>
                <input
                  type="date"
                  className="compact-input w-full rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                  disabled={dateRange !== "custom"}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setShowFilters(false);
                    fetchSalesData(true);
                  }}
                  className="compact-button w-full text-[var(--sidebar-text)] transition-all duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                >
                  Apply Filters
                </button>
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
            onClick={() => setActiveTab("products")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "products" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "products"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "products"
                  ? "var(--primary-color)"
                  : "transparent",
            }}
          >
            <Package className="icon-sm mr-1 inline-block" />
            Products
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "categories" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "categories"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "categories"
                  ? "var(--primary-color)"
                  : "transparent",
            }}
          >
            <Layers className="icon-sm mr-1 inline-block" />
            Categories
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`flex-1 py-3 text-sm font-medium transition-colors duration-200 ${activeTab === "trends" ? "border-b-2" : ""}`}
            style={{
              color:
                activeTab === "trends"
                  ? "var(--primary-color)"
                  : "var(--text-secondary)",
              borderColor:
                activeTab === "trends" ? "var(--primary-color)" : "transparent",
            }}
          >
            <TrendingUp className="icon-sm mr-1 inline-block" />
            Trends
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 ease-in-out">
            {/* Total Sales Card */}
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
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${quickStats.growthRate >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                >
                  {quickStats.growthRate >= 0 ? (
                    <TrendingUp className="icon-xs mr-0.5" />
                  ) : (
                    <TrendingDown className="icon-xs mr-0.5" />
                  )}
                  {quickStats.growthRate >= 0 ? "+" : ""}
                  {safeNumber(quickStats.growthRate).toFixed(1)}%
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(safeNumber(quickStats.totalSales))}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Sales
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  COGS: {formatCurrency(totalCOGS)}
                </div>
              </div>
            </div>

            {/* Total Profit Card */}
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
                  Margin: {totalProfitMargin.toFixed(1)}%
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-emerald)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {formatCurrency(safeNumber(quickStats.totalProfit))}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Profit
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
                  Profit Margin: {totalProfitMargin.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Total Orders Card */}
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
                  <ShoppingCart
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-green)" }}
                  />
                </div>
                <div
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${safeNumber(quickStats.ordersGrowthRate) >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                >
                  {safeNumber(quickStats.ordersGrowthRate) >= 0 ? (
                    <TrendingUp className="icon-xs mr-0.5" />
                  ) : (
                    <TrendingDown className="icon-xs mr-0.5" />
                  )}
                  {safeNumber(quickStats.ordersGrowthRate) >= 0 ? "+" : ""}
                  {safeNumber(quickStats.ordersGrowthRate).toFixed(1)}%
                </div>
              </div>
              <h3
                className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-green)]"
                style={{ color: "var(--sidebar-text)" }}
              >
                {safeNumber(quickStats.totalOrders)}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Total Orders
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Avg: {avgUnitsPerOrder.toFixed(1)} units/order
                </div>
              </div>
            </div>

            {/* Performance Metrics Card */}
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
                  <Target
                    className="icon-lg transition-colors duration-300"
                    style={{ color: "var(--accent-purple)" }}
                  />
                </div>
                <div
                  className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${targetAchievementRate >= 80 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : targetAchievementRate >= 60 ? "bg-[var(--accent-yellow-light)] text-[var(--accent-yellow)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                >
                  Target: {targetAchievementRate.toFixed(1)}%
                </div>
              </div>
              <h3
                className={`text-xl font-bold mb-0.5 transition-colors duration-300 ${safeNumber(performanceMetrics.conversionRate) >= 10 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
              >
                {formatCurrency(
                  safeNumber(performanceMetrics.averageOrderValue),
                )}
              </h3>
              <p
                className="text-xs transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Avg Order Value
              </p>
              <div
                className="mt-3 pt-3 transition-colors duration-300"
                style={{ borderTop: "1px solid var(--border-color)" }}
              >
                <div
                  className="text-xs transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Conv:{" "}
                  {safeNumber(performanceMetrics.conversionRate).toFixed(1)}% |
                  Sat:{" "}
                  {safeNumber(performanceMetrics.customerSatisfaction).toFixed(
                    1,
                  )}
                  /5
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
            {/* Monthly Sales Performance */}
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
                Monthly Sales Performance
              </h3>
              {salesByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salesByMonth}>
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
                      tickFormatter={(value: number) =>
                        `${formatCurrency(value / 1000)}k`
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="sales"
                      name="Sales"
                      fill={SALES_COLORS.sales}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      fill={SALES_COLORS.profit}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <BarChart3
                    className="w-12 h-12 mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No monthly data available
                  </p>
                </div>
              )}
            </div>

            {/* Sales by Category */}
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
                Sales by Category
              </h3>
              {salesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value, payload }) => {
                        const percentage = payload?.percentage || 0;
                        const category = payload?.category || "N/A";
                        return `${category} (${typeof percentage === "number" ? percentage.toFixed(1) : 0}%)`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sales"
                    >
                      {salesByCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => [
                        formatCurrency(value || 0),
                        "Sales",
                      ]}
                      labelFormatter={(label: any) => `Category: ${label}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <PieChartIcon
                    className="w-12 h-12 mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No category data available
                  </p>
                </div>
              )}
            </div>

            {/* Sales vs Target */}
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
                <Target className="icon-sm" />
                Sales vs Target
              </h3>
              {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
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
                      tickFormatter={(value: number) => `₱${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Actual Sales"
                      stroke={SALES_COLORS.sales}
                      strokeWidth={3}
                      dot={{ fill: SALES_COLORS.sales, strokeWidth: 2, r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target"
                      name="Sales Target"
                      stroke={SALES_COLORS.target}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: SALES_COLORS.target, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <Target
                    className="w-12 h-12 mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No trend data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Performance & Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
            {/* Performance Summary */}
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
                  <Activity className="icon-sm transition-colors duration-300" />
                  Performance Summary
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
                      {bestMonth || "N/A"}
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
                      {worstMonth || "N/A"}
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Target Achievement
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{
                        color:
                          targetAchievementRate >= 80
                            ? "var(--accent-green)"
                            : targetAchievementRate >= 60
                              ? "var(--accent-yellow)"
                              : "var(--accent-red)",
                      }}
                    >
                      {targetAchievementRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div
                      className="text-xs mb-0.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Conversion Rate
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{
                        color:
                          safeNumber(performanceMetrics.conversionRate) >= 10
                            ? "var(--accent-green)"
                            : "var(--accent-red)",
                      }}
                    >
                      {safeNumber(performanceMetrics.conversionRate).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
                {bestProduct && (
                  <div className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]">
                    <div className="flex justify-between items-center">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Top Product
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {bestProduct.name} -{" "}
                        {formatCurrency(safeNumber(bestProduct.revenue))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div
              className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
              style={{
                background: "var(--card-secondary-bg)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center justify-between mb-4 transition-colors duration-300">
                <h3
                  className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-emerald)]"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Layers className="icon-sm transition-colors duration-300" />
                  Financial Summary
                </h3>
                {quickStats.reconciliationStatus && (
                  <div
                    className={`text-xs px-1.5 py-0.5 rounded-full ${quickStats.reconciliationStatus === "consistent" ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                  >
                    {quickStats.reconciliationStatus}
                  </div>
                )}
              </div>
              <div className="space-y-2 transition-colors duration-300">
                {[
                  {
                    label: "Total COGS",
                    value: formatCurrency(totalCOGS),
                    color: "var(--accent-orange)",
                  },
                  {
                    label: "Gross Profit",
                    value: formatCurrency(safeNumber(quickStats.totalProfit)),
                    color: "var(--accent-emerald)",
                  },
                  {
                    label: "Profit Margin",
                    value: `${totalProfitMargin.toFixed(1)}%`,
                    color:
                      totalProfitMargin >= 20
                        ? "var(--accent-green)"
                        : "var(--accent-red)",
                  },
                  {
                    label: "COGS to Sales Ratio",
                    value: `${safeNumber(performanceMetrics.cogsToSalesRatio).toFixed(1)}%`,
                    color: "var(--accent-orange)",
                  },
                  {
                    label: "Growth Rate",
                    value: `${safeNumber(quickStats.growthRate) >= 0 ? "+" : ""}${safeNumber(quickStats.growthRate).toFixed(1)}%`,
                    color:
                      safeNumber(quickStats.growthRate) >= 0
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

      {/* Products Tab */}
      {activeTab === "products" && (
        <>
          {/* Top Products Table */}
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
                Top Performing Products
              </h3>
              {topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                        }}
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
                          Revenue
                        </th>
                        <th
                          className="text-right p-3 text-xs font-semibold"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Units Sold
                        </th>
                        <th
                          className="text-right p-3 text-xs font-semibold"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Profit
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
                          Margin
                        </th>
                        <th
                          className="text-right p-3 text-xs font-semibold"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product, index) => (
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
                          </td>
                          <td
                            className="p-3 text-right font-medium text-sm"
                            style={{ color: "var(--accent-blue)" }}
                          >
                            {formatCurrency(safeNumber(product.revenue))}
                          </td>
                          <td
                            className="p-3 text-right text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {safeNumber(product.units)}
                          </td>
                          <td
                            className="p-3 text-right font-medium text-sm"
                            style={{ color: "var(--accent-emerald)" }}
                          >
                            {formatCurrency(safeNumber(product.profit))}
                          </td>
                          <td
                            className="p-3 text-right text-sm"
                            style={{ color: "var(--accent-orange)" }}
                          >
                            {formatCurrency(safeNumber(product.cogs))}
                          </td>
                          <td
                            className={`p-3 text-right text-sm ${safeNumber(product.profitMargin) >= 20 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}
                          >
                            {safeNumber(product.profitMargin).toFixed(1)}%
                          </td>
                          <td
                            className="p-3 text-right text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {product.category || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package
                    className="w-12 h-12 mx-auto mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No product data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Product Performance Metrics */}
          {topProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 transition-all duration-300 ease-in-out">
              <div
                className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md"
                style={{
                  background: "var(--card-secondary-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Total Products Analyzed
                </div>
                <div
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {topProducts.length}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Unique products in report
                </div>
              </div>
              <div
                className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md"
                style={{
                  background: "var(--card-secondary-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Avg Profit per Product
                </div>
                <div
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--accent-emerald)" }}
                >
                  {formatCurrency(
                    topProducts.reduce(
                      (sum, p) => sum + safeNumber(p.profit),
                      0,
                    ) / topProducts.length,
                  )}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Average profit margin
                </div>
              </div>
              <div
                className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md"
                style={{
                  background: "var(--card-secondary-bg)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Total Units Sold
                </div>
                <div
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--accent-blue)" }}
                >
                  {topProducts.reduce((sum, p) => sum + safeNumber(p.units), 0)}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Across all top products
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <>
          {/* Category Performance */}
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
                <Layers className="icon-sm" />
                Category Performance
              </h3>
              {salesByCategory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {salesByCategory.map((category, index) => (
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
                            {category.category}
                          </span>
                        </div>
                        <div
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              COLORS[index % COLORS.length] + "20",
                            color: COLORS[index % COLORS.length],
                          }}
                        >
                          {safeNumber(category.percentage).toFixed(1)}%
                        </div>
                      </div>
                      <div
                        className="text-lg font-bold mb-1"
                        style={{ color: COLORS[index % COLORS.length] }}
                      >
                        {formatCurrency(safeNumber(category.sales))}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Category performance contribution
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Layers
                    className="w-12 h-12 mx-auto mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No category data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Category Metrics */}
          {salesByCategory.length > 0 && (
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
                <FileText className="icon-sm" />
                Category Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ background: "var(--card-bg)" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Total Categories
                  </div>
                  <div
                    className="text-lg font-bold mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {salesByCategory.length}
                  </div>
                </div>
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ background: "var(--card-bg)" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Top Category
                  </div>
                  <div
                    className="text-lg font-bold mb-1"
                    style={{ color: "var(--accent-green)" }}
                  >
                    {salesByCategory[0]?.category || "N/A"}
                  </div>
                </div>
                <div
                  className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)]"
                  style={{ background: "var(--card-bg)" }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Bottom Category
                  </div>
                  <div
                    className="text-lg font-bold mb-1"
                    style={{ color: "var(--accent-red)" }}
                  >
                    {salesByCategory[salesByCategory.length - 1]?.category ||
                      "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <>
          {/* Growth Trends */}
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
                <TrendingUp className="icon-sm" />
                Monthly Growth Trends
              </h3>
              {salesByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesByMonth}>
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
                      tickFormatter={(value: any) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        `${Number(value).toFixed(1)}%`,
                        "Growth",
                      ]}
                      labelFormatter={(label: any) => `Month: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="profitMargin"
                      name="Profit Margin Trend"
                      stroke="var(--accent-emerald)"
                      fill="var(--accent-emerald)"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <TrendingUp
                    className="w-12 h-12 mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No trend data available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sales Composition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
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
                Sales Composition
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Sales Revenue
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    {formatCurrency(safeNumber(quickStats.totalSales))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cost of Goods Sold
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--accent-orange)" }}
                  >
                    {formatCurrency(totalCOGS)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Gross Profit
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--accent-emerald)" }}
                  >
                    {formatCurrency(safeNumber(quickStats.totalProfit))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Profit Margin
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        totalProfitMargin >= 20
                          ? "var(--accent-green)"
                          : "var(--accent-red)",
                    }}
                  >
                    {totalProfitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

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
                <Clock className="icon-sm" />
                Report Metadata
              </h3>
              <div className="space-y-2">
                {metadata && (
                  <>
                    <div className="flex justify-between items-center">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Generated
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {new Date(metadata.generatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Formula Version
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {metadata.formulaVersion}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Profit Formula
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {metadata.profitFormulaVersion}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        COGS Integration
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color:
                            metadata.cogsIntegrationStatus === "integrated"
                              ? "var(--accent-green)"
                              : "var(--accent-red)",
                        }}
                      >
                        {metadata.cogsIntegrationStatus}
                      </span>
                    </div>
                  </>
                )}
                <div
                  className="pt-2 mt-2"
                  style={{ borderTop: "1px solid var(--border-color)" }}
                >
                  <div
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Growth Rate Method:{" "}
                    {quickStats.growthRateMethod || "Standard"}
                    {quickStats.growthRateFallbackApplied && (
                      <span className="ml-1 text-[var(--accent-yellow)]">
                        (Fallback applied)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
              Data period: {dataDateRange.startDate} to {dataDateRange.endDate}
            </div>
          </div>
          {quickStats.growthRateFallbackApplied && (
            <div
              className="mt-2 text-xs p-2 rounded-md"
              style={{
                backgroundColor: "var(--accent-yellow-light)",
                color: "var(--accent-yellow)",
              }}
            >
              Note: Growth rate calculation used fallback method due to zero or
              negative previous period sales.
            </div>
          )}
          {metadata?.reconciliationWarnings &&
            metadata.reconciliationWarnings.length > 0 && (
              <div
                className="mt-2 text-xs p-2 rounded-md"
                style={{
                  backgroundColor: "var(--accent-red-light)",
                  color: "var(--accent-red)",
                }}
              >
                <AlertTriangle className="inline w-3 h-3 mr-1" />
                Reconciliation warnings:{" "}
                {metadata.reconciliationWarnings.join(", ")}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SalesReport;
