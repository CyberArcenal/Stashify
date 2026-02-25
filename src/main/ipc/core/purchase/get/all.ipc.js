// src/main/ipc/purchase/get/all.ipc.js


const purchaseService = require("../../../../../services/Purchase");

/**
 * Get all purchases with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {string} [params.status] - Filter by purchase status
 * @param {number} [params.supplierId] - Filter by supplier ID
 * @param {number} [params.warehouseId] - Filter by warehouse ID
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

    // Validate status if provided (based on Purchase entity CHECK constraint)
    const validStatuses = ['initiated', 'pending', 'confirmed', 'received', 'cancelled'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
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

    // Validate supplierId if provided
    if (params.supplierId !== undefined) {
      const supplierId = Number(params.supplierId);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return {
          status: false,
          message: "Invalid supplierId. Must be a positive integer.",
          data: null,
        };
      }
      params.supplierId = supplierId;
    }

    // Validate warehouseId if provided
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

    // Prepare options for service
    const options = {
      status: params.status,
      supplierId: params.supplierId,
      warehouseId: params.warehouseId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      sortBy: params.sortBy || "created_at",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch purchases from service
    const purchases = await purchaseService.findAll(options);

    return {
      status: true,
      message: "Purchases retrieved successfully",
      data: purchases,
    };
  } catch (error) {
    console.error("Error in getAllPurchases:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve purchases",
      data: null,
    };
  }
};