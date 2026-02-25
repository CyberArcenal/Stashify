// src/main/ipc/purchase/receive.ipc.js

const { AppDataSource } = require("../../../db/datasource");
const StockItem = require("../../../../entities/StockItem");
const StockMovement = require("../../../../entities/StockMovement");
const auditLogger = require("../../../../utils/auditLogger");

/**
 * Mark a purchase as received, update stock
 * @param {Object} params - Request parameters
 * @param {number} params.id - Purchase ID (required)
 * @param {number} [params.proceed_by] - User ID who processed the receipt
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

    // Get repositories from query runner
    const purchaseRepo = queryRunner.manager.getRepository("Purchase");
    const purchaseItemRepo = queryRunner.manager.getRepository("PurchaseItem");
    const stockItemRepo = queryRunner.manager.getRepository(StockItem);
    const stockMovementRepo = queryRunner.manager.getRepository(StockMovement);

    // Find purchase with items
    const purchase = await purchaseRepo.findOne({
      where: { id, is_deleted: false },
      relations: ["items", "items.product", "items.variant", "warehouse"],
    });

    if (!purchase) {
      return {
        status: false,
        message: `Purchase with ID ${id} not found or deleted.`,
        data: null,
      };
    }

    if (purchase.is_received) {
      return {
        status: false,
        message: `Purchase #${id} has already been received.`,
        data: null,
      };
    }

    if (purchase.status === 'cancelled') {
      return {
        status: false,
        message: `Cannot receive a cancelled purchase.`,
        data: null,
      };
    }

    // Process each item to update stock
    for (const item of purchase.items) {
      const product = item.product;
      const variant = item.variant;
      const warehouse = purchase.warehouse;

      // Find or create stock item
      let stockItem = await stockItemRepo.findOne({
        where: {
          product: product ? { id: product.id } : undefined,
          variant: variant ? { id: variant.id } : undefined,
          warehouse: { id: warehouse.id },
        },
      });

      if (stockItem) {
        // Update existing stock
        stockItem.quantity += item.quantity;
        stockItem.updated_at = new Date();
        await stockItemRepo.save(stockItem);
      } else {
        // Create new stock item
        stockItem = stockItemRepo.create({
          product,
          variant,
          warehouse,
          quantity: item.quantity,
          reorder_level: 0,
          low_stock_threshold: null,
          created_at: new Date(),
          updated_at: new Date(),
        });
        await stockItemRepo.save(stockItem);
      }

      // Create stock movement record
      const movement = stockMovementRepo.create({
        stockItem,
        warehouse,
        change: item.quantity,
        movement_type: 'in',
        reference_code: purchase.purchase_number,
        reason: 'Purchase received',
        metadata: JSON.stringify({ purchaseId: purchase.id, itemId: item.id }),
        current_quantity: stockItem.quantity,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await stockMovementRepo.save(movement);
    }

    // Update purchase
    const oldData = { ...purchase };
    purchase.status = 'received';
    purchase.is_received = true;
    purchase.received_at = new Date();
    if (params.proceed_by) {
      purchase.proceed_by = params.proceed_by;
    }
    purchase.inventory_processed = true;
    purchase.updated_at = new Date();

    const updatedPurchase = await purchaseRepo.save(purchase);

    // Log activity
    await auditLogger.logUpdate(
      "Purchase",
      id,
      oldData,
      updatedPurchase,
      user,
      queryRunner,
    );

    return {
      status: true,
      message: "Purchase received and stock updated successfully",
      data: updatedPurchase,
    };
  } catch (error) {
    console.error("Error in receivePurchase:", error);
    return {
      status: false,
      message: error.message || "Failed to receive purchase",
      data: null,
    };
  }
};