// src/main/ipc/order/cancel.ipc.js


const orderService = require("../../../../services/Order");

/**
 * Cancel an order (set status to 'cancelled')
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

    // Update order status to 'cancelled'
    const updatedOrder = await orderService.update(id, { status: 'cancelled' }, user);

    return {
      status: true,
      message: "Order cancelled successfully",
      data: updatedOrder,
    };
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    return {
      status: false,
      message: error.message || "Failed to cancel order",
      data: null,
    };
  }
};