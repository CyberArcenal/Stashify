//@ts-check
const { generateProfitLossReport } = require("../utils/profitLossUtils");

/**
 * @param {{
 *   year?: number;
 *   months?: number;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    // We'll reuse the main report but extract only trends
    const { year = new Date().getFullYear(), months = 12 } = params;
    const start_date = new Date(year, 0, 1).toISOString().split("T")[0];
    const end_date = new Date(year, 11, 31).toISOString().split("T")[0];
    const report = await generateProfitLossReport({ period: "custom", start_date, end_date, group_by: "month" });
    const trends = report.profitLossTrend.slice(0, months);
    return {
      status: true,
      message: "Monthly trends retrieved successfully",
      data: trends,
    };
  } catch (error) {
    console.error("getMonthlyTrends error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get monthly trends",
      data: [],
    };
  }
};