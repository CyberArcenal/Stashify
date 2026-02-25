// src/main/ipc/stockItem/adjust.ipc.js

const StockItem = require("../../../../entities/StockItem");
const StockMovement = require("../../../../entities/StockMovement");
const auditLogger = require("../../../../utils/auditLogger");
const { saveDb, updateDb } = require("../../../../utils/dbUtils/dbActions");

/**
 * Adjust stock quantity (increase or decrease) with reason
 * @param {Object} params - Request parameters
 * @param {number} params.stockItemId - Stock item ID (required)
 * @param {number} params.adjustment - Amount to adjust (positive to increase, negative to decrease)
 * @param {string} params.reason - Reason for adjustment (required)
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.stockItemId) {
      return {
        status: false,
        message: "Missing required parameter: stockItemId",
        data: null,
      };
    }
    if (params.adjustment === undefined || params.adjustment === null) {
      return {
        status: false,
        message: "Missing required parameter: adjustment",
        data: null,
      };
    }
    if (!params.reason || typeof params.reason !== "string" || params.reason.trim() === "") {
      return {
        status: false,
        message: "Reason is required and must be a non-empty string.",
        data: null,
      };
    }

    const stockItemId = Number(params.stockItemId);
    if (!Number.isInteger(stockItemId) || stockItemId <= 0) {
      return {
        status: false,
        message: "Invalid stockItemId. Must be a positive integer.",
        data: null,
      };
    }

    const adjustment = Number(params.adjustment);
    if (isNaN(adjustment) || adjustment === 0) {
      return {
        status: false,
        message: "adjustment must be a non-zero number.",
        data: null,
      };
    }

    // Get repositories from query runner
    const stockRepo = queryRunner.manager.getRepository(StockItem);
    const movementRepo = queryRunner.manager.getRepository(StockMovement);

    // Fetch stock item
    const stockItem = await stockRepo.findOne({
      where: { id: stockItemId, is_deleted: false },
      relations: ["warehouse"],
    });
    if (!stockItem) {
      return {
        status: false,
        message: `Stock item with ID ${stockItemId} not found.`,
        data: null,
      };
    }

    // Check if adjustment would make quantity negative
    if (stockItem.quantity + adjustment < 0) {
      return {
        status: false,
        message: `Insufficient quantity. Current: ${stockItem.quantity}, adjustment: ${adjustment}`,
        data: null,
      };
    }

    // Perform adjustment
    const oldData = { ...stockItem };
    stockItem.quantity += adjustment;
    stockItem.updated_at = new Date();

    await updateDb(stockRepo, stockItem);

    // Create stock movement record
    const movementType = adjustment > 0 ? 'in' : 'out';
    const movement = movementRepo.create({
      stockItem,
      warehouse: stockItem.warehouse,
      change: adjustment,
      movement_type: 'adjustment',
      reference_code: `ADJ-${Date.now()}`,
      reason: params.reason.trim(),
      metadata: JSON.stringify({ previousQuantity: oldData.quantity, newQuantity: stockItem.quantity }),
      current_quantity: stockItem.quantity,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await saveDb(movementRepo, movement);

    // Log audit
    await auditLogger.logUpdate("StockItem", stockItemId, oldData, stockItem, user, queryRunner);

    return {
      status: true,
      message: "Stock adjusted successfully",
      data: {
        stockItem,
        adjustment,
        movement,
      },
    };
  } catch (error) {
    console.error("Error in adjustStock:", error);
    return {
      status: false,
      message: error.message || "Failed to adjust stock",
      data: null,
    };
  }
};