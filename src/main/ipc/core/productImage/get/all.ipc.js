// src/main/ipc/productImage/get/all.ipc.js


const productImageService = require("../../../../../services/ProductImage");

/**
 * Get all product images with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {number} [params.productId] - Filter by product ID
 * @param {boolean} [params.is_primary] - Filter by primary status
 * @param {string} [params.sortBy='sort_order'] - Sort field
 * @param {string} [params.sortOrder='ASC'] - Sort order ('ASC' or 'DESC')
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

    // Validate is_primary if provided
    if (params.is_primary !== undefined && typeof params.is_primary !== "boolean") {
      return {
        status: false,
        message: "Invalid is_primary. Must be a boolean value.",
        data: null,
      };
    }

    // Prepare options for service
    const options = {
      productId: params.productId,
      is_primary: params.is_primary,
      sortBy: params.sortBy || "sort_order",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch product images from service
    const images = await productImageService.findAll(options);

    return {
      status: true,
      message: "Product images retrieved successfully",
      data: images,
    };
  } catch (error) {
    console.error("Error in getAllProductImages:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve product images",
      data: null,
    };
  }
};