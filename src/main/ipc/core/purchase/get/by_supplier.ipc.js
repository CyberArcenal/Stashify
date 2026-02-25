// src/main/ipc/purchase/get/by_supplier.ipc.js

const purchaseService = require("../../../../../services/Purchase");

/**
 * Get purchases for a specific supplier
 * @param {Object} params - Request parameters
 * @param {number} params.supplierId - Supplier ID (required)
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.sortBy='created_at'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required supplierId
    if (!params.supplierId) {
      return {
        status: false,
        message: "Missing required parameter: supplierId",
        data: null,
      };
    }

    const supplierId = Number(params.supplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return {
        status: false,
        message: "Invalid supplierId. Must be a positive integer.",
        data: null,
      };
    }

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
      supplierId,
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
    };

    // Remove undefined
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    const purchases = await purchaseService.findAll(options);

    return {
      status: true,
      message: "Purchases retrieved successfully",
      data: purchases,
    };
  } catch (error) {
    console.error("Error in getPurchaseBySupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchases for supplier",
      data: null,
    };
  }
};