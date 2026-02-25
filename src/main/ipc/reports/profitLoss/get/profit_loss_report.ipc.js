//@ts-check
const { generateProfitLossReport } = require("../utils/profitLossUtils");


module.exports = async (params = {}) => {
  try {
    const data = await generateProfitLossReport(params);
    return {
      status: true,
      message: "Profit & Loss report generated successfully",
      data,
    };
  } catch (error) {
    console.error("getProfitLossReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate profit & loss report",
      data: null,
    };
  }
};