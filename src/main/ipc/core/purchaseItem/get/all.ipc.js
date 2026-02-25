// src/main/ipc/purchaseItem/get/all.ipc.js

const purchaseItemService = require("../../../../../services/PurchaseItem");

/**
 * Get all purchase items with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {number} [params.purchaseId] - Filter by purchase ID
 * @param {number} [params.productId] - Filter by product ID
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

    // Validate purchaseId if provided
    if (params.purchaseId !== undefined) {
      const purchaseId = Number(params.purchaseId);
      if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
        return {
          status: false,
          message: "Invalid purchaseId. Must be a positive integer.",
          data: null,
        };
      }
      params.purchaseId = purchaseId;
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

    // Prepare options for service
    const options = {
      purchaseId: params.purchaseId,
      productId: params.productId,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch purchase items from service
    const items = await purchaseItemService.findAll(options);

    return {
      status: true,
      message: "Purchase items retrieved successfully",
      data: items,
    };
  } catch (error) {
    console.error("Error in getAllPurchaseItems:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchase items",
      data: null,
    };
  }
};