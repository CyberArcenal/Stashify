// src/main/ipc/order/update.ipc.js


const orderService = require("../../../../services/Order");

/**
 * Update an existing order
 * @param {Object} params - Request parameters
 * @param {number} params.id - Order ID (required)
 * @param {string} [params.order_number] - Unique order number
 * @param {number} [params.customerId] - Customer ID
 * @param {string} [params.notes] - Order notes
 * @param {string} [params.status] - Order status
 * @param {number} [params.subtotal] - Subtotal
 * @param {number} [params.tax_amount] - Tax amount
 * @param {number} [params.total] - Total
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

    // Validate order_number if provided
    if (params.order_number !== undefined && (typeof params.order_number !== "string" || params.order_number.trim() === "")) {
      return {
        status: false,
        message: "order_number must be a non-empty string.",
        data: null,
      };
    }

    // Validate status if provided
    const validStatuses = ['initiated', 'pending', 'confirmed', 'completed', 'cancelled', 'refunded'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Validate customerId if provided
    if (params.customerId !== undefined && params.customerId !== null) {
      const custId = Number(params.customerId);
      if (!Number.isInteger(custId) || custId <= 0) {
        return {
          status: false,
          message: "Invalid customerId. Must be a positive integer.",
          data: null,
        };
      }
      params.customerId = custId;
    }

    // Validate numeric fields if provided
    const numericFields = ['subtotal', 'tax_amount', 'total'];
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

    // Prepare update data
    const updateData = {
      order_number: params.order_number?.trim(),
      customerId: params.customerId,
      notes: params.notes,
      status: params.status,
      subtotal: params.subtotal,
      tax_amount: params.tax_amount,
      total: params.total,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (Object.keys(updateData).length === 0) {
      return {
        status: false,
        message: "No valid fields provided for update.",
        data: null,
      };
    }

    // Update order using service
    const updatedOrder = await orderService.update(id, updateData, user);

    return {
      status: true,
      message: "Order updated successfully",
      data: updatedOrder,
    };
  } catch (error) {
    console.error("Error in updateOrder:", error);
    return {
      status: false,
      message: error.message || "Failed to update order",
      data: null,
    };
  }
};