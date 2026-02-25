//@ts-check
const { getExportPreview } = require("../utils/inventoryReportExportUtils");

/**
 * @param {{
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
    const data = await getExportPreview(params);
    return {
      status: true,
      message: "Export preview generated successfully",
      data,
    };
  } catch (error) {
    console.error("getExportPreview error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate export preview",
      data: null,
    };
  }
};