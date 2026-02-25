// src/main/ipc/category/get/all.ipc.js


const categoryService = require("../../../../../services/Category");

/**
 * Get all categories with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {string} [params.search] - Search term for name or description
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

    // Prepare options for service
    const options = {
      is_active: params.is_active,
      search: params.search,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch categories from service
    const categories = await categoryService.findAll(options);

    return {
      status: true,
      message: "Categories retrieved successfully",
      data: categories,
    };
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve categories",
      data: null,
    };
  }
};