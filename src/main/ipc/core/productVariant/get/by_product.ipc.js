// src/main/ipc/productVariant/get/by_product.ipc.js
const productVariantService = require("../../../../../services/ProductVariant");

/**
 * Get variants for a specific product
 * @param {Object} params - Request parameters
 * @param {number} params.productId - Product ID (required)
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {string} [params.sortBy='created_at'] - Sort field
 * @param {string} [params.sortOrder='ASC'] - Sort order
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required productId
    if (!params.productId) {
      return {
        status: false,
        message: "Missing required parameter: productId",
        data: null,
      };
    }

    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
        data: null,
      };
    }
    params.productId = productId;

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
      productId,
      is_active: params.is_active,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    const variants = await productVariantService.findAll(options);

    return {
      status: true,
      message: "Product variants retrieved successfully",
      data: variants,
    };
  } catch (error) {
    console.error("Error in getVariantsByProduct:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve variants for product",
      data: null,
    };
  }
};