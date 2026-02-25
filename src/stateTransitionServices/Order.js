// src/StateTransitionServices/Order.js
// @ts-check
const Order = require("../entities/Order");
const OrderItem = require("../entities/OrderItem");
const Product = require("../entities/Product");
const ProductVariant = require("../entities/ProductVariant");
const StockItem = require("../entities/StockItem");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const emailSender = require("../channels/email.sender");
const smsSender = require("../channels/sms.sender");
const notificationService = require("../services/Notification");
const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
const {
  companyName,
  enableSmsAlerts,
  getNotifyCustomerOnOrderConfirmedWithEmail,
  getNotifyCustomerOnOrderConfirmedWithSms,
  getNotifyCustomerOnOrderCompletedWithEmail,
  getNotifyCustomerOnOrderCompletedWithSms,
  getNotifyCustomerOnOrderCancelledWithEmail,
  getNotifyCustomerOnOrderCancelledWithSms,
  getNotifyCustomerOnOrderRefundedWithEmail,
  getNotifyCustomerOnOrderRefundedWithSms,
  autoUpdateStockOnOrderConfirm,
  autoUpdateStockOnOrderComplete,
  autoReverseStockOnOrderCancel,
  autoReverseStockOnOrderRefund,
  loyaltyPointsEnabled,
  getLoyaltyPointRate,
  loyaltyPointsEarnOnConfirm,
} = require("../utils/settings/system");
const StockMovement = require("../entities/StockMovement");

