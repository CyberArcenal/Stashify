//@ts-check

const { generateSalesReport } = require("./utils/salesReportUtils");


module.exports = async (params = {}) => {
  try {
    const data = await generateSalesReport(params);
    return {
      status: true,
      message: "Sales report refreshed successfully",
      data,
    };
  } catch (error) {
    console.error("refreshSalesReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to refresh sales report",
      data: null,
    };
  }
};