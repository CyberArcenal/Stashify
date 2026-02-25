// src/main/ipc/productImage/update.ipc.js
const productImageService = require("../../../../services/ProductImage");

/**
 * Update an existing product image
 * @param {Object} params - Request parameters
 * @param {number} params.id - Product image ID (required)
 * @param {number} [params.productId] - Product ID
 * @param {string} [params.image_url] - Image URL
 * @param {string} [params.image_path] - Image file path
 * @param {string} [params.alt_text] - Alt text
 * @param {boolean} [params.is_primary] - Primary status
 * @param {number} [params.sort_order] - Sort order
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
    params.id = id;

    // Validate productId if provided
    if (params.productId !== undefined) {
      const productId = Number(params.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return {
          status: false,
          message: "Invalid productId. Must be a positive integer.",
          data: null,
        };
      }
      params.productId = productId;
    }

    // Validate is_primary if provided
    if (params.is_primary !== undefined && typeof params.is_primary !== "boolean") {
      return {
        status: false,
        message: "Invalid is_primary. Must be a boolean value.",
        data: null,
      };
    }

    // Validate sort_order if provided
    if (params.sort_order !== undefined) {
      const sortOrder = Number(params.sort_order);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        return {
          status: false,
          message: "Invalid sort_order. Must be a non-negative integer.",
          data: null,
        };
      }
      params.sort_order = sortOrder;
    }

    // Prepare update data (excluding id)
    const { id: _, ...updateData } = params;

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update product image using service
    const updatedImage = await productImageService.update(id, updateData, user);

    return {
      status: true,
      message: "Product image updated successfully",
      data: updatedImage,
    };
  } catch (error) {
    console.error("Error in updateProductImage:", error);
    return {
      status: false,
      message: error.message || "Failed to update product image",
      data: null,
    };
  }
};