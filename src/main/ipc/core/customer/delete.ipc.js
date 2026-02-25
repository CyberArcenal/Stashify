// src/main/ipc/customer/delete.ipc.js

const customerService = require("../../../../services/Customer");

/**
 * Delete a customer (hard delete)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Customer ID (required)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
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

    const result = await customerService.delete(id, user);

    return {
      status: true,
      message: "Customer deleted successfully",
      data: result,
    };
  } catch (error) {
    console.error("Error in deleteCustomer:", error);
    return {
      status: false,
      message: error.message || "Failed to delete customer",
      data: null,
    };
  }
};
