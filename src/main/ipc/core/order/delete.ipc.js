// src/main/ipc/order/delete.ipc.js


const orderService = require("../../../../services/Order");

/**
 * Soft delete an order (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order ID (required)
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

    // Delete order using service (soft delete)
    const deletedOrder = await orderService.delete(id, user);

    return {
      status: true,
      message: "Order deleted successfully",
      data: deletedOrder,
    };
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    return {
      status: false,
      message: error.message || "Failed to delete order",
      data: null,
    };
  }
};