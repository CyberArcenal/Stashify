// src/main/ipc/inventoryReport/get/category_stock.ipc.js
//@ts-check
const { getStockByCategory } = require("../utils/inventoryReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 *   category?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any[] }>}
 */
module.exports = async (params = {}) => {
  try {
    const { start_date, end_date, category } = params;
    const dateRange = { start: start_date ? new Date(start_date) : null, end: end_date ? new Date(end_date) : null };
    // @ts-ignore
    const stockByCategory = await getStockByCategory({ category, dateRange });

    return {
      status: true,
      message: "Category stock retrieved successfully",
      data: stockByCategory,
    };
  } catch (error) {
    console.error("getCategoryStock error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to fetch category stock",
      data: [],
    };
  }
};