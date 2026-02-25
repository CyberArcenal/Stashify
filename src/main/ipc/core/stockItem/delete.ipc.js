// src/main/ipc/stockItem/delete.ipc.js

const stockItemService = require("../../../../services/StockItem");

/**
 * Soft delete a stock item (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Stock item ID (required)
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

    // Delete stock item using service (soft delete)
    const deletedStockItem = await stockItemService.delete(id, user);

    return {
      status: true,
      message: "Stock item deleted successfully",
      data: deletedStockItem,
    };
  } catch (error) {
    console.error("Error in deleteStockItem:", error);
    return {
      status: false,
      message: error.message || "Failed to delete stock item",
      data: null,
    };
  }
};