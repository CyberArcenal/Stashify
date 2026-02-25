// src/main/ipc/stockItem/get/all.ipc.js

const stockItemService = require("../../../../../services/StockItem");

/**
 * Get all stock items with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {number} [params.productId] - Filter by product ID
 * @param {number} [params.variantId] - Filter by variant ID
 * @param {number} [params.warehouseId] - Filter by warehouse ID
 * @param {number} [params.minQuantity] - Minimum quantity
 * @param {number} [params.maxQuantity] - Maximum quantity
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

    // Validate IDs if provided
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
    if (params.variantId !== undefined) {
      const variantId = Number(params.variantId);
      if (!Number.isInteger(variantId) || variantId <= 0) {
        return {
          status: false,
          message: "Invalid variantId. Must be a positive integer.",
          data: null,
        };
      }
      params.variantId = variantId;
    }
    if (params.warehouseId !== undefined) {
      const warehouseId = Number(params.warehouseId);
      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return {
          status: false,
          message: "Invalid warehouseId. Must be a positive integer.",
          data: null,
        };
      }
      params.warehouseId = warehouseId;
    }

    // Validate quantity filters
    if (params.minQuantity !== undefined) {
      const min = Number(params.minQuantity);
      if (isNaN(min) || min < 0) {
        return {
          status: false,
          message: "minQuantity must be a non-negative number.",
          data: null,
        };
      }
      params.minQuantity = min;
    }
    if (params.maxQuantity !== undefined) {
      const max = Number(params.maxQuantity);
      if (isNaN(max) || max < 0) {
        return {
          status: false,
          message: "maxQuantity must be a non-negative number.",
          data: null,
        };
      }
      params.maxQuantity = max;
    }

    // Prepare options for service
    const options = {
      productId: params.productId,
      variantId: params.variantId,
      warehouseId: params.warehouseId,
      minQuantity: params.minQuantity,
      maxQuantity: params.maxQuantity,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch stock items from service
    const stockItems = await stockItemService.findAll(options);

    return {
      status: true,
      message: "Stock items retrieved successfully",
      data: stockItems,
    };
  } catch (error) {
    console.error("Error in getAllStockItems:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve stock items",
      data: null,
    };
  }
};