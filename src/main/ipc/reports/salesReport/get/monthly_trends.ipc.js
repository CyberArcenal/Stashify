//@ts-check
const { getMonthlyTrends } = require("../utils/salesReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await getMonthlyTrends(params);
    return {
      status: true,
      message: "Monthly trends retrieved successfully",
      data,
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