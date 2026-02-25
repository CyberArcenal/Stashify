// src/main/ipc/stockMovement/get/by_id.ipc.js
const stockMovementService = require("../../../../../services/StockMovement");

/**
 * Get a single stock movement by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Stock movement ID
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

    // Fetch movement from service
    const movement = await stockMovementService.findById(id);

    return {
      status: true,
      message: "Stock movement retrieved successfully",
      data: movement,
    };
  } catch (error) {
    console.error("Error in getStockMovementById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve stock movement",
      data: null,
    };
  }
};