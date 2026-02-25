// src/main/ipc/purchaseItem/update.ipc.js

const purchaseItemService = require("../../../../services/PurchaseItem");

/**
 * Update an existing purchase item
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase item ID (required)
 * @param {number} [params.purchaseId] - Purchase ID
 * @param {number} [params.productId] - Product ID
 * @param {number} [params.quantity] - Quantity
 * @param {number} [params.unit_cost] - Unit cost
 * @param {number} [params.total] - Total
 * @param {number|null} [params.variantId] - Variant ID (null to remove)
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
    if (params.purchaseId !== undefined) {
      const purchaseId = Number(params.purchaseId);
      if (!Number.isInteger(purchaseId) || purchaseId <= 0) {
        return {
          status: false,
          message: "Invalid purchaseId. Must be a positive integer.",
          data: null,
        };
      }
      params.purchaseId = purchaseId;
    }

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

    if (params.quantity !== undefined) {
      const quantity = Number(params.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return {
          status: false,
          message: "Invalid quantity. Must be a positive integer.",
          data: null,
        };
      }
      params.quantity = quantity;
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

    // Update purchase item using service
    const updatedItem = await purchaseItemService.update(id, updateData, user);

    return {
      status: true,
      message: "Purchase item updated successfully",
      data: updatedItem,
    };
  } catch (error) {
    console.error("Error in updatePurchaseItem:", error);
    return {
      status: false,
      message: error.message || "Failed to update purchase item",
      data: null,
    };
  }
};