class OrderStateTransitionService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.orderRepo = dataSource.getRepository(Order);
    this.orderItemRepo = dataSource.getRepository(OrderItem);
    this.productRepo = dataSource.getRepository(Product);
    this.variantRepo = dataSource.getRepository(ProductVariant);
    this.stockItemRepo = dataSource.getRepository(StockItem);
    this.movementRepo = dataSource.getRepository(StockMovement);
    this.customerRepo = dataSource.getRepository(Customer);
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);
  }

  /**
   * Called when an order is confirmed.
   * @param {Order} order
   * @param {string} user
   */
  async onConfirm(order, user = "system") {
    // @ts-ignore
    logger.info(`[Transition] Confirming order #${order.id}`);

    // @ts-ignore
    const hydratedOrder = await this._hydrateOrder(order.id);
    if (!hydratedOrder) return;

    // Stock adjustment (if enabled)
    const shouldUpdateStock = await autoUpdateStockOnOrderConfirm();
    if (shouldUpdateStock) {
      await this._adjustStock(hydratedOrder, -1, "order_confirm", user);
    } else {
      logger.info(
        // @ts-ignore
        `[Transition] Stock update skipped for order #${order.id} (disabled by settings)`,
      );
    }

    // Loyalty handling
    await this._handleLoyalty(hydratedOrder, user);

    // Notify customer
    await this._notifyCustomer(hydratedOrder, "confirmed");
    // @ts-ignore
    logger.info(`[Transition] Order #${order.id} confirmed`);
  }

  /**
   * Called when an order is completed.
   * @param {Order} order
   * @param {string} user
   */
  async onComplete(order, user = "system") {
    // @ts-ignore
    logger.info(`[Transition] Completing order #${order.id}`);

    // @ts-ignore
    const hydratedOrder = await this._hydrateOrder(order.id);
    if (!hydratedOrder) return;

    const shouldUpdateStock = await autoUpdateStockOnOrderComplete();
    // @ts-ignore
    if (shouldUpdateStock && !hydratedOrder.inventory_processed) {
      await this._adjustStock(hydratedOrder, -1, "order_complete", user);
      // @ts-ignore
      hydratedOrder.inventory_processed = true;
      // @ts-ignore
      hydratedOrder.updated_at = new Date();
      // @ts-ignore
      await updateDb(this.orderRepo, hydratedOrder);
    } else {
      logger.info(
        // @ts-ignore
        `[Transition] Stock update skipped for order #${order.id} (already processed or disabled)`,
      );
    }

    // If points were not already awarded at confirm, award them now.
    const earnOnConfirm = await loyaltyPointsEarnOnConfirm();
    if (!earnOnConfirm) {
      await this._handleLoyalty(hydratedOrder, user);
    }

    await this._notifyCustomer(hydratedOrder, "completed");
    // @ts-ignore
    logger.info(`[Transition] Order #${order.id} completed`);
  }

  /**
   * Called when an order is cancelled.
   * @param {Order} order
   * @param {string} oldStatus
   * @param {string} user
   */
  async onCancel(order, oldStatus, user = "system") {
    logger.info(
      // @ts-ignore
      `[Transition] Cancelling order #${order.id}, old status: ${oldStatus}`,
    );

    // @ts-ignore
    const hydratedOrder = await this._hydrateOrder(order.id);
    if (!hydratedOrder) return;

    // Reverse stock if needed
    const shouldReverseStock = await autoReverseStockOnOrderCancel();
    if (
      shouldReverseStock &&
      (oldStatus === "confirmed" || oldStatus === "completed")
    ) {
      await this._adjustStock(hydratedOrder, +1, "order_cancel", user);
    } else {
      logger.info(
        // @ts-ignore
        `[Transition] Stock reversal skipped for order #${order.id} (disabled or not needed)`,
      );
    }

    // Reverse loyalty points if they were awarded
    await this._reverseLoyalty(hydratedOrder, "cancel", user);

    await this._notifyCustomer(hydratedOrder, "cancelled", oldStatus);
    // @ts-ignore
    logger.info(`[Transition] Order #${order.id} cancelled`);
  }

  /**
   * Called when an order is refunded.
   * @param {Order} order
   * @param {string} oldStatus
   * @param {string} user
   */
  async onRefund(order, oldStatus, user = "system") {
    logger.info(
      // @ts-ignore
      `[Transition] Refunding order #${order.id}, old status: ${oldStatus}`,
    );

    // @ts-ignore
    const hydratedOrder = await this._hydrateOrder(order.id);
    if (!hydratedOrder) return;

    const shouldReverseStock = await autoReverseStockOnOrderRefund();
    if (shouldReverseStock && oldStatus === "completed") {
      await this._adjustStock(hydratedOrder, +1, "order_refund", user);
    } else {
      logger.info(
        // @ts-ignore
        `[Transition] Stock reversal skipped for order #${order.id} (disabled or not needed)`,
      );
    }

    // Reverse loyalty points
    await this._reverseLoyalty(hydratedOrder, "refund", user);

    await this._notifyCustomer(hydratedOrder, "refunded", oldStatus);
    // @ts-ignore
    logger.info(`[Transition] Order #${order.id} refunded`);
  }

  // --- Private loyalty helpers ---

  /**
   * Award loyalty points for the order and deduct any redeemed points.
   * @param {Order} order
   * @param {string} user
   */
  async _handleLoyalty(order, user) {
    const loyaltyEnabled = await loyaltyPointsEnabled();
    // @ts-ignore
    if (!loyaltyEnabled || !order.customer) return;

    const rate = await getLoyaltyPointRate(); // e.g., 100 = 1 point per 100
    // @ts-ignore
    const subtotal = order.subtotal;

    // Calculate points earned
    const pointsEarned = Math.floor(subtotal / rate);
    if (pointsEarned > 0) {
      const customer = await this.customerRepo.findOne({
        // @ts-ignore
        where: { id: order.customer.id },
      });
      if (!customer) return;

      const oldBalance = customer.loyaltyPointsBalance;
      const oldStatus = customer.status;

      // @ts-ignore
      customer.loyaltyPointsBalance += pointsEarned;
      // @ts-ignore
      customer.lifetimePointsEarned += pointsEarned;
      // @ts-ignore
      customer.status = this._determineCustomerStatus(customer);
      customer.updatedAt = new Date();
      // @ts-ignore
      await updateDb(this.customerRepo, customer);

      // Record transaction
      // @ts-ignore
      const loyaltyTx = this.loyaltyRepo.create({
        pointsChange: pointsEarned,
        transactionType: "earn",
        // @ts-ignore
        notes: `Order #${order.id}`,
        customer,
        order,
        timestamp: new Date(),
      });
      // @ts-ignore
      await saveDb(this.loyaltyRepo, loyaltyTx);

      await auditLogger.logUpdate(
        "Customer",
        // @ts-ignore
        customer.id,
        { loyaltyPointsBalance: oldBalance },
        { loyaltyPointsBalance: customer.loyaltyPointsBalance },
        user,
      );

      // Milestone notification
      if (
        oldStatus !== customer.status &&
        (customer.status === "vip" || customer.status === "elite")
      ) {
        await this._notifyCustomerMilestone(
          // @ts-ignore
          customer,
          oldStatus,
          customer.status,
        );
      }
    }

    // Handle loyalty redemption if used
    // @ts-ignore
    if (order.loyalty_used && order.loyalty_points_redeemed > 0) {
      const customer = await this.customerRepo.findOne({
        // @ts-ignore
        where: { id: order.customer.id },
      });
      if (!customer) return;

      const oldBalance = customer.loyaltyPointsBalance;
      // @ts-ignore
      customer.loyaltyPointsBalance -= order.loyalty_points_redeemed;
      // @ts-ignore
      if (customer.loyaltyPointsBalance < 0) {
        logger.warn(
          `[Loyalty] Customer ${customer.id} points balance went negative after redemption. Clamping to 0.`,
        );
        customer.loyaltyPointsBalance = 0;
      }
      customer.updatedAt = new Date();
      // @ts-ignore
      await updateDb(this.customerRepo, customer);

      // @ts-ignore
      const loyaltyTx = this.loyaltyRepo.create({
        // @ts-ignore
        pointsChange: -order.loyalty_points_redeemed,
        transactionType: "redeem",
        // @ts-ignore
        notes: `Redeemed on Order #${order.id}`,
        customer,
        order,
        timestamp: new Date(),
      });
      // @ts-ignore
      await saveDb(this.loyaltyRepo, loyaltyTx);

      await auditLogger.logUpdate(
        "Customer",
        // @ts-ignore
        customer.id,
        { loyaltyPointsBalance: oldBalance },
        { loyaltyPointsBalance: customer.loyaltyPointsBalance },
        user,
      );
    }
  }

  /**
   * Reverse loyalty points when an order is cancelled or refunded.
   * @param {Order} order
   * @param {string} reason - "cancel" or "refund"
   * @param {string} user
   */
  async _reverseLoyalty(order, reason, user) {
    const loyaltyEnabled = await loyaltyPointsEnabled();
    // @ts-ignore
    if (!loyaltyEnabled || !order.customer) return;

    // Find all loyalty transactions linked to this order (earn and redeem)
    const txs = await this.loyaltyRepo.find({
      // @ts-ignore
      where: { order: { id: order.id } },
    });

    if (txs.length === 0) return;

    const customer = await this.customerRepo.findOne({
      // @ts-ignore
      where: { id: order.customer.id },
    });
    if (!customer) return;

    for (const tx of txs) {
      const oldBalance = customer.loyaltyPointsBalance;
      // Reverse the points change
      // @ts-ignore
      customer.loyaltyPointsBalance -= tx.pointsChange;
      customer.updatedAt = new Date();
      // @ts-ignore
      await updateDb(this.customerRepo, customer);

      // Create reversal transaction
      // @ts-ignore
      const reversal = this.loyaltyRepo.create({
        // @ts-ignore
        pointsChange: -tx.pointsChange,
        transactionType: reason,
        // @ts-ignore
        notes: `Reversal of ${tx.transactionType} for Order #${order.id}`,
        customer,
        order,
        timestamp: new Date(),
      });
      // @ts-ignore
      await saveDb(this.loyaltyRepo, reversal);

      await auditLogger.logUpdate(
        "Customer",
        // @ts-ignore
        customer.id,
        { loyaltyPointsBalance: oldBalance },
        { loyaltyPointsBalance: customer.loyaltyPointsBalance },
        user,
      );
    }

    // Optionally update customer status after reversal
    const oldStatus = customer.status;
    // @ts-ignore
    customer.status = this._determineCustomerStatus(customer);
    if (oldStatus !== customer.status) {
      // @ts-ignore
      await updateDb(this.customerRepo, customer);
    }
  }

  /**
   * Determine customer status based on lifetime points.
   * @param {Customer} customer
   * @returns {string}
   */
  _determineCustomerStatus(customer) {
    // @ts-ignore
    if (customer.lifetimePointsEarned > 5000) return "elite";
    // @ts-ignore
    if (customer.lifetimePointsEarned > 1000) return "vip";
    return "regular";
  }

  /**
   * Notify customer and admin about loyalty milestone.
   * @param {Customer} customer
   * @param {string} oldStatus
   * @param {string} newStatus
   */
  async _notifyCustomerMilestone(customer, oldStatus, newStatus) {
    // In-app notification for admin
    try {
      await notificationService.create(
        {
          userId: 1, // assuming admin
          title: "Customer Loyalty Milestone",
          // @ts-ignore
          message: `${customer.name} has reached ${newStatus} status!`,
          type: "success",
          // @ts-ignore
          metadata: { customerId: customer.id, oldStatus, newStatus },
        },
        "system",
      );
    } catch (err) {
      logger.error(
        // @ts-ignore
        `Failed to create in-app milestone notification for customer ${customer.id}`,
        // @ts-ignore
        err,
      );
    }

    // Email to customer
    const company = await companyName();
    const subject = `Congratulations! You've reached ${newStatus} status!`;
    // @ts-ignore
    const textBody = `Dear ${customer.name},

Congratulations! You have reached ${newStatus} status at ${company}.

We appreciate your continued patronage and look forward to serving you with exclusive benefits.

Thank you for being a valued customer!

Best regards,
${company}`;
    const htmlBody = textBody.replace(/\n/g, "<br>");

    // @ts-ignore
    if (customer.email) {
      try {
        await emailSender.send(
          // @ts-ignore
          customer.email,
          subject,
          htmlBody,
          textBody,
          {},
          true,
        );
        logger.info(
          // @ts-ignore
          `[Milestone] Email sent to customer ${customer.email} for reaching ${newStatus}`,
        );
      } catch (error) {
        logger.error(
          // @ts-ignore
          `[Milestone] Failed to send email to customer ${customer.email}`,
          // @ts-ignore
          error,
        );
      }
    }

    // SMS if enabled
    const smsEnabled = await enableSmsAlerts();
    // @ts-ignore
    if (smsEnabled && customer.phone) {
      try {
        const smsMessage = `Congratulations! You've reached ${newStatus} status at ${company}. Thank you for your loyalty!`;
        // @ts-ignore
        await smsSender.send(customer.phone, smsMessage);
        // @ts-ignore
        logger.info(`[Milestone] SMS sent to customer ${customer.phone}`);
      } catch (error) {
        logger.error(
          // @ts-ignore
          `[Milestone] Failed to send SMS to customer ${customer.phone}`,
          // @ts-ignore
          error,
        );
      }
    }
  }

  // --- Private helpers for stock and hydration ---

  /**
   * Hydrate an order with all necessary relations.
   * @param {number} orderId
   * @returns {Promise<Order|null>}
   */
  async _hydrateOrder(orderId) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: [
        "items",
        "items.product",
        "items.variant",
        "items.warehouse",
        "customer",
      ],
    });
    if (!order) {
      logger.error(`[Transition] Order #${orderId} not found – cannot proceed`);
      return null;
    }
    // @ts-ignore
    return order;
  }

  /**
   * Adjust stock for all items in an order.
   * @param {Order} order
   * @param {number} multiplier - -1 for outgoing, +1 for incoming
   * @param {string} movementReason - original reason (e.g., "order_confirm")
   * @param {string} user
   */
  async _adjustStock(order, multiplier, movementReason, user) {
    // @ts-ignore
    for (const item of order.items) {
      const product = item.product;
      const variant = item.variant;

      // Find the corresponding stock item using relations
      const stockItem = await this.stockItemRepo.findOne({
        where: {
          // @ts-ignore
          product: { id: product.id },
          variant: variant ? { id: variant.id } : null,
          warehouse: { id: item.warehouse.id },
        },
        relations: ["warehouse"], // needed for movement
      });

      if (!stockItem) {
        logger.warn(
          `[Transition] No stock item found for product ${product.id}, variant ${variant?.id}, warehouse ${item.warehouse.id} – skipping`,
        );
        continue;
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

      // Create stock movement record
      const movement = this.movementRepo.create({
        // @ts-ignore
        stockItem: stockItem, // relation
        // @ts-ignore
        warehouse: stockItem.warehouse, // relation
        change: change,
        movement_type: change < 0 ? "out" : "in", // use enum values
        // @ts-ignore
        reference_code: order.order_number,
        // @ts-ignore
        reason: `${movementReason} - Order #${order.id}`,
        // @ts-ignore
        metadata: JSON.stringify({ orderId: order.id, itemId: item.id }),
        current_quantity: newQuantity,
        // timestamps are set automatically by default values
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
   * Send notifications to customer about order status change.
   * @param {Order} order
   * @param {string} action - confirmed, completed, cancelled, refunded
   * @param {string|null} oldStatus - only for cancelled/refunded
   */
  async _notifyCustomer(order, action, oldStatus = null) {
    // @ts-ignore
    if (!order.customer) {
      logger.warn(
        // @ts-ignore
        `[Transition] No customer for order #${order.id} – notification skipped`,
      );
      return;
    }

    // @ts-ignore
    const customer = order.customer;
    const company = await companyName();

    // Determine which settings to use
    let notifyEmail, notifySms;
    switch (action) {
      case "confirmed":
        notifyEmail = await getNotifyCustomerOnOrderConfirmedWithEmail();
        notifySms = await getNotifyCustomerOnOrderConfirmedWithSms();
        break;
      case "completed":
        notifyEmail = await getNotifyCustomerOnOrderCompletedWithEmail();
        notifySms = await getNotifyCustomerOnOrderCompletedWithSms();
        break;
      case "cancelled":
        notifyEmail = await getNotifyCustomerOnOrderCancelledWithEmail();
        notifySms = await getNotifyCustomerOnOrderCancelledWithSms();
        break;
      case "refunded":
        notifyEmail = await getNotifyCustomerOnOrderRefundedWithEmail();
        notifySms = await getNotifyCustomerOnOrderRefundedWithSms();
        break;
      default:
        return;
    }

    // Build items list using actual product names and unit prices
    // @ts-ignore
    const itemsList = order.items
      .map(
        // @ts-ignore
        (item) =>
          `${item.product?.name || "Unknown product"} – Qty: ${item.quantity} @ ${item.unit_price}`,
      )
      .join("\n");

    // @ts-ignore
    const subject = `Order ${action.charAt(0).toUpperCase() + action.slice(1)} – ${order.order_number}`;
    let textBody;

    if (action === "confirmed") {
      // @ts-ignore
      textBody = `Dear ${customer.name},\n\nYour order #${order.order_number} has been confirmed and is being prepared.\n\nItems:\n${itemsList}\n\nTotal: ${order.total}\n\nThank you for your purchase!\n${company}`;
    } else if (action === "completed") {
      // @ts-ignore
      textBody = `Dear ${customer.name},\n\nYour order #${order.order_number} has been completed and is on its way (or ready for pickup).\n\nItems:\n${itemsList}\n\nTotal: ${order.total}\n\nThank you for shopping with us!\n${company}`;
    } else if (action === "cancelled") {
      // @ts-ignore
      textBody = `Dear ${customer.name},\n\nYour order #${order.order_number} has been cancelled.\nPrevious status: ${oldStatus}\n\nItems cancelled:\n${itemsList}\n\nIf you have any questions, please contact support.\n\nRegards,\n${company}`;
    } else if (action === "refunded") {
      // @ts-ignore
      textBody = `Dear ${customer.name},\n\nYour order #${order.order_number} has been refunded.\nPrevious status: ${oldStatus}\n\nRefunded items:\n${itemsList}\n\nTotal refund amount: ${order.total}\n\nThe amount will be credited to your original payment method.\n\nThank you,\n${company}`;
    }

    // @ts-ignore
    const htmlBody = textBody.replace(/\n/g, "<br>");

    if (notifyEmail && customer.email) {
      try {
        await emailSender.send(
          customer.email,
          subject,
          htmlBody,
          // @ts-ignore
          textBody,
          {},
          true,
        );
        logger.info(
          // @ts-ignore
          `[Order] ${action} email queued for customer ${customer.email} (order #${order.id})`,
        );
      } catch (error) {
        logger.error(
          // @ts-ignore
          `[Order] Failed to queue ${action} email for order #${order.id}`,
          // @ts-ignore
          error,
        );
      }
    }

    if (notifySms) {
      const smsEnabled = await enableSmsAlerts();
      if (smsEnabled && customer.phone) {
        try {
          // @ts-ignore
          const smsMessage = `Your order #${order.order_number} has been ${action}. Check your email for details.`;
          await smsSender.send(customer.phone, smsMessage);
          logger.info(
            // @ts-ignore
            `[Order] ${action} SMS sent to customer ${customer.phone} (order #${order.id})`,
          );
        } catch (error) {
          logger.error(
            `[Order] SMS failed for customer ${customer.phone}`,
            // @ts-ignore
            error,
          );
        }
      }
    }

    // In-app notification for admin
    try {
      await notificationService.create(
        {
          userId: 1, // assuming admin
          title: `Order ${action}`,
          // @ts-ignore
          message: `Order #${order.order_number} has been ${action}.`,
          type:
            action === "cancelled" || action === "refunded"
              ? "warning"
              : "info",
          // @ts-ignore
          metadata: { orderId: order.id, status: action },
        },
        "system",
      );
    } catch (err) {
      logger.error(
        // @ts-ignore
        `Failed to create in-app notification for order #${order.id}`,
        // @ts-ignore
        err,
      );
    }
  }
}

module.exports = { OrderStateTransitionService };
