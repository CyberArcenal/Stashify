// src/main/ipc/supplier/get/all.ipc.js


const supplierService = require("../../../../../services/Supplier");

/**
 * Get all suppliers with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {string} [params.status] - Filter by status ('pending', 'approved', 'rejected')
 * @param {string} [params.search] - Search term (name, contact_person, email)
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

    // Validate status if provided
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Validate is_active if provided
    if (params.is_active !== undefined && typeof params.is_active !== "boolean") {
      return {
        status: false,
        message: "Invalid is_active. Must be a boolean value.",
        data: null,
      };
    }

    // Prepare options for service
    const options = {
      is_active: params.is_active,
      status: params.status,
      search: params.search,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch suppliers from service
    const suppliers = await supplierService.findAll(options);

    return {
      status: true,
      message: "Suppliers retrieved successfully",
      data: suppliers,
    };
  } catch (error) {
    console.error("Error in getAllSuppliers:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve suppliers",
      data: null,
    };
  }
};