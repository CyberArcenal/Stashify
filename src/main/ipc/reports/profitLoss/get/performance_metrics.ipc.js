//@ts-check
const { getPerformanceMetrics } = require("../utils/profitLossUtils");
const { generateProfitLossReport } = require("../utils/profitLossUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const { start_date, end_date } = params;
    const report = await generateProfitLossReport({ period: "custom", start_date, end_date, group_by: "month" });
    return {
      status: true,
      message: "Performance metrics retrieved successfully",
      data: report.performanceMetrics,
    };
  } catch (error) {
    console.error("getPerformanceMetrics error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get performance metrics",
      data: null,
    };
  }
};