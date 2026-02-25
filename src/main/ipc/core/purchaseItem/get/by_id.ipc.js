// src/main/ipc/purchaseItem/get/by_id.ipc.js

const purchaseItemService = require("../../../../../services/PurchaseItem");

/**
 * Get a single purchase item by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase item ID
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

    // Fetch purchase item from service
    const item = await purchaseItemService.findById(id);

    return {
      status: true,
      message: "Purchase item retrieved successfully",
      data: item,
    };
  } catch (error) {
    console.error("Error in getPurchaseItemById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase item",
      data: null,
    };
  }
};