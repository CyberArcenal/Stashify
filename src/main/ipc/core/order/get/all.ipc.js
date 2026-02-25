// src/main/ipc/order/get/all.ipc.js


const orderService = require("../../../../../services/Order");

/**
 * Get all orders with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {string} [params.status] - Filter by order status
 * @param {number} [params.customerId] - Filter by customer ID
 * @param {string} [params.startDate] - Filter by start date (ISO string)
 * @param {string} [params.endDate] - Filter by end date (ISO string)
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

    // Validate status if provided (based on Order entity CHECK constraint)
    const validStatuses = ['initiated', 'pending', 'confirmed', 'completed', 'cancelled', 'refunded'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Validate date strings if provided
    if (params.startDate && isNaN(Date.parse(params.startDate))) {
      return {
        status: false,
        message: "Invalid startDate. Must be a valid ISO date string.",
        data: null,
      };
    }
    if (params.endDate && isNaN(Date.parse(params.endDate))) {
      return {
        status: false,
        message: "Invalid endDate. Must be a valid ISO date string.",
        data: null,
      };
    }

    // Validate customerId if provided
    if (params.customerId !== undefined) {
      const custId = Number(params.customerId);
      if (!Number.isInteger(custId) || custId <= 0) {
        return {
          status: false,
          message: "Invalid customerId. Must be a positive integer.",
          data: null,
        };
      }
      params.customerId = custId;
    }

    // Prepare options for service
    const options = {
      status: params.status,
      customerId: params.customerId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch orders from service
    const orders = await orderService.findAll(options);

    return {
      status: true,
      message: "Orders retrieved successfully",
      data: orders,
    };
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve orders",
      data: null,
    };
  }
};