// src/main/ipc/purchase/get/by_id.ipc.js


const purchaseService = require("../../../../../services/Purchase");

/**
 * Get a single purchase by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase ID
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

    // Fetch purchase from service
    const purchase = await purchaseService.findById(id);

    return {
      status: true,
      message: "Purchase retrieved successfully",
      data: purchase,
    };
  } catch (error) {
    console.error("Error in getPurchaseById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase",
      data: null,
    };
  }
};