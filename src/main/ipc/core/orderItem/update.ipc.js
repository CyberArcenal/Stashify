// src/main/ipc/orderItem/update.ipc.js


const orderItemService = require("../../../../services/OrderItem");

/**
 * Update an existing order item
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order item ID (required)
 * @param {number} [params.orderId] - Order ID
 * @param {number} [params.productId] - Product ID
 * @param {number} [params.quantity] - Quantity
 * @param {number} [params.unit_price] - Unit price
 * @param {number} [params.discount_amount] - Line discount amount
 * @param {number} [params.tax_rate] - Tax rate as percentage
 * @param {number} [params.line_net_total] - Computed net total
 * @param {number} [params.line_tax_total] - Computed tax total
 * @param {number} [params.line_gross_total] - Computed gross total
 * @param {number|null} [params.variantId] - Product variant ID (null to remove)
 * @param {number|null} [params.warehouseId] - Warehouse ID (null to remove)
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
    if (params.orderId !== undefined) {
      const orderId = Number(params.orderId);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return {
          status: false,
          message: "Invalid orderId. Must be a positive integer.",
          data: null,
        };
      }
      params.orderId = orderId;
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
        // allowed to null
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

    if (params.warehouseId !== undefined) {
      if (params.warehouseId === null) {
        // allowed
      } else {
        const warehouseId = Number(params.warehouseId);
        if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
          return {
            status: false,
            message: "Invalid warehouseId. Must be a positive integer or null.",
            data: null,
          };
        }
        params.warehouseId = warehouseId;
      }
    }

    // Validate numeric fields
    const numericFields = ['unit_price', 'discount_amount', 'tax_rate', 'line_net_total', 'line_tax_total', 'line_gross_total'];
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

    // Update order item using service
    const updatedItem = await orderItemService.update(id, updateData, user);

    return {
      status: true,
      message: "Order item updated successfully",
      data: updatedItem,
    };
  } catch (error) {
    console.error("Error in updateOrderItem:", error);
    return {
      status: false,
      message: error.message || "Failed to update order item",
      data: null,
    };
  }
};