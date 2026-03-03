// src/main/ipc/productVariant/update.ipc.js

const productVariantService = require("../../../../services/ProductVariant");

/**
 * Update an existing product variant
 * @param {Object} params - Request parameters
 * @param {number} params.id - Variant ID (required)
 * @param {number} [params.productId] - Product ID
 * @param {string} [params.name] - Variant name
 * @param {string} [params.sku] - SKU
 * @param {number} [params.net_price] - Net price
 * @param {number} [params.cost_per_item] - Cost per item
 * @param {string} [params.barcode] - Barcode
 * @param {boolean} [params.is_active] - Active status
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

    // Validate name if provided
    if (params.name !== undefined && (typeof params.name !== "string" || params.name.trim() === "")) {
      return {
        status: false,
        message: "name must be a non-empty string.",
        data: null,
      };
    }

    // Validate numeric fields
    if (params.net_price !== undefined) {
      const price = Number(params.net_price);
      if (isNaN(price) || price < 0) {
        return {
          status: false,
          message: "net_price must be a non-negative number.",
          data: null,
        };
      }
      params.net_price = price;
    }
    if (params.cost_per_item !== undefined) {
      const cost = Number(params.cost_per_item);
      if (isNaN(cost) || cost < 0) {
        return {
          status: false,
          message: "cost_per_item must be a non-negative number.",
          data: null,
        };
      }
      params.cost_per_item = cost;
    }

    // Prepare update data (excluding id)
    const { id: _, ...updateData } = params;

    // Trim strings
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.sku) updateData.sku = updateData.sku.trim();
    if (updateData.barcode) updateData.barcode = updateData.barcode.trim();

    // Remove undefined
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update variant using service
    const updatedVariant = await productVariantService.update(id, updateData, user, queryRunner);

    return {
      status: true,
      message: "Product variant updated successfully",
      data: updatedVariant,
    };
  } catch (error) {
    console.error("Error in updateProductVariant:", error);
    return {
      status: false,
      message: error.message || "Failed to update product variant",
      data: null,
    };
  }
};