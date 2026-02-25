// src/main/ipc/productVariant/get/all.ipc.js
const productVariantService = require("../../../../../services/ProductVariant");

/**
 * Get all product variants with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {number} [params.productId] - Filter by product ID
 * @param {boolean} [params.is_active] - Filter by active status
 * @param {string} [params.search] - Search term (name, SKU, barcode)
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
      productId: params.productId,
      is_active: params.is_active,
      search: params.search,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch variants from service
    const variants = await productVariantService.findAll(options);

    return {
      status: true,
      message: "Product variants retrieved successfully",
      data: variants,
    };
  } catch (error) {
    console.error("Error in getAllProductVariants:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve product variants",
      data: null,
    };
  }
};