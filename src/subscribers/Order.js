// src/subscribers/OrderSubscriber.js
// @ts-check
const Order = require("../entities/Order");
const { AppDataSource } = require("../main/db/datasource");
const { OrderStateTransitionService } = require("../stateTransitionServices/Order");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading OrderSubscriber");

class OrderSubscriber {
  constructor() {
    this.transitionService = new OrderStateTransitionService(AppDataSource);
  }

  listenTo() {
    return Order;
  }

  /**
   * @param {any} entity
   */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[OrderSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[OrderSubscriber] beforeInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[OrderSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[OrderSubscriber] afterInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[OrderSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[OrderSubscriber] beforeUpdate error", err);
    }
  }

  /**
   * @param {{ databaseEntity?: any; entity: any }} event
   */
  async afterUpdate(event) {
    if (!event.entity) return;

    // Log the event (do not catch errors here)
    // @ts-ignore
    logger.info("[OrderSubscriber] afterUpdate", {
      entity: JSON.parse(JSON.stringify(event.entity)),
    });

    const oldOrder = event.databaseEntity;
    const newOrder = event.entity;

    // Skip if status didn't change
    if (oldOrder && oldOrder.status === newOrder.status) {
      return;
    }

    // Trigger appropriate transition based on new status
    switch (newOrder.status) {
      case "confirmed":
        await this.transitionService.onConfirm(newOrder, "system");
        break;
      case "completed":
        await this.transitionService.onComplete(newOrder, "system");
        break;
      case "cancelled":
        await this.transitionService.onCancel(
          newOrder,
          oldOrder?.status,
          "system",
        );
        break;
      case "refunded":
        await this.transitionService.onRefund(
          newOrder,
          oldOrder?.status,
          "system",
        );
        break;
      default:
        // No transition needed for other statuses
        break;
    }
  }

  /**
   * @param {any} entity
   */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[OrderSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[OrderSubscriber] beforeRemove error", err);
    }
  }

  /**
   * @param {any} event
   */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[OrderSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[OrderSubscriber] afterRemove error", err);
    }
  }
}

module.exports = OrderSubscriber;
