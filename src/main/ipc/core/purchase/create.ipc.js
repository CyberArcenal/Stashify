// src/main/ipc/purchase/create.ipc.js

const purchaseService = require("../../../../services/Purchase");

/**
 * Create a new purchase
 * @param {Object} params - Request parameters
 * @param {string} params.purchase_number - Unique purchase number (required)
 * @param {number} params.supplierId - Supplier ID (required)
 * @param {number} params.warehouseId - Warehouse ID (required)
 * @param {string} [params.notes] - Purchase notes
 * @param {Array<Object>} params.items - Array of purchase items (required)
 * @param {number} params.items[].productId - Product ID
 * @param {number} params.items[].quantity - Quantity
 * @param {number} [params.items[].unitCost] - Unit cost (optional, defaults to product cost_per_item)
 * @param {number} [params.items[].tax] - Tax amount (optional)
 * @param {number} [params.items[].variantId] - Variant ID (optional)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.purchase_number || typeof params.purchase_number !== "string" || params.purchase_number.trim() === "") {
      return {
        status: false,
        message: "Purchase number is required and must be a non-empty string.",
        data: null,
      };
    }
    if (!params.supplierId) {
      return {
        status: false,
        message: "Missing required parameter: supplierId",
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
    if (!params.items || !Array.isArray(params.items) || params.items.length === 0) {
      return {
        status: false,
        message: "At least one purchase item is required.",
        data: null,
      };
    }

    // Validate supplierId
    const supplierId = Number(params.supplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return {
        status: false,
        message: "Invalid supplierId. Must be a positive integer.",
        data: null,
      };
    }
    params.supplierId = supplierId;

    // Validate warehouseId
    const warehouseId = Number(params.warehouseId);
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      return {
        status: false,
        message: "Invalid warehouseId. Must be a positive integer.",
        data: null,
      };
    }
    params.warehouseId = warehouseId;

    // Validate each item
    for (let i = 0; i < params.items.length; i++) {
      const item = params.items[i];
      if (!item.productId) {
        return {
          status: false,
          message: `Item at index ${i} missing productId.`,
          data: null,
        };
      }
      const prodId = Number(item.productId);
      if (!Number.isInteger(prodId) || prodId <= 0) {
        return {
          status: false,
          message: `Item at index ${i}: productId must be a positive integer.`,
          data: null,
        };
      }
      item.productId = prodId;

      if (item.quantity === undefined || item.quantity === null) {
        return {
          status: false,
          message: `Item at index ${i} missing quantity.`,
          data: null,
        };
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return {
          status: false,
          message: `Item at index ${i}: quantity must be a positive integer.`,
          data: null,
        };
      }
      item.quantity = qty;

      if (item.unitCost !== undefined) {
        const cost = Number(item.unitCost);
        if (isNaN(cost) || cost < 0) {
          return {
            status: false,
            message: `Item at index ${i}: unitCost must be a non-negative number.`,
            data: null,
          };
        }
        item.unitCost = cost;
      }

      if (item.tax !== undefined) {
        const tax = Number(item.tax);
        if (isNaN(tax) || tax < 0) {
          return {
            status: false,
            message: `Item at index ${i}: tax must be a non-negative number.`,
            data: null,
          };
        }
        item.tax = tax;
      }

      if (item.variantId !== undefined && item.variantId !== null) {
        const varId = Number(item.variantId);
        if (!Number.isInteger(varId) || varId <= 0) {
          return {
            status: false,
            message: `Item at index ${i}: variantId must be a positive integer.`,
            data: null,
          };
        }
        item.variantId = varId;
      }
    }

    // Prepare data for service
    const purchaseData = {
      purchase_number: params.purchase_number.trim(),
      supplierId: params.supplierId,
      warehouseId: params.warehouseId,
      notes: params.notes,
      items: params.items,
    };

    // Create purchase using service
    const newPurchase = await purchaseService.create(purchaseData, user);

    return {
      status: true,
      message: "Purchase created successfully",
      data: newPurchase,
    };
  } catch (error) {
    console.error("Error in createPurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to create purchase",
      data: null,
    };
  }
};