//@ts-check
const { getProductPerformance } = require("../utils/salesReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 *   category?: string;
 *   limit?: number;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await getProductPerformance(params);
    return {
      status: true,
      message: "Product performance data retrieved successfully",
      data,
    };
  } catch (error) {
    console.error("getProductPerformance error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get product performance data",
      data: [],
    };
  }
};