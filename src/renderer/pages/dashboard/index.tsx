// components/DashboardPage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  Users,
  AlertTriangle,
  Eye,
  Plus,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  DollarSign,
  BarChart3,
  UserCheck,
  Warehouse,
  ChevronRight,
  Activity,
  Target,
  Zap,
  Calendar,
  TrendingDown,
  CheckCircle,
  Clock,
  Percent,
  PieChart,
  Box,
  FileText,
  Store,
  Layers,
  X,
} from "lucide-react";
import type { DashboardData } from "../../api/analytics/dashboard";
import dashboardAPI from "../../api/analytics/dashboard";

const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardAPI.getDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await dashboardAPI.refreshDashboardData();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to refresh dashboard data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency for Philippine Peso
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${formatCurrency(value)}`;
  };

  // Quick actions for the dashboard
  const quickActions = [
    { label: "Products", path: "/products", icon: Package, color: "blue" },
    { label: "New Order", path: "/orders/form", icon: Plus, color: "green" },
    {
      label: "Purchase",
      path: "/purchases/form",
      icon: Truck,
      color: "orange",
    },
    {
      label: "Reports",
      path: "/reports/sales",
      icon: TrendingUp,
      color: "purple",
    },
  ];

  // Navigate functions for clickable metrics
  const navigateToProducts = () => navigate("/products");
  const navigateToOrders = () => navigate("/orders");
  const navigateToPendingOrders = () => navigate("/orders/pending");
  const navigateToSalesReports = () => navigate("/reports/sales");
  const navigateToCustomers = () => navigate("/customers");
  const navigateToPurchases = () => navigate("/purchases");
  const navigateToLowStock = () => navigate("/products/low-stock");
  const navigateToOutOfStock = () => navigate("/products/out-of-stock");
  const navigateToProfitLossReport = () => navigate("/reports/profit-loss");
  const navigateToStockMovements = () => navigate("/stock-movements");
  const navigateToSuppliers = () => navigate("/suppliers");
  const navigateToAuditLogs = () => navigate("/audit-logs");
  const navigateToInventoryReport = () => navigate("/reports/inventory");

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
              Loading dashboard...
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
            Error Loading Dashboard
          </p>
          <p className="text-sm mb-3 transition-colors duration-300">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="btn btn-primary btn-sm rounded-md flex items-center mx-auto transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
          >
            <RefreshCw className="icon-sm mr-1" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
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
          <p className="text-sm">No dashboard data available</p>
        </div>
      </div>
    );
  }

  const {
    totals,
    currentPeriodMetrics,
    growthMetrics,
    profitMetrics,
    customerMetrics,
    inventoryHealth,
    cashflowMetrics,
    recentActivities,
    trendData,
    metadata,
  } = dashboardData;

  // Calculate stock aging distribution
  const stockAgingDistribution = [
    {
      label: "Recent (<30d)",
      value: inventoryHealth.stockAgingBuckets.recent.quantity,
      percentage: inventoryHealth.stockAgingBuckets.recent.percentage,
      color: "var(--accent-green)",
    },
    {
      label: "Middle (30-90d)",
      value: inventoryHealth.stockAgingBuckets.middle.quantity,
      percentage: inventoryHealth.stockAgingBuckets.middle.percentage,
      color: "var(--accent-yellow)",
    },
    {
      label: "Aged (>90d)",
      value: inventoryHealth.stockAgingBuckets.aged.quantity,
      percentage: inventoryHealth.stockAgingBuckets.aged.percentage,
      color: "var(--accent-red)",
    },
  ];

  // Calculate expense distribution
  const expenseDistribution = [
    {
      label: "Salaries",
      value: cashflowMetrics.expenseBreakdown.salaries,
      color: "var(--accent-blue)",
    },
    {
      label: "Rent & Utilities",
      value: cashflowMetrics.expenseBreakdown.rentUtilities,
      color: "var(--accent-green)",
    },
    {
      label: "Marketing",
      value: cashflowMetrics.expenseBreakdown.marketing,
      color: "var(--accent-purple)",
    },
    {
      label: "Software",
      value: cashflowMetrics.expenseBreakdown.softwareTools,
      color: "var(--accent-orange)",
    },
    {
      label: "Other",
      value: cashflowMetrics.expenseBreakdown.otherExpenses,
      color: "var(--accent-gray)",
    },
  ];

  // Get latest sales trend data
  const latestSales =
    trendData.salesTrend.length > 0
      ? trendData.salesTrend[trendData.salesTrend.length - 1]
      : null;
  const latestOrders =
    trendData.orderTrend.length > 0
      ? trendData.orderTrend[trendData.orderTrend.length - 1]
      : null;

  // Determine growth trend colors
  const getGrowthColor = (value: number) => {
    if (value > 0) return "var(--accent-green)";
    if (value < 0) return "var(--accent-red)";
    return "var(--text-secondary)";
  };

  // Determine status colors
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "var(--accent-green)";
      case "pending":
        return "var(--accent-yellow)";
      case "cancelled":
        return "var(--accent-red)";
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <div className="space-y-4 transition-all duration-300 ease-in-out">
      {/* Compact Page Header */}
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
              Dashboard Overview
            </h2>
            <p
              className="text-xs transition-colors duration-300"
              style={{ color: "var(--text-secondary)" }}
            >
              Business insights - {metadata.period}
              {currentPeriodMetrics && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "var(--card-secondary-bg)",
                    color: "var(--primary-color)",
                  }}
                >
                  {new Date(
                    currentPeriodMetrics.periodStart,
                  ).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(currentPeriodMetrics.periodEnd).toLocaleDateString(
                    "en-PH",
                    { month: "short", day: "numeric" },
                  )}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 transition-colors duration-300">
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
            <div
              className="text-xs px-2 py-0.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                color: "var(--text-secondary)",
              }}
            >
              <Clock className="inline-block w-2.5 h-2.5 mr-0.5" />
              {new Date(metadata.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-300 ease-in-out">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const colorClasses = {
            blue: {
              background: "var(--accent-blue)",
              hover: "var(--accent-blue-hover)",
            },
            green: {
              background: "var(--accent-green)",
              hover: "var(--accent-green-hover)",
            },
            orange: {
              background: "var(--accent-orange)",
              hover: "var(--accent-orange-hover)",
            },
            purple: {
              background: "var(--accent-purple)",
              hover: "var(--accent-purple-hover)",
            },
          };

          const colors =
            colorClasses[action.color as keyof typeof colorClasses];

          return (
            <Link
              key={index}
              to={action.path}
              className="compact-card rounded-lg p-4 flex flex-col items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-md group"
              style={{
                background: colors.background,
                border: "1px solid transparent",
              }}
            >
              <div className="relative transition-all duration-300 ease-in-out group-hover:scale-105">
                <Icon
                  className="icon-lg mb-2 transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                />
              </div>
              <span
                className="text-xs font-medium text-center transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Compact Main Metrics Grid */}
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
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${growthMetrics.monthlyGrowth >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
            >
              {growthMetrics.monthlyGrowth >= 0 ? (
                <ArrowUp className="icon-xs mr-0.5" />
              ) : (
                <ArrowDown className="icon-xs mr-0.5" />
              )}
              {formatPercentage(growthMetrics.monthlyGrowth)}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToProducts}
          >
            {totals.totalProducts}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Products
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            <div
              onClick={navigateToProducts}
              className="text-xs font-medium hover:underline flex items-center transition-all duration-200 ease-in-out cursor-pointer"
              style={{ color: "var(--primary-color)" }}
            >
              <Eye className="icon-xs mr-1" />
              View all
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
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${growthMetrics.orderGrowth >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
            >
              {growthMetrics.orderGrowth >= 0 ? (
                <ArrowUp className="icon-xs mr-0.5" />
              ) : (
                <ArrowDown className="icon-xs mr-0.5" />
              )}
              {formatPercentage(growthMetrics.orderGrowth)}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-green)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToOrders}
          >
            {totals.totalOrders}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Orders
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            <div className="flex justify-between text-xs transition-colors duration-300">
              <span
                className="flex items-center cursor-pointer hover:underline"
                style={{ color: "var(--sidebar-text)" }}
                onClick={navigateToPendingOrders}
              >
                <AlertTriangle
                  className="w-2.5 h-2.5 mr-0.5"
                  style={{
                    color:
                      totals.pendingOrders > 0
                        ? "var(--accent-yellow)"
                        : "var(--accent-green)",
                  }}
                />
                Pending: {totals.pendingOrders}
              </span>
              <div
                className="font-medium hover:underline cursor-pointer transition-all duration-200 ease-in-out"
                style={{ color: "var(--primary-color)" }}
                onClick={navigateToPendingOrders}
              >
                View
              </div>
            </div>
          </div>
        </div>

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
              style={{ background: "var(--accent-purple-dark)" }}
            >
              <TrendingUp
                className="icon-lg transition-colors duration-300"
                style={{ color: "var(--accent-purple)" }}
              />
            </div>
            <div
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${growthMetrics.salesGrowth >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
            >
              {growthMetrics.salesGrowth >= 0 ? (
                <ArrowUp className="icon-xs mr-0.5" />
              ) : (
                <ArrowDown className="icon-xs mr-0.5" />
              )}
              {formatPercentage(growthMetrics.salesGrowth)}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-purple)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToSalesReports}
          >
            {formatCurrency(totals.totalSales)}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Sales
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            {currentPeriodMetrics && (
              <div
                className="text-xs mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Current:{" "}
                {formatCurrency(currentPeriodMetrics.currentPeriodRevenue)}
              </div>
            )}
            <div
              onClick={navigateToSalesReports}
              className="text-xs font-medium hover:underline flex items-center transition-all duration-200 ease-in-out cursor-pointer"
              style={{ color: "var(--primary-color)" }}
            >
              <Eye className="icon-xs mr-1" />
              Reports
            </div>
          </div>
        </div>

        {/* Total Customers Card */}
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
              style={{ background: "var(--accent-indigo-dark)" }}
            >
              <Users
                className="icon-lg transition-colors duration-300"
                style={{ color: "var(--accent-indigo)" }}
              />
            </div>
            <div
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${growthMetrics.customerGrowth >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
            >
              {growthMetrics.customerGrowth >= 0 ? (
                <ArrowUp className="icon-xs mr-0.5" />
              ) : (
                <ArrowDown className="icon-xs mr-0.5" />
              )}
              {formatPercentage(growthMetrics.customerGrowth)}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-indigo)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToCustomers}
          >
            {totals.totalCustomers}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Customers
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            {currentPeriodMetrics && (
              <div
                className="text-xs mb-1"
                style={{ color: "var(--text-secondary)" }}
              >
                Current: {currentPeriodMetrics.currentPeriodCustomers}
              </div>
            )}
            <div
              onClick={navigateToCustomers}
              className="text-xs font-medium hover:underline flex items-center transition-all duration-200 ease-in-out cursor-pointer"
              style={{ color: "var(--primary-color)" }}
            >
              <Eye className="icon-xs mr-1" />
              View all
            </div>
          </div>
        </div>
      </div>

      {/* Current Period Performance Section */}
      {currentPeriodMetrics && (
        <div
          className="compact-card rounded-lg transition-all duration-300 ease-in-out hover:shadow-md"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="p-4 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4 transition-colors duration-300">
              <h3
                className="text-base font-semibold flex items-center gap-1.5 transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar className="icon-sm transition-colors duration-300" />
                Current Period
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "var(--primary-light)",
                    color: "var(--primary-color)",
                  }}
                >
                  {new Date(
                    currentPeriodMetrics.periodStart,
                  ).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(currentPeriodMetrics.periodEnd).toLocaleDateString(
                    "en-PH",
                    { month: "short", day: "numeric" },
                  )}
                </span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 transition-all duration-300 ease-in-out">
              <div
                className="text-center p-3 rounded-lg transition-all duration-300 ease-in-out hover:shadow-sm cursor-pointer hover:bg-[var(--card-hover-bg)]"
                style={{ background: "var(--card-secondary-bg)" }}
                onClick={navigateToSalesReports}
              >
                <DollarSign
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: "var(--accent-green)" }}
                />
                <div
                  className="text-lg font-bold mb-0.5"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formatCurrency(currentPeriodMetrics.currentPeriodRevenue)}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Revenue
                </div>
              </div>
              <div
                className="text-center p-3 rounded-lg transition-all duration-300 ease-in-out hover:shadow-sm cursor-pointer hover:bg-[var(--card-hover-bg)]"
                style={{ background: "var(--card-secondary-bg)" }}
                onClick={navigateToOrders}
              >
                <ShoppingCart
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: "var(--accent-blue)" }}
                />
                <div
                  className="text-lg font-bold mb-0.5"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {currentPeriodMetrics.currentPeriodOrders}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Orders
                </div>
              </div>
              <div
                className="text-center p-3 rounded-lg transition-all duration-300 ease-in-out hover:shadow-sm cursor-pointer hover:bg-[var(--card-hover-bg)]"
                style={{ background: "var(--card-secondary-bg)" }}
                onClick={navigateToCustomers}
              >
                <Users
                  className="w-6 h-6 mx-auto mb-2"
                  style={{ color: "var(--accent-purple)" }}
                />
                <div
                  className="text-lg font-bold mb-0.5"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {currentPeriodMetrics.currentPeriodCustomers}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Customers
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Second Row Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-all duration-300 ease-in-out">
        {/* Total Purchases Card */}
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
              style={{ background: "var(--accent-orange-dark)" }}
            >
              <Truck
                className="icon-lg transition-colors duration-300"
                style={{ color: "var(--accent-orange)" }}
              />
            </div>
            <div
              className="text-xs px-1.5 py-0.5 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: "var(--accent-orange-light)",
                color: "var(--accent-orange)",
              }}
            >
              This period
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-orange)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToPurchases}
          >
            {totals.totalPurchases}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Purchases
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            <div
              onClick={navigateToPurchases}
              className="text-xs font-medium hover:underline flex items-center transition-all duration-200 ease-in-out cursor-pointer"
              style={{ color: "var(--primary-color)" }}
            >
              <Eye className="icon-xs mr-1" />
              History
            </div>
          </div>
        </div>

        {/* Stock Alerts Card */}
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
              {totals.lowStockCount + totals.outOfStockCount > 0
                ? "Attention"
                : "All good"}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-red)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToLowStock}
          >
            {totals.lowStockCount}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Low Stock
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            <div className="flex justify-between text-xs transition-colors duration-300">
              <span
                className="flex items-center cursor-pointer hover:underline"
                style={{ color: "var(--sidebar-text)" }}
                onClick={navigateToOutOfStock}
              >
                <Box
                  className="w-2.5 h-2.5 mr-0.5"
                  style={{
                    color:
                      totals.outOfStockCount > 0
                        ? "var(--accent-red)"
                        : "var(--accent-green)",
                  }}
                />
                Out: {totals.outOfStockCount}
              </span>
              <div
                className="font-medium hover:underline cursor-pointer transition-all duration-200 ease-in-out"
                style={{ color: "var(--primary-color)" }}
                onClick={navigateToLowStock}
              >
                Details
              </div>
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
              <DollarSign
                className="icon-lg transition-colors duration-300"
                style={{ color: "var(--accent-emerald)" }}
              />
            </div>
            <div
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${profitMetrics.grossProfitMargin >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
            >
              {profitMetrics.grossProfitMargin >= 0 ? (
                <ArrowUp className="icon-xs mr-0.5" />
              ) : (
                <ArrowDown className="icon-xs mr-0.5" />
              )}
              {formatPercentage(profitMetrics.grossProfitMargin)}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-emerald)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToProfitLossReport}
          >
            {formatCurrency(profitMetrics.grossProfit)}
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
              Margin: {formatPercentage(profitMetrics.grossProfitMargin)}
            </div>
          </div>
        </div>

        {/* Customer Metrics Card */}
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
              <UserCheck
                className="icon-lg transition-colors duration-300"
                style={{ color: "var(--accent-blue)" }}
              />
            </div>
            <div
              className={`flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full transition-all duration-300 ease-in-out ${customerMetrics.repeatCustomerRate >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
            >
              {customerMetrics.repeatCustomerRate >= 0 ? (
                <ArrowUp className="icon-xs mr-0.5" />
              ) : (
                <ArrowDown className="icon-xs mr-0.5" />
              )}
              {formatPercentage(customerMetrics.repeatCustomerRate * 100)}
            </div>
          </div>
          <h3
            className="text-xl font-bold mb-0.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)] cursor-pointer hover:underline"
            style={{ color: "var(--sidebar-text)" }}
            onClick={navigateToCustomers}
          >
            {customerMetrics.activeCustomers}
          </h3>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: "var(--sidebar-text)" }}
          >
            Active Customers
          </p>
          <div
            className="mt-3 pt-3 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            <div className="flex justify-between text-xs transition-colors duration-300">
              <span style={{ color: "var(--sidebar-text)" }}>
                Repeat: {formatPercentage(customerMetrics.repeatCustomerRate * 100)}
              </span>
              <span style={{ color: "var(--sidebar-text)" }}>
                New: {customerMetrics.segmentation.newCustomerPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Third Row - Business Health Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
        {/* Inventory Health Card */}
        <div
          className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-4 transition-colors duration-300">
            <h3
              className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-blue)] cursor-pointer hover:underline"
              style={{ color: "var(--sidebar-text)" }}
              onClick={navigateToStockMovements}
            >
              <Warehouse className="icon-sm transition-colors duration-300" />
              Inventory Health
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background:
                    inventoryHealth.stockAgingPercentage > 30
                      ? "var(--accent-red-light)"
                      : inventoryHealth.stockAgingPercentage > 10
                        ? "var(--accent-yellow-light)"
                        : "var(--accent-green-light)",
                  color:
                    inventoryHealth.stockAgingPercentage > 30
                      ? "var(--accent-red)"
                      : inventoryHealth.stockAgingPercentage > 10
                        ? "var(--accent-yellow)"
                        : "var(--accent-green)",
                }}
              >
                {inventoryHealth.stockAgingPercentage}% aged
              </span>
            </h3>
          </div>
          <div className="space-y-4 transition-colors duration-300">
            {/* Stock Aging Distribution */}
            <div className="space-y-1.5">
              <div
                className="text-xs font-medium transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Stock Aging
              </div>
              <div className="space-y-1.5">
                {stockAgingDistribution.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {item.value}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "var(--card-bg)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Turnover",
                  value: inventoryHealth.inventoryTurnover.toFixed(2),
                  icon: TrendingUp,
                  color: "var(--accent-green)",
                  onClick: navigateToInventoryReport,
                },
                {
                  label: "Days Cover",
                  value: `${inventoryHealth.daysOfStockCoverage.toFixed(1)}d`,
                  icon: Calendar,
                  color: "var(--accent-blue)",
                  onClick: navigateToInventoryReport,
                },
                {
                  label: "Value",
                  value: formatCurrency(inventoryHealth.inventoryValue),
                  icon: DollarSign,
                  color: "var(--accent-purple)",
                  onClick: navigateToInventoryReport,
                },
                {
                  label: "Auto Reorders",
                  value: inventoryHealth.autoReorderTriggeredCount,
                  icon: Zap,
                  color: "var(--accent-orange)",
                  onClick: navigateToInventoryReport,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                  onClick={item.onClick}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.icon &&
                      React.createElement(item.icon, {
                        className: "icon-xs",
                        style: { color: item.color },
                      })}
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Overview Card */}
        <div
          className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-4 transition-colors duration-300">
            <h3
              className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-emerald)] cursor-pointer hover:underline"
              style={{ color: "var(--sidebar-text)" }}
              onClick={navigateToProfitLossReport}
            >
              <BarChart3 className="icon-sm transition-colors duration-300" />
              Financial Overview
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background:
                    cashflowMetrics.cashflowStatus === "positive"
                      ? "var(--accent-green-light)"
                      : cashflowMetrics.cashflowStatus === "negative"
                        ? "var(--accent-red-light)"
                        : "var(--accent-yellow-light)",
                  color:
                    cashflowMetrics.cashflowStatus === "positive"
                      ? "var(--accent-green)"
                      : cashflowMetrics.cashflowStatus === "negative"
                        ? "var(--accent-red)"
                        : "var(--accent-yellow)",
                }}
              >
                {cashflowMetrics.cashflowStatus}
              </span>
            </h3>
          </div>
          <div className="space-y-4 transition-colors duration-300">
            {/* Key Financial Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Net Profit",
                  value: formatCurrency(cashflowMetrics.netProfit),
                  icon: DollarSign,
                  color:
                    cashflowMetrics.netProfit >= 0
                      ? "var(--accent-green)"
                      : "var(--accent-red)",
                  onClick: navigateToProfitLossReport,
                },
                {
                  label: "Revenue",
                  value: formatCurrency(cashflowMetrics.revenue),
                  icon: TrendingUp,
                  color: "var(--accent-blue)",
                  onClick: navigateToSalesReports,
                },
                {
                  label: "Gross Profit",
                  value: formatCurrency(cashflowMetrics.grossProfit),
                  icon: DollarSign,
                  color: "var(--accent-emerald)",
                  onClick: navigateToProfitLossReport,
                },
                {
                  label: "Expenses",
                  value: formatCurrency(cashflowMetrics.operatingExpenses),
                  icon: FileText,
                  color: "var(--accent-orange)",
                  onClick: navigateToProfitLossReport,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                  onClick={item.onClick}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {item.icon &&
                      React.createElement(item.icon, {
                        className: "icon-xs",
                        style: { color: item.color },
                      })}
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Expense Breakdown */}
            <div className="space-y-1.5">
              <div
                className="text-xs font-medium transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Expense Breakdown
              </div>
              <div className="space-y-1.5">
                {expenseDistribution.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Supplier Performance & Business Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
        {/* Supplier Performance Card */}
        <div
          className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-4 transition-colors duration-300">
            <h3
              className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-orange)] cursor-pointer hover:underline"
              style={{ color: "var(--sidebar-text)" }}
              onClick={navigateToSuppliers}
            >
              <Truck className="icon-sm transition-colors duration-300" />
              Supplier Performance
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background:
                    inventoryHealth.supplierPerformance.overallPerformance
                      .fulfillmentRate > 80
                      ? "var(--accent-green-light)"
                      : inventoryHealth.supplierPerformance.overallPerformance
                            .fulfillmentRate > 60
                        ? "var(--accent-yellow-light)"
                        : "var(--accent-red-light)",
                  color:
                    inventoryHealth.supplierPerformance.overallPerformance
                      .fulfillmentRate > 80
                      ? "var(--accent-green)"
                      : inventoryHealth.supplierPerformance.overallPerformance
                            .fulfillmentRate > 60
                        ? "var(--accent-yellow)"
                        : "var(--accent-red)",
                }}
              >
                {
                  formatPercentage(inventoryHealth.supplierPerformance.overallPerformance
                    .fulfillmentRate * 100
                )}
                %
              </span>
            </h3>
          </div>
          <div className="space-y-4 transition-colors duration-300">
            {/* Overall Performance */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Lead Time",
                  value: `${inventoryHealth.supplierPerformance.overallPerformance.averageLeadTime}d`,
                  icon: Clock,
                  onClick: navigateToSuppliers,
                },
                {
                  label: "Fulfillment",
                  value: `${formatPercentage(inventoryHealth.supplierPerformance.overallPerformance.fulfillmentRate * 100)}`,
                  icon: Percent,
                  onClick: navigateToSuppliers,
                },
                {
                  label: "Suppliers",
                  value:
                    inventoryHealth.supplierPerformance.overallPerformance
                      .supplierCount,
                  icon: Store,
                  onClick: navigateToSuppliers,
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="text-center p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                  onClick={item.onClick}
                >
                  <div
                    className="text-xs mb-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Supplier Details */}
            <div className="space-y-2">
              <div
                className="text-xs font-medium transition-colors duration-300"
                style={{ color: "var(--sidebar-text)" }}
              >
                Top Suppliers
              </div>
              {inventoryHealth.supplierPerformance.supplierDetails
                .slice(0, 2)
                .map((supplier, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/suppliers/view/${supplier.id || index}`,
                      )
                    }
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div
                          className="font-medium text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {supplier.supplierName}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {supplier.contactPerson}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-sm font-medium"
                          style={{ color: "var(--accent-green)" }}
                        >
                          {formatPercentage(supplier.fulfillmentRate * 100)}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {supplier.totalOrders} orders
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Business Trends Card */}
        <div
          className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-4 transition-colors duration-300">
            <h3
              className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-purple)] cursor-pointer hover:underline"
              style={{ color: "var(--sidebar-text)" }}
              onClick={navigateToSalesReports}
            >
              <TrendingUp className="icon-sm transition-colors duration-300" />
              Business Trends
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--primary-light)",
                  color: "var(--primary-color)",
                }}
              >
                Latest
              </span>
            </h3>
          </div>
          <div className="space-y-4 transition-colors duration-300">
            {/* Sales Trends */}
            {latestSales && (
              <div
                className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                onClick={navigateToSalesReports}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Sales
                  </div>
                  <div
                    className={`text-xs px-1.5 py-0.5 rounded-full ${latestSales.profitMargin >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                  >
                    {formatPercentage(latestSales.profitMargin)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Revenue
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {formatCurrency(latestSales.revenue)}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Profit
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-emerald)" }}
                    >
                      {formatCurrency(latestSales.profit)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Trends */}
            {latestOrders && (
              <div
                className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                onClick={navigateToOrders}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Orders
                  </div>
                  <div
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "var(--card-bg)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatPercentage(latestOrders.completionRate)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Completed
                    </div>
                    <div
                      className="font-bold text-sm flex items-center gap-1"
                      style={{ color: "var(--accent-green)" }}
                    >
                      <CheckCircle className="w-2.5 h-2.5" />
                      {latestOrders.completed}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Cancelled
                    </div>
                    <div
                      className="font-bold text-sm flex items-center gap-1"
                      style={{ color: "var(--accent-red)" }}
                    >
                      <X className="w-2.5 h-2.5" />
                      {latestOrders.cancelled}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Trends */}
            {trendData.customerTrend.length > 0 && (
              <div
                className="p-3 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] cursor-pointer"
                onClick={navigateToCustomers}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Customers
                  </div>
                  <div
                    className={`text-xs px-1.5 py-0.5 rounded-full ${growthMetrics.customerGrowth >= 0 ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--accent-red-light)] text-[var(--accent-red)]"}`}
                  >
                    {formatPercentage(growthMetrics.customerGrowth)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-blue)" }}
                    >
                      {customerMetrics.totalCustomers}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Active
                    </div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--accent-green)" }}
                    >
                      {customerMetrics.activeCustomers}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Recent Activity & Business Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-300 ease-in-out">
        {/* Recent Activities Card */}
        <div
          className="compact-card rounded-lg p-4 transition-all duration-300 ease-in-out hover:shadow-md group"
          style={{
            background: "var(--card-secondary-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center justify-between mb-4 transition-colors duration-300">
            <h3
              className="font-semibold flex items-center gap-1.5 transition-colors duration-300 group-hover:text-[var(--accent-purple)] cursor-pointer hover:underline"
              style={{ color: "var(--sidebar-text)" }}
              onClick={navigateToAuditLogs}
            >
              <Activity className="icon-sm transition-colors duration-300" />
              Recent Activities
            </h3>
            <div
              onClick={navigateToAuditLogs}
              className="text-xs hover:underline flex items-center transition-all duration-200 ease-in-out cursor-pointer"
              style={{ color: "var(--primary-color)" }}
            >
              View all
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </div>
          </div>
          <div className="space-y-3 transition-colors duration-300">
            {recentActivities.slice(0, 4).map((activity, index) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-md transition-all duration-300 ease-in-out hover:bg-[var(--card-hover-bg)] group/item cursor-pointer"
                onClick={() => navigate(`/audit-logs/view/${activity.id}`)}
              >
                <div className="relative mt-0.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ease-in-out"
                    style={{
                      background: activity.status
                        ? getStatusColor(activity.status)
                        : "var(--primary-color)",
                    }}
                  ></div>
                  {index < Math.min(recentActivities.length - 1, 3) && (
                    <div
                      className="absolute top-1.5 left-0.25 w-0.5 h-5"
                      style={{ background: "var(--border-color)" }}
                    ></div>
                  )}
                </div>
                <div className="flex-1 transition-colors duration-300">
                  <div className="flex justify-between items-start">
                    <p
                      className="text-sm font-medium transition-colors duration-300"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {activity.action}
                    </p>
                    {activity.status && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          background: getStatusColor(activity.status) + "20",
                          color: getStatusColor(activity.status),
                        }}
                      >
                        {activity.status}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs transition-colors duration-300"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {activity.details}
                  </p>
                  <p
                    className="text-xs mt-0.5 transition-colors duration-300"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Clock className="inline-block w-2.5 h-2.5 mr-0.5" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Business Summary Card */}
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
              <Target className="icon-sm transition-colors duration-300" />
              Business Summary
            </h3>
            <div
              className="text-xs px-1.5 py-0.5 rounded-full transition-colors duration-300"
              style={{
                background:
                  metadata.profitReconciliationStatus === "consistent"
                    ? "var(--accent-green-light)"
                    : "var(--accent-red-light)",
                color:
                  metadata.profitReconciliationStatus === "consistent"
                    ? "var(--accent-green)"
                    : "var(--accent-red)",
              }}
            >
              {metadata.profitReconciliationStatus}
            </div>
          </div>
          <div className="space-y-3 transition-colors duration-300">
            {[
              {
                label: "Total Revenue",
                value: formatCurrency(profitMetrics.totalRevenue),
                icon: DollarSign,
                color: "var(--accent-green)",
                onClick: navigateToSalesReports,
              },
              {
                label: "Gross Margin",
                value: `${formatPercentage(profitMetrics.grossProfitMargin)}`,
                icon: Percent,
                color: getGrowthColor(profitMetrics.grossProfitMargin),
                onClick: navigateToProfitLossReport,
              },
              {
                label: "Op. Margin",
                value: `${formatPercentage(profitMetrics.operatingMargin)}`,
                icon: TrendingUp,
                color: getGrowthColor(profitMetrics.operatingMargin),
                onClick: navigateToProfitLossReport,
              },
              {
                label: "CLV",
                value: formatCurrency(customerMetrics.customerLifetimeValue),
                icon: UserCheck,
                color: "var(--accent-blue)",
                onClick: navigateToCustomers,
              },
              {
                label: "Churn Rate",
                value: `${formatCurrency(customerMetrics.churnRate * 100)}`,
                icon: TrendingDown,
                color:
                  customerMetrics.churnRate > 0.05
                    ? "var(--accent-red)"
                    : "var(--accent-green)",
                onClick: navigateToCustomers,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 rounded-md transition-all duration-200 ease-in-out hover:bg-[var(--card-hover-bg)] group/item cursor-pointer"
                onClick={item.onClick}
              >
                <span
                  className="text-xs flex items-center gap-1.5 transition-colors duration-300"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {item.icon &&
                    React.createElement(item.icon, {
                      className: "icon-xs",
                      style: { color: item.color },
                    })}
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
          {/* Metadata Information */}
          <div
            className="mt-4 pt-4 transition-colors duration-300"
            style={{ borderTop: "1px solid var(--border-color)" }}
          >
            <div
              className="text-xs transition-colors duration-300"
              style={{ color: "var(--text-secondary)" }}
            >
              <div className="flex justify-between">
                <span>
                  Generated:{" "}
                  {new Date(metadata.generatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>v{metadata.formulaVersion}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
