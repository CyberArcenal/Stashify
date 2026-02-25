//@ts-check
const { getSalesTargets } = require("../utils/salesReportUtils");

/**
 * @param {{
 *   start_date?: string;
 *   end_date?: string;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await getSalesTargets(params);
    return {
      status: true,
      message: "Sales targets retrieved successfully",
      data,
    };
  } catch (error) {
    console.error("getSalesTargets error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get sales targets",
      data: [],
    };
  }
};