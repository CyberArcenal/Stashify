// src/main/ipc/order/get/by_customer.ipc.js

const orderService = require("../../../../../services/Order");

/**
 * Get orders for a specific customer
 * @param {Object} params - Request parameters
 * @param {number} params.customerId - Customer ID (required)
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.sortBy='created_at'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required customerId
    if (!params.customerId) {
      return {
        status: false,
        message: "Missing required parameter: customerId",
        data: null,
      };
    }

    const customerId = Number(params.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return {
        status: false,
        message: "Invalid customerId. Must be a positive integer.",
        data: null,
      };
    }

    // Validate pagination
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

    // Prepare options for service
    const options = {
      customerId,
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
    };

    // Remove undefined
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    const orders = await orderService.findAll(options);

    return {
      status: true,
      message: "Orders retrieved successfully",
      data: orders,
    };
  } catch (error) {
    console.error("Error in getOrderByCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve orders for customer",
      data: null,
    };
  }
};