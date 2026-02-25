// src/main/ipc/purchaseItem/create.ipc.js

const purchaseItemService = require("../../../../services/PurchaseItem");

/**
 * Create a new purchase item
 * @param {Object} params - Request parameters
 * @param {number} params.purchaseId - Purchase ID (required)
 * @param {number} params.productId - Product ID (required)
 * @param {number} params.quantity - Quantity (required, positive integer)
 * @param {number} [params.unit_cost] - Unit cost (optional, will use product's cost_per_item if not provided)
 * @param {number} [params.total] - Total (optional, will be computed as unit_cost * quantity if not provided)
 * @param {number} [params.variantId] - Variant ID (optional)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.purchaseId) {
      return {
        status: false,
        message: "Missing required parameter: purchaseId",
        data: null,
      };
    }
    if (!params.productId) {
      return {
        status: false,
        message: "Missing required parameter: productId",
        data: null,
      };
    }
    if (params.quantity === undefined || params.quantity === null) {
      return {
        status: false,
        message: "Missing required parameter: quantity",
        data: null,
      };
    }

    // Convert and validate IDs
    const purchaseId = Number(params.purchaseId);
    if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
      return {
        status: false,
        message: "Invalid purchaseId. Must be a positive integer.",
        data: null,
      };
    }
    params.purchaseId = purchaseId;

    const productId = Number(params.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return {
        status: false,
        message: "Invalid productId. Must be a positive integer.",
        data: null,
      };
    }
    params.productId = productId;

    // Validate quantity
    const quantity = Number(params.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        status: false,
        message: "Invalid quantity. Must be a positive integer.",
        data: null,
      };
    }
    params.quantity = quantity;

    // Validate optional variantId
    if (params.variantId !== undefined && params.variantId !== null) {
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

    // Validate numeric fields (unit_cost, total)
    const numericFields = ['unit_cost', 'total'];
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

    // Prepare data for service
    const itemData = {
      purchaseId: params.purchaseId,
      productId: params.productId,
      quantity: params.quantity,
      unit_cost: params.unit_cost,
      total: params.total,
      variantId: params.variantId,
    };

    // Remove undefined values
    Object.keys(itemData).forEach(key => itemData[key] === undefined && delete itemData[key]);

    // Create purchase item using service
    const newItem = await purchaseItemService.create(itemData, user);

    return {
      status: true,
      message: "Purchase item created successfully",
      data: newItem,
    };
  } catch (error) {
    console.error("Error in createPurchaseItem:", error);
    return {
      status: false,
      message: error.message || "Failed to create purchase item",
      data: null,
    };
  }
};