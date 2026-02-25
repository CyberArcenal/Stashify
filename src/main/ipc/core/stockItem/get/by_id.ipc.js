// src/main/ipc/stockItem/get/by_id.ipc.js

const stockItemService = require("../../../../../services/StockItem");

/**
 * Get a single stock item by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Stock item ID
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required id
    if (!params.id) {
      return {
        status: false,
        message: "Missing required parameter: id",
        data: null,
      };
    }

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid id. Must be a positive integer.",
        data: null,
      };
    }

    // Fetch stock item from service
    const stockItem = await stockItemService.findById(id);

    return {
      status: true,
      message: "Stock item retrieved successfully",
      data: stockItem,
    };
  } catch (error) {
    console.error("Error in getStockItemById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve stock item",
      data: null,
    };
  }
};