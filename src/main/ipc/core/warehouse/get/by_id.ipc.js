// src/main/ipc/warehouse/get/by_id.ipc.js


const warehouseService = require("../../../../../services/Warehouse");

/**
 * Get a single warehouse by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Warehouse ID
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

    // Fetch warehouse from service
    const warehouse = await warehouseService.findById(id);

    return {
      status: true,
      message: "Warehouse retrieved successfully",
      data: warehouse,
    };
  } catch (error) {
    console.error("Error in getWarehouseById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve warehouse",
      data: null,
    };
  }
};