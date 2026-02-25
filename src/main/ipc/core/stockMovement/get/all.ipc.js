// src/main/ipc/stockMovement/get/all.ipc.js
const stockMovementService = require("../../../../../services/StockMovement");

/**
 * Get all stock movements with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {number} [params.stockItemId] - Filter by stock item ID
 * @param {string} [params.movement_type] - Filter by movement type ('in','out','transfer_out','transfer_in','adjustment')
 * @param {string} [params.reference_code] - Filter by reference code (partial match)
 * @param {string} [params.startDate] - Filter by start date (ISO string)
 * @param {string} [params.endDate] - Filter by end date (ISO string)
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

    // Validate movement_type if provided
    const validTypes = ['in', 'out', 'transfer_out', 'transfer_in', 'adjustment'];
    if (params.movement_type && !validTypes.includes(params.movement_type)) {
      return {
        status: false,
        message: `Invalid movement_type. Must be one of: ${validTypes.join(', ')}.`,
        data: null,
      };
    }

    // Validate date strings if provided
    if (params.startDate && isNaN(Date.parse(params.startDate))) {
      return {
        status: false,
        message: "Invalid startDate. Must be a valid ISO date string.",
        data: null,
      };
    }
    if (params.endDate && isNaN(Date.parse(params.endDate))) {
      return {
        status: false,
        message: "Invalid endDate. Must be a valid ISO date string.",
        data: null,
      };
    }

    // Validate stockItemId if provided
    if (params.stockItemId !== undefined) {
      const id = Number(params.stockItemId);
      if (!Number.isInteger(id) || id <= 0) {
        return {
          status: false,
          message: "Invalid stockItemId. Must be a positive integer.",
          data: null,
        };
      }
      params.stockItemId = id;
    }

    // Prepare options for service
    const options = {
      stockItemId: params.stockItemId,
      movement_type: params.movement_type,
      reference_code: params.reference_code,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch movements from service
    const movements = await stockMovementService.findAll(options);

    return {
      status: true,
      message: "Stock movements retrieved successfully",
      data: movements,
    };
  } catch (error) {
    console.error("Error in getAllStockMovements:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve stock movements",
      data: null,
    };
  }
};