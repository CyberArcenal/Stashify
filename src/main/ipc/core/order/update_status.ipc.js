// src/main/ipc/order/update_status.ipc.js


const orderService = require("../../../../services/Order");

/**
 * Update the status of an order
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order ID (required)
 * @param {string} params.status - New status (required)
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
    if (!params.status) {
      return {
        status: false,
        message: "Missing required parameter: status",
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

    // Validate status
    const validStatuses = ['initiated', 'pending', 'confirmed', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Update order status using service
    const updatedOrder = await orderService.updateStatus(id, params.status, user);

    return {
      status: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    };
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    return {
      status: false,
      message: error.message || "Failed to update order status",
      data: null,
    };
  }
};