// src/main/ipc/product/get/all.ipc.js

const productService = require("../../../../../services/Product");

/**
 * Get all products with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {number} [params.categoryId] - Filter by category ID
 * @param {string} [params.search] - Search term (name, SKU, barcode)
 * @param {number} [params.minPrice] - Minimum net price
 * @param {number} [params.maxPrice] - Maximum net price
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

    // Validate categoryId if provided
    if (params.categoryId !== undefined) {
      const catId = Number(params.categoryId);
      if (!Number.isInteger(catId) || catId <= 0) {
        return {
          status: false,
          message: "Invalid categoryId. Must be a positive integer.",
          data: null,
        };
      }
      params.categoryId = catId;
    }

    // Validate price filters
    if (params.minPrice !== undefined) {
      const min = Number(params.minPrice);
      if (isNaN(min) || min < 0) {
        return {
          status: false,
          message: "minPrice must be a non-negative number.",
          data: null,
        };
      }
      params.minPrice = min;
    }
    if (params.maxPrice !== undefined) {
      const max = Number(params.maxPrice);
      if (isNaN(max) || max < 0) {
        return {
          status: false,
          message: "maxPrice must be a non-negative number.",
          data: null,
        };
      }
      params.maxPrice = max;
    }

    // Prepare options for service
    const options = {
      is_active: params.is_active,
      categoryId: params.categoryId,
      search: params.search,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch products from service
    const products = await productService.findAll(options);

    return {
      status: true,
      message: "Products retrieved successfully",
      data: products,
    };
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve products",
      data: null,
    };
  }
};