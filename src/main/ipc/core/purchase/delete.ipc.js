// src/main/ipc/purchase/delete.ipc.js


const purchaseService = require("../../../../services/Purchase");

/**
 * Soft delete a purchase (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase ID (required)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
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

    // Delete purchase using service (soft delete)
    const deletedPurchase = await purchaseService.delete(id, user);

    return {
      status: true,
      message: "Purchase deleted successfully",
      data: deletedPurchase,
    };
  } catch (error) {
    console.error("Error in deletePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to delete purchase",
      data: null,
    };
  }
};