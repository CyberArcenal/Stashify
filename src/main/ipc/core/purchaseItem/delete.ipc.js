// src/main/ipc/purchaseItem/delete.ipc.js

const purchaseItemService = require("../../../../services/PurchaseItem");

/**
 * Soft delete a purchase item (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase item ID (required)
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

    // Delete purchase item using service (soft delete)
    const deletedItem = await purchaseItemService.delete(id, user);

    return {
      status: true,
      message: "Purchase item deleted successfully",
      data: deletedItem,
    };
  } catch (error) {
    console.error("Error in deletePurchaseItem:", error);
    return {
      status: false,
      message: error.message || "Failed to delete purchase item",
      data: null,
    };
  }
};