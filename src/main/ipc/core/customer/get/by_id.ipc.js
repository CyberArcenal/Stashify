// src/main/ipc/customer/get/by_id.ipc.js
// @ts-check
const customerService = require("../../../../../services/Customer");

/**
 * Get a single customer by ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - Customer ID
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

    // Fetch customer from service
    const customer = await customerService.findById(id);

    return {
      status: true,
      message: "Customer retrieved successfully",
      data: customer,
    };
  } catch (error) {
    console.error("Error in getCustomerById:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to retrieve customer",
      data: null,
    };
  }
};
