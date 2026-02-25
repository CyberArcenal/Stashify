// src/main/ipc/inventoryReport/get/stock_movements.ipc.js
//@ts-check
const { getStockMovements } = require("../utils/inventoryReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 *   months?: number;
 *   group_by?: "day" | "week" | "month" | "year";
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any[] }>}
 */
module.exports = async (params = {}) => {
  try {
    const { start_date, end_date, months, group_by = "month" } = params;
    let dateRange;
    if (months) {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - months);
      dateRange = { start, end };
    } else if (start_date && end_date) {
      dateRange = { start: new Date(start_date), end: new Date(end_date) };
    } else {
      // Default to last 6 months
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      dateRange = { start, end };
    }

    // @ts-ignore
    const movements = await getStockMovements({ dateRange, groupBy: group_by });

    return {
      status: true,
      message: "Stock movements retrieved successfully",
      data: movements,
    };
  } catch (error) {
    console.error("getStockMovements error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to fetch stock movements",
      data: [],
    };
  }
};