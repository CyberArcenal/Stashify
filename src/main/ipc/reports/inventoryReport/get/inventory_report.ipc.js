// src/main/ipc/inventoryReport/get/inventory_report.ipc.js
//@ts-check
const {
  getStockByCategory,
  getLowStockProducts,
  getStockMovements,
  getSummary,
  getPerformanceMetrics,
  getDateRange,
  getMetadata,
} = require("../utils/inventoryReportUtils");


module.exports = async (params = {}) => {
  try {
    const {
      // @ts-ignore
      start_date,
      // @ts-ignore
      end_date,
      // @ts-ignore
      period = "6months",
      // @ts-ignore
      category,
      // @ts-ignore
      low_stock_only = false,
      // @ts-ignore
      group_by = "month",
    } = params;

    // Get date range
    const dateRange = getDateRange({ start_date, end_date, period });

    // Fetch data concurrently
    const [stockByCategory, lowStockProducts, stockMovements] = await Promise.all([
      getStockByCategory({ category, dateRange }),
      // @ts-ignore
      getLowStockProducts({ category, lowStockOnly: low_stock_only, dateRange }),
      getStockMovements({ dateRange, groupBy: group_by }),
    ]);

    // Compute summary and metrics
    const summary = await getSummary({ category, dateRange });
    // @ts-ignore
    const performanceMetrics = getPerformanceMetrics(stockByCategory, summary.stockTurnoverRate);
    const metadata = getMetadata({ dateRange, params });

    const reportData = {
      stockByCategory,
      lowStockProducts,
      stockMovements,
      summary,
      performanceMetrics,
      dateRange: {
        startDate: dateRange.start.toISOString().split("T")[0],
        endDate: dateRange.end.toISOString().split("T")[0],
        period,
      },
      metadata,
    };

    return {
      status: true,
      message: "Inventory report generated successfully",
      data: reportData,
    };
  } catch (error) {
    console.error("getInventoryReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate inventory report",
      data: null,
    };
  }
};