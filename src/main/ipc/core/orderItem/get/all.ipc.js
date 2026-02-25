// src/main/ipc/orderItem/get/all.ipc.js


const orderItemService = require("../../../../../services/OrderItem");

/**
 * Get all order items with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {number} [params.orderId] - Filter by order ID
 * @param {number} [params.productId] - Filter by product ID
 * @param {string} [params.sortBy='created_at'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order ('ASC' or 'DESC')
 * @param {number} [params.page] - Page number (1-based)
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate pagination parameters
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      return {
        status: false,
        message: "Invalid page number. Must be a positive integer.",
        data: null,
      };
    }
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
      return {
        status: false,
        message: "Invalid limit. Must be a positive integer.",
        data: null,
      };
    }

    // Validate orderId if provided
    if (params.orderId !== undefined) {
      const orderId = Number(params.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return {
          status: false,
          message: "Invalid orderId. Must be a positive integer.",
          data: null,
        };
      }
      params.orderId = orderId;
    }

    // Validate productId if provided
    if (params.productId !== undefined) {
      const productId = Number(params.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return {
          status: false,
          message: "Invalid productId. Must be a positive integer.",
          data: null,
        };
      }
      params.productId = productId;
    }

    // Prepare options for service
    const options = {
      orderId: params.orderId,
      productId: params.productId,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch order items from service
    const items = await orderItemService.findAll(options);

    return {
      status: true,
      message: "Order items retrieved successfully",
      data: items,
    };
  } catch (error) {
    console.error("Error in getAllOrderItems:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve order items",
      data: null,
    };
  }
};