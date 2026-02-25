// src/main/ipc/productVariant/delete.ipc.js


const productVariantService = require("../../../../services/ProductVariant");

/**
 * Soft delete a product variant (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Variant ID (required)
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

    // Delete variant using service (soft delete)
    const deletedVariant = await productVariantService.delete(id, user);

    return {
      status: true,
      message: "Product variant deleted successfully",
      data: deletedVariant,
    };
  } catch (error) {
    console.error("Error in deleteProductVariant:", error);
    return {
      status: false,
      message: error.message || "Failed to delete product variant",
      data: null,
    };
  }
};