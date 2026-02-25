// src/subscribers/StockItemSubscriber.js
// @ts-check
const StockItem = require("../entities/StockItem");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading StockItemSubscriber");

class StockItemSubscriber {
  listenTo() {
    return StockItem;
  }

  /**
     * @param {any} entity
     */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[StockItemSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[StockItemSubscriber] beforeInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[StockItemSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[StockItemSubscriber] afterInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[StockItemSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[StockItemSubscriber] beforeUpdate error", err);
    }
  }

  /**
     * @param {{ entity: any; }} event
     */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[StockItemSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[StockItemSubscriber] afterUpdate error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[StockItemSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[StockItemSubscriber] beforeRemove error", err);
    }
  }

  /**
     * @param {any} event
     */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[StockItemSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[StockItemSubscriber] afterRemove error", err);
    }
  }
}

module.exports = StockItemSubscriber;