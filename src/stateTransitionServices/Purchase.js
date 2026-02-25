// src/StateTransitionServices/Purchase.js
// @ts-check
const Purchase = require("../entities/Purchase");
const PurchaseItem = require("../entities/PurchaseItem");
const Product = require("../entities/Product");
const ProductVariant = require("../entities/ProductVariant");
const StockItem = require("../entities/StockItem");
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const emailSender = require("../channels/email.sender");
const smsSender = require("../channels/sms.sender");
const notificationService = require("../services/Notification");
const StockMovement = require("../entities/StockMovement");
const {
  companyName,
  enableSmsAlerts,
  getNotifySupplierOnPurchaseConfirmedWithEmail,
  getNotifySupplierOnPurchaseConfirmedWithSms,
  getNotifySupplierOnPurchaseReceivedWithEmail,
  getNotifySupplierOnPurchaseReceivedWithSms,
  getNotifySupplierOnPurchaseCancelledWithEmail,
  getNotifySupplierOnPurchaseCancelledWithSms,
  autoUpdateStockOnPurchaseReceived,
  autoReverseStockOnPurchaseCancel,
} = require("../utils/settings/system");

class PurchaseStateTransitionService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.purchaseRepo = dataSource.getRepository(Purchase);
    this.purchaseItemRepo = dataSource.getRepository(PurchaseItem);
    this.productRepo = dataSource.getRepository(Product);
    this.variantRepo = dataSource.getRepository(ProductVariant);
    this.stockItemRepo = dataSource.getRepository(StockItem);
    this.movementRepo = dataSource.getRepository(StockMovement);
  }

  /**
   * Called when a purchase is confirmed (e.g., order sent to supplier)
   * Sends notification to supplier, no stock change yet.
   * @param {Purchase} purchase
   * @param {string} user
   */
  // @ts-ignore
  async onConfirm(purchase, user = "system") {
    // @ts-ignore
    logger.info(`[Transition] Confirming purchase #${purchase.id}`);

    // @ts-ignore
    const hydratedPurchase = await this._hydratePurchase(purchase.id);
    if (!hydratedPurchase) return;

    await this._notifySupplier(hydratedPurchase, "confirmed");
    // @ts-ignore
    logger.info(`[Transition] Purchase #${purchase.id} confirmed`);
  }

  /**
   * Called when a purchase is received (stock increase, inventory movement)
   * @param {Purchase} purchase
   * @param {string} user
   */
  async onReceive(purchase, user = "system") {
    // @ts-ignore
    logger.info(`[Transition] Receiving purchase #${purchase.id}`);

    // @ts-ignore
    const hydratedPurchase = await this._hydratePurchase(purchase.id);
    if (!hydratedPurchase) return;

    const shouldUpdateStock = await autoUpdateStockOnPurchaseReceived();

    if (shouldUpdateStock) {
      await this._adjustStock(hydratedPurchase, +1, "purchase_receive", user);
    } else {
      logger.info(
        // @ts-ignore
        `[Transition] Stock update skipped for purchase #${purchase.id} (disabled by settings)`,
      );
    }

    await this._notifySupplier(hydratedPurchase, "received");
    // @ts-ignore
    logger.info(`[Transition] Purchase #${purchase.id} received`);
  }

  /**
   * Called when a purchase is cancelled
   * Reverses stock if it was previously received, sends notification.
   * @param {Purchase} purchase
   * @param {string} oldStatus
   * @param {string} user
   */
  async onCancel(purchase, oldStatus, user = "system") {
    logger.info(
      // @ts-ignore
      `[Transition] Cancelling purchase #${purchase.id}, old status: ${oldStatus}`,
    );

    // @ts-ignore
    const hydratedPurchase = await this._hydratePurchase(purchase.id);
    if (!hydratedPurchase) return;

    const shouldReverseStock = await autoReverseStockOnPurchaseCancel();

    if (shouldReverseStock && oldStatus === "received") {
      await this._adjustStock(hydratedPurchase, -1, "purchase_cancel", user);
    } else {
      logger.info(
        // @ts-ignore
        `[Transition] Stock reversal skipped for purchase #${purchase.id} (disabled or not needed)`,
      );
    }

    await this._notifySupplier(hydratedPurchase, "cancelled", oldStatus);
    // @ts-ignore
    logger.info(`[Transition] Purchase #${purchase.id} cancelled`);
  }

  // --- Private helpers ---

  /**
   * Hydrate purchase with relations needed for transitions.
   * @param {number} purchaseId
   * @returns {Promise<Purchase|null>}
   */
  async _hydratePurchase(purchaseId) {
    const purchase = await this.purchaseRepo.findOne({
      where: { id: purchaseId },
      relations: [
        "items",
        "items.product",
        "items.variant",
        "supplier",
        "warehouse",
      ],
    });
    if (!purchase) {
      logger.error(
        `[Transition] Purchase #${purchaseId} not found – cannot proceed`,
      );
      return null;
    }
    // @ts-ignore
    return purchase;
  }

  /**
   * Adjust stock for all items in a purchase.
   * @param {Purchase} purchase
   * @param {number} multiplier - +1 for increase (receive), -1 for reversal (cancel)
   * @param {string} movementReason - e.g., "purchase_receive", "purchase_cancel"
   * @param {string} user
   */
  async _adjustStock(purchase, multiplier, movementReason, user) {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    // @ts-ignore
    for (const item of purchase.items) {
      const product = item.product;
      const variant = item.variant;

      // Find or create stock item for this product/variant/warehouse
      let stockItem = await this.stockItemRepo.findOne({
        where: {
          // @ts-ignore
          product: { id: product.id },
          variant: variant ? { id: variant.id } : null,
          // @ts-ignore
          warehouse: { id: purchase.warehouse.id },
        },
        relations: ["warehouse"], // needed for movement
      });

      if (!stockItem) {
        // If stock item doesn't exist, create it (quantity starts at 0)
        stockItem = this.stockItemRepo.create({
          // @ts-ignore
          product: product,
          variant: variant,
          // @ts-ignore
          warehouse: purchase.warehouse,
          quantity: 0,
          reorder_level: 0,
          // timestamps set automatically by defaults
        });
        // @ts-ignore
        await saveDb(this.stockItemRepo, stockItem);
      }

      const oldQuantity = stockItem.quantity;
      const change = multiplier * item.quantity;
      // @ts-ignore
      const newQuantity = oldQuantity + change;
      if (newQuantity < 0) {
        logger.error(
          `[Transition] Negative stock would result for product ${product.id} – aborting adjustment`,
        );
        throw new Error(`Insufficient stock for product ${product.id}`);
      }

      stockItem.quantity = newQuantity;
      stockItem.updated_at = new Date();
      // @ts-ignore
      await updateDb(this.stockItemRepo, stockItem);

      // Create inventory movement record
      const movement = this.movementRepo.create({
        // @ts-ignore
        stockItem: stockItem,
        // @ts-ignore
        warehouse: stockItem.warehouse,
        change: change,
        movement_type: change < 0 ? "out" : "in", // use enum values
        // @ts-ignore
        reference_code: purchase.purchase_number,
        // @ts-ignore
        reason: `${movementReason} - Purchase #${purchase.id}`,
        // @ts-ignore
        metadata: JSON.stringify({ purchaseId: purchase.id, itemId: item.id }),
        current_quantity: newQuantity,
        // timestamps set automatically
      });
      // @ts-ignore
      await saveDb(this.movementRepo, movement);

      await auditLogger.logUpdate(
        "StockItem",
        // @ts-ignore
        stockItem.id,
        { quantity: oldQuantity },
        { quantity: newQuantity },
        user,
      );
      await auditLogger.logCreate(
        "InventoryMovement",
        // @ts-ignore
        movement.id,
        movement,
        user,
      );
    }
  }

  /**
   * Send email/SMS notification to the supplier about purchase status change.
   * @param {Purchase} purchase
   * @param {string} action - "confirmed", "received", "cancelled"
   * @param {string|null} oldStatus
   */
  async _notifySupplier(purchase, action, oldStatus = null) {
    // @ts-ignore
    if (!purchase.supplier) {
      logger.warn(
        // @ts-ignore
        `[Transition] No supplier for purchase #${purchase.id} – notification skipped`,
      );
      return;
    }
    // @ts-ignore
    const supplier = purchase.supplier;
    const company = await companyName();

    // Determine which settings to use
    let notifyEmail, notifySms;
    switch (action) {
      case "confirmed":
        notifyEmail = await getNotifySupplierOnPurchaseConfirmedWithEmail();
        notifySms = await getNotifySupplierOnPurchaseConfirmedWithSms();
        break;
      case "received":
        notifyEmail = await getNotifySupplierOnPurchaseReceivedWithEmail();
        notifySms = await getNotifySupplierOnPurchaseReceivedWithSms();
        break;
      case "cancelled":
        notifyEmail = await getNotifySupplierOnPurchaseCancelledWithEmail();
        notifySms = await getNotifySupplierOnPurchaseCancelledWithSms();
        break;
      default:
        return;
    }

    // Build items list
    // @ts-ignore
    const itemsList = purchase.items
      .map(
        // @ts-ignore
        (item) =>
          `${item.product.name} – Qty: ${item.quantity} @ ${item.unit_cost}`,
      )
      .join("\n");

    // @ts-ignore
    const subject = `Purchase Order ${action.charAt(0).toUpperCase() + action.slice(1)} – ${purchase.purchase_number}`;
    let textBody;

    if (action === "confirmed") {
      // @ts-ignore
      textBody = `Dear ${supplier.name},\n\nWe have confirmed purchase order #${purchase.purchase_number}.\n\nItems:\n${itemsList}\n\nTotal: ${purchase.total}\n\nPlease prepare the order accordingly.\n\nThank you,\n${company}`;
    } else if (action === "received") {
      // @ts-ignore
      textBody = `Dear ${supplier.name},\n\nWe have received the items for purchase order #${purchase.purchase_number}.\n\nItems received:\n${itemsList}\n\nTotal: ${purchase.total}\n\nThank you for your prompt delivery.\n\nBest regards,\n${company}`;
    } else if (action === "cancelled") {
      // @ts-ignore
      textBody = `Dear ${supplier.name},\n\nPurchase order #${purchase.purchase_number} has been cancelled.\nPrevious status: ${oldStatus}\n\nCancelled items:\n${itemsList}\n\nPlease disregard any earlier instructions.\n\nRegards,\n${company}`;
    }

    // @ts-ignore
    const htmlBody = textBody.replace(/\n/g, "<br>");

    // Send email if enabled
    if (notifyEmail && supplier.email) {
      try {
        await emailSender.send(
          supplier.email,
          subject,
          htmlBody,
          // @ts-ignore
          textBody,
          {},
          true,
        );
        logger.info(
          // @ts-ignore
          `[Purchase] ${action} email queued for supplier ${supplier.email} (purchase #${purchase.id})`,
        );
      } catch (error) {
        logger.error(
          // @ts-ignore
          `[Purchase] Failed to queue ${action} email for purchase #${purchase.id}`,
          // @ts-ignore
          error,
        );
      }
    }

    // Send SMS if enabled
    if (notifySms) {
      const smsEnabled = await enableSmsAlerts();
      if (smsEnabled && supplier.phone) {
        try {
          // @ts-ignore
          const smsMessage = `Purchase #${purchase.purchase_number} has been ${action}. Check your email for details.`;
          await smsSender.send(supplier.phone, smsMessage);
        } catch (error) {
          logger.error(
            `[Purchase] SMS failed for supplier ${supplier.phone}`,
            // @ts-ignore
            error,
          );
        }
      }
    }

    // Create in-app notification for admin
    try {
      await notificationService.create(
        {
          userId: 1, // admin
          title: `Purchase ${action}`,
          // @ts-ignore
          message: `Purchase #${purchase.purchase_number} has been ${action}.`,
          type: action === "cancelled" ? "warning" : "info",
          // @ts-ignore
          metadata: { purchaseId: purchase.id, status: action },
        },
        "system",
      );
    } catch (err) {
      logger.error(
        // @ts-ignore
        `Failed to create in-app notification for purchase #${purchase.id}`,
        // @ts-ignore
        err,
      );
      throw err;
    }
  }
}

module.exports = { PurchaseStateTransitionService };
