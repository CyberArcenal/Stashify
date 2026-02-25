// src/main/ipc/category/delete.ipc.js

const categoryService = require("../../../../services/Category");

/**
 * Soft delete a category (set is_active = false)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Category ID (required)
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

    // Delete category using service (soft delete)
    const deletedCategory = await categoryService.delete(id, user);

    return {
      status: true,
      message: "Category deleted successfully",
      data: deletedCategory,
    };
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to delete category",
      data: null,
    };
  }
};