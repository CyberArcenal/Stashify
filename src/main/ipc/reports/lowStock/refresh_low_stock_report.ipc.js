//@ts-check
const getLowStockReport = require("./get/low_stock_report.ipc");

/**
 * @param {{
 *   category?: string;
 *   threshold_multiplier?: number;
 *   limit?: number;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  return await getLowStockReport(params);
};