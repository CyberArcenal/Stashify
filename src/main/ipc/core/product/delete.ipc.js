// src/main/ipc/product/delete.ipc.js
const productService = require("../../../../services/Product");

/**
 * Soft delete a product (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Product ID (required)
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

    // Delete product using service (soft delete)
    const deletedProduct = await productService.delete(id, user);

    return {
      status: true,
      message: "Product deleted successfully",
      data: deletedProduct,
    };
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    return {
      status: false,
      message: error.message || "Failed to delete product",
      data: null,
    };
  }
};