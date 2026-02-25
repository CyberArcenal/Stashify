//@ts-check
const {
  getTotals,
  getGrowthMetrics,
  getProfitMetrics,
  getCustomerMetrics,
  getInventoryHealth,
  getCashflowMetrics,
  getRecentActivities,
  getTraffic,
  getTrendData,
  getMetadata,
} = require("./utils/dashboardQueries");

/**
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async () => {
  try {
    const [
      totals,
      growthMetrics,
      profitMetrics,
      customerMetrics,
      inventoryHealth,
      cashflowMetrics,
      recentActivities,
      traffic,
      trendData,
      metadata,
    ] = await Promise.all([
      getTotals(),
      getGrowthMetrics(),
      getProfitMetrics(),
      getCustomerMetrics(),
      getInventoryHealth(),
      getCashflowMetrics(),
      getRecentActivities(),
      getTraffic(),
      getTrendData(),
      getMetadata(),
    ]);

    const dashboardData = {
      totals,
      growthMetrics,
      profitMetrics,
      customerMetrics,
      inventoryHealth,
      cashflowMetrics,
      recentActivities,
      traffic,
      trendData,
      metadata,
    };

    return {
      status: true,
      message: "Dashboard data refreshed successfully",
      data: dashboardData,
    };
  } catch (error) {
    console.error("refreshDashboardData error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to refresh dashboard data",
      data: null,
    };
  }
};