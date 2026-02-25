//@ts-check
const { buildLowStockReport } = require("../utils/lowStockUtils");

/**
 * @param {{
 *   category?: string;
 *   threshold_multiplier?: number;
 *   limit?: number;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await buildLowStockReport(params);

    return {
      status: true,
      message: "Low stock report generated successfully",
      data,
    };
  } catch (error) {
    console.error("getLowStockReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate low stock report",
      data: null,
    };
  }
};