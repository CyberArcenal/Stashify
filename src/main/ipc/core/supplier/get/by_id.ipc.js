// src/main/ipc/supplier/get/by_id.ipc.js

const supplierService = require("../../../../../services/Supplier");

/**
 * Get a single supplier by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Supplier ID
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required id
    if (!params.id) {
      return {
        status: false,
        message: "Missing required parameter: id",
        data: null,
      };
    }

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid id. Must be a positive integer.",
        data: null,
      };
    }

    // Fetch supplier from service
    const supplier = await supplierService.findById(id);

    return {
      status: true,
      message: "Supplier retrieved successfully",
      data: supplier,
    };
  } catch (error) {
    console.error("Error in getSupplierById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve supplier",
      data: null,
    };
  }
};