// src/main/ipc/warehouse/delete.ipc.js

const warehouseService = require("../../../../services/Warehouse");

/**
 * Soft delete a warehouse (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Warehouse ID (required)
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

    // Delete warehouse using service (soft delete)
    const deletedWarehouse = await warehouseService.delete(id, user);

    return {
      status: true,
      message: "Warehouse deleted successfully",
      data: deletedWarehouse,
    };
  } catch (error) {
    console.error("Error in deleteWarehouse:", error);
    return {
      status: false,
      message: error.message || "Failed to delete warehouse",
      data: null,
    };
  }
};