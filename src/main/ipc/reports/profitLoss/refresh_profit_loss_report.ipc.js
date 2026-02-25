//@ts-check

const { generateProfitLossReport } = require("./utils/profitLossUtils");

/**
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await generateProfitLossReport(params);
    return {
      status: true,
      message: "Profit & Loss report refreshed successfully",
      data,
    };
  } catch (error) {
    console.error("refreshProfitLossReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to refresh profit & loss report",
      data: null,
    };
  }
};