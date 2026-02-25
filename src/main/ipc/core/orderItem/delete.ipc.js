// src/main/ipc/orderItem/delete.ipc.js


const orderItemService = require("../../../../services/OrderItem");

/**
 * Soft delete an order item (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order item ID (required)
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

    // Delete order item using service (soft delete)
    const deletedItem = await orderItemService.delete(id, user);

    return {
      status: true,
      message: "Order item deleted successfully",
      data: deletedItem,
    };
  } catch (error) {
    console.error("Error in deleteOrderItem:", error);
    return {
      status: false,
      message: error.message || "Failed to delete order item",
      data: null,
    };
  }
};