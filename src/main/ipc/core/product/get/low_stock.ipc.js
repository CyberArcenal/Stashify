// src/main/ipc/product/get/low_stock.ipc.js


const productService = require("../../../../../services/Product");

/**
 * Get products with low stock (based on threshold or reorder level)
 * @param {Object} params - Request parameters
 * @param {number} [params.threshold] - Custom threshold (optional)
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    let threshold;
    if (params.threshold !== undefined) {
      threshold = Number(params.threshold);
      if (isNaN(threshold) || threshold < 0) {
        return {
          status: false,
          message: "threshold must be a non-negative number.",
          data: null,
        };
      }
    }

    const lowStockItems = await productService.getLowStock(threshold);

    return {
      status: true,
      message: "Low stock products retrieved successfully",
      data: lowStockItems,
    };
  } catch (error) {
    console.error("Error in getLowStockProducts:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve low stock products",
      data: null,
    };
  }
};