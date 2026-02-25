// src/main/ipc/order/get/by_id.ipc.js

const orderService = require("../../../../../services/Order");

/**
 * Get a single order by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order ID
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

    // Fetch order from service
    const order = await orderService.findById(id);

    return {
      status: true,
      message: "Order retrieved successfully",
      data: order,
    };
  } catch (error) {
    console.error("Error in getOrderById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve order",
      data: null,
    };
  }
};