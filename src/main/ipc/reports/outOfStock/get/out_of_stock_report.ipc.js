//@ts-check
const { generateOutOfStockReport } = require("../utils/outOfStockUtils");

/**
 * @param {{
 *   category?: string;
 *   include_backorder?: boolean;
 *   limit?: number;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const reportData = await generateOutOfStockReport(params);
    return {
      status: true,
      message: "Out-of-stock report generated successfully",
      data: reportData,
    };
  } catch (error) {
    console.error("getOutOfStockReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate out-of-stock report",
      data: null,
    };
  }
};