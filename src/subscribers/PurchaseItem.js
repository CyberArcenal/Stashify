// src/subscribers/PurchaseItemSubscriber.js
// @ts-check
const PurchaseItem = require("../entities/PurchaseItem");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading PurchaseItemSubscriber");

class PurchaseItemSubscriber {
  listenTo() {
    return PurchaseItem;
  }

  /**
     * @param {any} entity
     */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseItemSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseItemSubscriber] beforeInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseItemSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseItemSubscriber] afterInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseItemSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseItemSubscriber] beforeUpdate error", err);
    }
  }

  /**
     * @param {{ entity: any; }} event
     */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[PurchaseItemSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseItemSubscriber] afterUpdate error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[PurchaseItemSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseItemSubscriber] beforeRemove error", err);
    }
  }

  /**
     * @param {any} event
     */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[PurchaseItemSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[PurchaseItemSubscriber] afterRemove error", err);
    }
  }
}

module.exports = PurchaseItemSubscriber;