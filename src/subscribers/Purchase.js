// src/subscribers/PurchaseSubscriber.js
// @ts-check
const Purchase = require("../entities/Purchase");
const { AppDataSource } = require("../main/db/datasource");
const { PurchaseStateTransitionService } = require("../stateTransitionServices/Purchase");


const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading PurchaseSubscriber");

class PurchaseSubscriber {
  constructor() {
    this.transitionService = new PurchaseStateTransitionService(AppDataSource);
  }

  listenTo() {
    return Purchase;
  }

  /**
   * @param {any} entity
   */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseSubscriber] beforeInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseSubscriber] afterInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseSubscriber] beforeUpdate error", err);
    }
  }

  /**
   * @param {{ databaseEntity?: any; entity: any }} event
   */
  async afterUpdate(event) {
    if (!event.entity) return;

    // @ts-ignore
    logger.info("[PurchaseSubscriber] afterUpdate", {
      entity: JSON.parse(JSON.stringify(event.entity)),
    });

    const oldPurchase = event.databaseEntity;
    const newPurchase = event.entity;

    if (oldPurchase && oldPurchase.status === newPurchase.status) {
      return;
    }

    switch (newPurchase.status) {
      case "confirmed":
        await this.transitionService.onConfirm(newPurchase, "system");
        break;
      case "received":
        await this.transitionService.onReceive(newPurchase, "system");
        break;
      case "cancelled":
        await this.transitionService.onCancel(
          newPurchase,
          oldPurchase?.status,
          "system",
        );
        break;
      default:
        break;
    }
  }

  /**
   * @param {any} entity
   */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseSubscriber] beforeRemove error", err);
    }
  }

  /**
   * @param {any} event
   */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[PurchaseSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseSubscriber] afterRemove error", err);
    }
  }
}

module.exports = PurchaseSubscriber;
