// src/main/ipc/inventoryReport/get/low_stock_products.ipc.js
//@ts-check
const { getLowStockProducts } = require("../utils/inventoryReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 *   threshold?: number;
 *   category?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any[] }>}
 */
module.exports = async (params = {}) => {
  try {
    const { start_date, end_date, threshold, category } = params;
    const dateRange = { start: start_date ? new Date(start_date) : null, end: end_date ? new Date(end_date) : null };
    // @ts-ignore
    const lowStockProducts = await getLowStockProducts({ category, threshold, dateRange });

    return {
      status: true,
      message: "Low stock products retrieved successfully",
      data: lowStockProducts,
    };
  } catch (error) {
    console.error("getLowStockProducts error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to fetch low stock products",
      data: [],
    };
  }
};