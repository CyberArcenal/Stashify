// src/main/ipc/productImage/delete.ipc.js


const productImageService = require("../../../../services/ProductImage");

/**
 * Soft delete a product image (set is_deleted = true)
 * @param {Object} params - Request parameters
 * @param {number} params.id - Product image ID (required)
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

    // Delete product image using service (soft delete)
    const deletedImage = await productImageService.delete(id, user);

    return {
      status: true,
      message: "Product image deleted successfully",
      data: deletedImage,
    };
  } catch (error) {
    console.error("Error in deleteProductImage:", error);
    return {
      status: false,
      message: error.message || "Failed to delete product image",
      data: null,
    };
  }
};