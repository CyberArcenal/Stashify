// src/main/ipc/orderItem/get/by_id.ipc.js


const orderItemService = require("../../../../../services/OrderItem");

/**
 * Get a single order item by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order item ID
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

    // Fetch order item from service
    const item = await orderItemService.findById(id);

    return {
      status: true,
      message: "Order item retrieved successfully",
      data: item,
    };
  } catch (error) {
    console.error("Error in getOrderItemById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve order item",
      data: null,
    };
  }
};