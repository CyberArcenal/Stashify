// src/main/ipc/stockItem/transfer.ipc.js

const { AppDataSource } = require("../../../db/datasource");
const StockItem = require("../../../../entities/StockItem");
const StockMovement = require("../../../../entities/StockMovement");
const auditLogger = require("../../../../utils/auditLogger");
const { saveDb, updateDb } = require("../../../../utils/dbUtils/dbActions");

/**
 * Transfer stock quantity from one stock item to another
 * (e.g., between warehouses or between product/variant combinations)
 * @param {Object} params - Request parameters
 * @param {number} params.sourceStockItemId - Source stock item ID (required)
 * @param {number} params.destinationStockItemId - Destination stock item ID (required)
 * @param {number} params.quantity - Quantity to transfer (positive integer)
 * @param {string} [params.reason] - Reason for transfer
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.sourceStockItemId) {
      return {
        status: false,
        message: "Missing required parameter: sourceStockItemId",
        data: null,
      };
    }
    if (!params.destinationStockItemId) {
      return {
        status: false,
        message: "Missing required parameter: destinationStockItemId",
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

    const sourceId = Number(params.sourceStockItemId);
    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      return {
        status: false,
        message: "Invalid sourceStockItemId. Must be a positive integer.",
        data: null,
      };
    }

    const destId = Number(params.destinationStockItemId);
    if (!Number.isInteger(destId) || destId <= 0) {
      return {
        status: false,
        message: "Invalid destinationStockItemId. Must be a positive integer.",
        data: null,
      };
    }

    const quantity = Number(params.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        status: false,
        message: "quantity must be a positive integer.",
        data: null,
      };
    }

    // Get repositories from query runner
    const stockRepo = queryRunner.manager.getRepository(StockItem);
    const movementRepo = queryRunner.manager.getRepository(StockMovement);

    // Fetch source and destination stock items
    const sourceItem = await stockRepo.findOne({
      where: { id: sourceId, is_deleted: false },
      relations: ["warehouse"],
    });
    if (!sourceItem) {
      return {
        status: false,
        message: `Source stock item with ID ${sourceId} not found.`,
        data: null,
      };
    }

    const destItem = await stockRepo.findOne({
      where: { id: destId, is_deleted: false },
      relations: ["warehouse"],
    });
    if (!destItem) {
      return {
        status: false,
        message: `Destination stock item with ID ${destId} not found.`,
        data: null,
      };
    }

    // Check if source has enough quantity
    if (sourceItem.quantity < quantity) {
      return {
        status: false,
        message: `Insufficient quantity in source. Available: ${sourceItem.quantity}, requested: ${quantity}`,
        data: null,
      };
    }

    // Perform transfer
    const oldSource = { ...sourceItem };
    const oldDest = { ...destItem };

    sourceItem.quantity -= quantity;
    sourceItem.updated_at = new Date();
    destItem.quantity += quantity;
    destItem.updated_at = new Date();

    await updateDb(stockRepo, sourceItem);
    await updateDb(stockRepo, destItem);

    // Create stock movement records
    const sourceMovement = movementRepo.create({
      stockItem: sourceItem,
      warehouse: sourceItem.warehouse,
      change: -quantity,
      movement_type: 'transfer_out',
      reference_code: `TRANSFER-${sourceId}-${destId}`,
      reason: params.reason || 'Stock transfer',
      metadata: JSON.stringify({ destinationStockItemId: destId }),
      current_quantity: sourceItem.quantity,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await saveDb(movementRepo, sourceMovement);

    const destMovement = movementRepo.create({
      stockItem: destItem,
      warehouse: destItem.warehouse,
      change: quantity,
      movement_type: 'transfer_in',
      reference_code: `TRANSFER-${sourceId}-${destId}`,
      reason: params.reason || 'Stock transfer',
      metadata: JSON.stringify({ sourceStockItemId: sourceId }),
      current_quantity: destItem.quantity,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await saveDb(movementRepo, destMovement);

    // Log audit
    await auditLogger.logUpdate("StockItem", sourceId, oldSource, sourceItem, user, queryRunner);
    await auditLogger.logUpdate("StockItem", destId, oldDest, destItem, user, queryRunner);

    return {
      status: true,
      message: "Stock transferred successfully",
      data: {
        source: sourceItem,
        destination: destItem,
        quantity,
      },
    };
  } catch (error) {
    console.error("Error in transferStock:", error);
    return {
      status: false,
      message: error.message || "Failed to transfer stock",
      data: null,
    };
  }
};