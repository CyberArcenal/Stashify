// src/main/ipc/stockItem/create.ipc.js


const stockItemService = require("../../../../services/StockItem");

/**
 * Create a new stock item
 * @param {Object} params - Request parameters
 * @param {number} params.productId - Product ID (required)
 * @param {number} params.warehouseId - Warehouse ID (required)
 * @param {number} [params.variantId] - Variant ID (optional)
 * @param {number} [params.quantity=0] - Initial quantity
 * @param {number} [params.reorder_level=0] - Reorder level
 * @param {number} [params.low_stock_threshold] - Low stock threshold (optional)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.productId) {
      return {
        status: false,
        message: "Missing required parameter: productId",
        data: null,
      };
    }
    if (!params.warehouseId) {
      return {
        status: false,
        message: "Missing required parameter: warehouseId",
        data: null,
      };
    }

    // Convert and validate IDs
    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
        data: null,
      };
    }
    params.productId = productId;

    const warehouseId = Number(params.warehouseId);
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      return {
        status: false,
        message: "Invalid warehouseId. Must be a positive integer.",
        data: null,
      };
    }
    params.warehouseId = warehouseId;

    if (params.variantId !== undefined && params.variantId !== null) {
      const variantId = Number(params.variantId);
      if (!Number.isInteger(variantId) || variantId <= 0) {
        return {
          status: false,
          message: "Invalid variantId. Must be a positive integer.",
          data: null,
        };
      }
      params.variantId = variantId;
    }

    // Validate numeric fields
    if (params.quantity !== undefined) {
      const qty = Number(params.quantity);
      if (isNaN(qty) || qty < 0) {
        return {
          status: false,
          message: "quantity must be a non-negative number.",
          data: null,
        };
      }
      params.quantity = qty;
    }
    if (params.reorder_level !== undefined) {
      const level = Number(params.reorder_level);
      if (isNaN(level) || level < 0) {
        return {
          status: false,
          message: "reorder_level must be a non-negative number.",
          data: null,
        };
      }
      params.reorder_level = level;
    }
    if (params.low_stock_threshold !== undefined) {
      const threshold = Number(params.low_stock_threshold);
      if (isNaN(threshold) || threshold < 0) {
        return {
          status: false,
          message: "low_stock_threshold must be a non-negative number.",
          data: null,
        };
      }
      params.low_stock_threshold = threshold;
    }

    // Prepare data for service
    const stockData = {
      productId: params.productId,
      warehouseId: params.warehouseId,
      variantId: params.variantId,
      quantity: params.quantity !== undefined ? params.quantity : 0,
      reorder_level: params.reorder_level !== undefined ? params.reorder_level : 0,
      low_stock_threshold: params.low_stock_threshold,
    };

    // Create stock item using service
    const newStockItem = await stockItemService.create(stockData, user);

    return {
      status: true,
      message: "Stock item created successfully",
      data: newStockItem,
    };
  } catch (error) {
    console.error("Error in createStockItem:", error);
    return {
      status: false,
      message: error.message || "Failed to create stock item",
      data: null,
    };
  }
};