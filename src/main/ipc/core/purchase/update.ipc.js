// src/main/ipc/purchase/update.ipc.js

const purchaseService = require("../../../../services/Purchase");

/**
 * Update an existing purchase
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase ID (required)
 * @param {string} [params.purchase_number] - Unique purchase number
 * @param {number} [params.supplierId] - Supplier ID
 * @param {number} [params.warehouseId] - Warehouse ID
 * @param {string} [params.notes] - Purchase notes
 * @param {string} [params.status] - Purchase status
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

    // Validate purchase_number if provided
    if (params.purchase_number !== undefined && (typeof params.purchase_number !== "string" || params.purchase_number.trim() === "")) {
      return {
        status: false,
        message: "purchase_number must be a non-empty string.",
        data: null,
      };
    }

    // Validate status if provided
    const validStatuses = ['initiated', 'pending', 'confirmed', 'received', 'cancelled'];
    if (params.status && !validStatuses.includes(params.status)) {
      return {
        status: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
        data: null,
      };
    }

    // Validate supplierId if provided
    if (params.supplierId !== undefined) {
      const supplierId = Number(params.supplierId);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return {
          status: false,
          message: "Invalid supplierId. Must be a positive integer.",
          data: null,
        };
      }
      params.supplierId = supplierId;
    }

    // Validate warehouseId if provided
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
      purchase_number: params.purchase_number?.trim(),
      supplierId: params.supplierId,
      warehouseId: params.warehouseId,
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

    // Update purchase using service
    const updatedPurchase = await purchaseService.update(id, updateData, user);

    return {
      status: true,
      message: "Purchase updated successfully",
      data: updatedPurchase,
    };
  } catch (error) {
    console.error("Error in updatePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to update purchase",
      data: null,
    };
  }
};