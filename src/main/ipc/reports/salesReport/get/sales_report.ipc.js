//@ts-check
const { generateSalesReport } = require("../utils/salesReportUtils");


module.exports = async (params = {}) => {
  try {
    const data = await generateSalesReport(params);
    return {
      status: true,
      message: "Sales report generated successfully",
      data,
    };
  } catch (error) {
    console.error("getSalesReport error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate sales report",
      data: null,
    };
  }
};