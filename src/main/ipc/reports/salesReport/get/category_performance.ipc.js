//@ts-check
const { getCategoryPerformance } = require("../utils/salesReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await getCategoryPerformance(params);
    return {
      status: true,
      message: "Category performance data retrieved successfully",
      data,
    };
  } catch (error) {
    console.error("getCategoryPerformance error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get category performance data",
      data: [],
    };
  }
};