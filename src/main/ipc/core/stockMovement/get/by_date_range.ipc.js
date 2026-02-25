// src/main/ipc/stockMovement/get/by_date_range.ipc.js

const stockMovementService = require("../../../../../services/StockMovement");

/**
 * Get stock movements within a specific date range
 * @param {Object} params - Request parameters
 * @param {string} params.startDate - Start date (ISO string, required)
 * @param {string} params.endDate - End date (ISO string, required)
 * @param {number} [params.stockItemId] - Filter by stock item ID
 * @param {string} [params.movement_type] - Filter by movement type
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Items per page
 * @param {string} [params.sortBy='created_at'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required dates
    if (!params.startDate) {
      return {
        status: false,
        message: "Missing required parameter: startDate",
        data: null,
      };
    }
    if (!params.endDate) {
      return {
        status: false,
        message: "Missing required parameter: endDate",
        data: null,
      };
    }

    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);
    if (isNaN(startDate.getTime())) {
      return {
        status: false,
        message: "Invalid startDate. Must be a valid ISO date string.",
        data: null,
      };
    }
    if (isNaN(endDate.getTime())) {
      return {
        status: false,
        message: "Invalid endDate. Must be a valid ISO date string.",
        data: null,
      };
    }

    // Validate that startDate <= endDate
    if (startDate > endDate) {
      return {
        status: false,
        message: "startDate must be less than or equal to endDate.",
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
      startDate,
      endDate,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    const movements = await stockMovementService.findAll(options);

    return {
      status: true,
      message: "Stock movements in date range retrieved successfully",
      data: movements,
    };
  } catch (error) {
    console.error("Error in getMovementsByDateRange:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve movements by date range",
      data: null,
    };
  }
};