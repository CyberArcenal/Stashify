//@ts-check
const { getExpenseBreakdownData } = require("../utils/profitLossUtils");
const { getDateRange } = require("../utils/profitLossUtils"); // kunin natin ang date range helper

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 *   category?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const { start_date, end_date, category } = params;
    const dateRange = getDateRange({ period: "custom", start_date, end_date });
    const data = await getExpenseBreakdownData(dateRange, category);
    return {
      status: true,
      message: "Expense breakdown retrieved successfully",
      data,
    };
  } catch (error) {
    console.error("getExpenseBreakdown error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get expense breakdown",
      data: [],
    };
  }
};