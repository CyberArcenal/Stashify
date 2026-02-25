// src/main/ipc/supplier/delete.ipc.js

const supplierService = require("../../../../services/Supplier");

/**
 * Soft delete a supplier (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Supplier ID (required)
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

    // Delete supplier using service (soft delete)
    const deletedSupplier = await supplierService.delete(id, user);

    return {
      status: true,
      message: "Supplier deleted successfully",
      data: deletedSupplier,
    };
  } catch (error) {
    console.error("Error in deleteSupplier:", error);
    return {
      status: false,
      message: error.message || "Failed to delete supplier",
      data: null,
    };
  }
};