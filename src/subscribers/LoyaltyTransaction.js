// src/subscribers/LoyaltyTransactionSubscriber.js
// @ts-check
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading LoyaltyTransactionSubscriber");

class LoyaltyTransactionSubscriber {
  listenTo() {
    return LoyaltyTransaction;
  }

  /**
   * @param {any} entity
   */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[LoyaltyTransactionSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[LoyaltyTransactionSubscriber] beforeInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[LoyaltyTransactionSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[LoyaltyTransactionSubscriber] afterInsert error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[LoyaltyTransactionSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[LoyaltyTransactionSubscriber] beforeUpdate error", err);
    }
  }

  /**
   * @param {{ entity: any }} event
   */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[LoyaltyTransactionSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[LoyaltyTransactionSubscriber] afterUpdate error", err);
    }
  }

  /**
   * @param {any} entity
   */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[LoyaltyTransactionSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[LoyaltyTransactionSubscriber] beforeRemove error", err);
    }
  }

  /**
   * @param {any} event
   */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[LoyaltyTransactionSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[LoyaltyTransactionSubscriber] afterRemove error", err);
    }
  }
}

module.exports = LoyaltyTransactionSubscriber;
