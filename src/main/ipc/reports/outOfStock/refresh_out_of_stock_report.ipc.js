//@ts-check
const getOutOfStockReport = require("./get/out_of_stock_report.ipc");

/**
 * @param {{
 *   category?: string;
 *   include_backorder?: boolean;
 *   limit?: number;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  // Pwede ring tawagan lang ang getOutOfStockReport; sa totoong app, pwede mag-clear ng cache.
  return await getOutOfStockReport(params);
};