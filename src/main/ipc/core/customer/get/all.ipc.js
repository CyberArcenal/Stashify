// src/main/ipc/customer/get/all.ipc.js
// @ts-check
const customerService = require("../../../../../services/Customer");

/**
 * Get all customers with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {string} [params.search] - Search term (name, email, phone)
 * @param {string} [params.status] - Filter by customer status ('regular', 'vip', 'elite')
 * @param {string} [params.sortBy='createdAt'] - Sort field
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

    // Validate status if provided
    if (params.status && !['regular', 'vip', 'elite'].includes(params.status)) {
      return {
        status: false,
        message: "Invalid status. Must be one of: regular, vip, elite.",
        data: null,
      };
    }

    // Prepare options for service
    const options = {
      search: params.search,
      status: params.status,
      sortBy: params.sortBy || "createdAt",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    // @ts-ignore
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch customers from service
    const customers = await customerService.findAll(options);

    return {
      status: true,
      message: "Customers retrieved successfully",
      data: customers,
    };
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to retrieve customers",
      data: null,
    };
  }
};