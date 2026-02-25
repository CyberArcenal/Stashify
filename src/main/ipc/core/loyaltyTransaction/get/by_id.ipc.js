// src/main/ipc/loyaltyTransaction/get/by_id.ipc.js


const loyaltyTransactionService = require("../../../../../services/LoyaltyTransaction");


/**
 * Get a single loyalty transaction by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Transaction ID
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

    // Fetch transaction from service
    const transaction = await loyaltyTransactionService.findById(id);

    return {
      status: true,
      message: "Loyalty transaction retrieved successfully",
      data: transaction,
    };
  } catch (error) {
    console.error("Error in getLoyaltyTransactionById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve loyalty transaction",
      data: null,
    };
  }
};