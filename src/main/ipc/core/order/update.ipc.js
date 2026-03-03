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

    const updateData = {
      notes: params.notes,
      items: params.items,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

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
