// src/main/ipc/stockItem/update.ipc.js


const stockItemService = require("../../../../services/StockItem");

/**
 * Update an existing stock item
 * @param {Object} params - Request parameters
 * @param {number} params.id - Stock item ID (required)
 * @param {number} [params.productId] - Product ID
 * @param {number} [params.warehouseId] - Warehouse ID
 * @param {number|null} [params.variantId] - Variant ID (null to remove)
 * @param {number} [params.quantity] - Quantity
 * @param {number} [params.reorder_level] - Reorder level
 * @param {number} [params.low_stock_threshold] - Low stock threshold
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

    // Validate optional IDs
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
    if (params.warehouseId !== undefined) {
      const warehouseId = Number(params.warehouseId);
      if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
        return {
          status: false,
          message: "Invalid warehouseId. Must be a positive integer.",
          data: null,
        };
      }
      params.warehouseId = warehouseId;
    }
    if (params.variantId !== undefined) {
      if (params.variantId === null) {
        // allowed
      } else {
        const variantId = Number(params.variantId);
        if (!Number.isInteger(variantId) || variantId <= 0) {
          return {
            status: false,
            message: "Invalid variantId. Must be a positive integer or null.",
            data: null,
          };
        }
        params.variantId = variantId;
      }
    }

    // Validate numeric fields
    const numericFields = ['quantity', 'reorder_level', 'low_stock_threshold'];
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

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update stock item using service
    const updatedStockItem = await stockItemService.update(id, updateData, user);

    return {
      status: true,
      message: "Stock item updated successfully",
      data: updatedStockItem,
    };
  } catch (error) {
    console.error("Error in updateStockItem:", error);
    return {
      status: false,
      message: error.message || "Failed to update stock item",
      data: null,
    };
  }
};