// src/main/ipc/product/update.ipc.js

const productService = require("../../../../services/Product");

/**
 * Update an existing product
 * @param {Object} params - Request parameters
 * @param {number} params.id - Product ID (required)
 * @param {string} [params.name] - Product name
 * @param {string} [params.sku] - SKU
 * @param {string} [params.slug] - URL slug
 * @param {string} [params.description] - Description
 * @param {number} [params.net_price] - Net price
 * @param {number} [params.cost_per_item] - Cost per item
 * @param {boolean} [params.track_quantity] - Track quantity
 * @param {boolean} [params.allow_backorder] - Allow backorder
 * @param {number} [params.compare_price] - Compare price
 * @param {string} [params.barcode] - Barcode
 * @param {number} [params.weight] - Weight
 * @param {string} [params.dimensions] - Dimensions
 * @param {boolean} [params.is_published] - Published status
 * @param {boolean} [params.is_active] - Active status
 * @param {number|null} [params.categoryId] - Category ID (null to remove)
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

    // Validate categoryId if provided
    if (params.categoryId !== undefined && params.categoryId !== null) {
      const catId = Number(params.categoryId);
      if (!Number.isInteger(catId) || catId <= 0) {
        return {
          status: false,
          message: "Invalid categoryId. Must be a positive integer or null.",
          data: null,
        };
      }
      params.categoryId = catId;
    }

    // Validate numeric fields
    const numericFields = ['net_price', 'cost_per_item', 'compare_price', 'weight'];
    for (const field of numericFields) {
      if (params[field] !== undefined) {
        const val = Number(params[field]);
        if (isNaN(val) || val < 0) {
          return {
            status: false,
            message: `${field} must be a non-negative number.`,
            data: null,
          };
        }
        params[field] = val;
      }
    }

    // Prepare update data (excluding id)
    const { id: _, ...updateData } = params;

    // Trim string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.sku) updateData.sku = updateData.sku.trim();
    if (updateData.slug) updateData.slug = updateData.slug.trim();
    if (updateData.description) updateData.description = updateData.description.trim();
    if (updateData.barcode) updateData.barcode = updateData.barcode.trim();
    if (updateData.dimensions) updateData.dimensions = updateData.dimensions.trim();

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update product using service
    const updatedProduct = await productService.update(id, updateData, user, queryRunner);

    return {
      status: true,
      message: "Product updated successfully",
      data: updatedProduct,
    };
  } catch (error) {
    console.error("Error in updateProduct:", error);
    return {
      status: false,
      message: error.message || "Failed to update product",
      data: null,
    };
  }
};