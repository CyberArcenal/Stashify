//@ts-check

const { exportInventoryReport } = require("./utils/inventoryReportExportUtils");

/**
 * @param {{
 *   format?: string;
 *   period?: string;
 *   start_date?: string;
 *   end_date?: string;
 *   category?: string;
 *   low_stock_only?: boolean;
 *   group_by?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await exportInventoryReport(params);
    return {
      status: true,
      message: "Export completed successfully",
      data,
    };
  } catch (error) {
    console.error("exportInventoryReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to export inventory report",
      data: null,
    };
  }
};