// src/subscribers/WarehouseSubscriber.js
// @ts-check
const Warehouse = require("../entities/Warehouse");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading WarehouseSubscriber");

class WarehouseSubscriber {
  listenTo() {
    return Warehouse;
  }

  /**
     * @param {any} entity
     */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[WarehouseSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[WarehouseSubscriber] beforeInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[WarehouseSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[WarehouseSubscriber] afterInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[WarehouseSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[WarehouseSubscriber] beforeUpdate error", err);
    }
  }

  /**
     * @param {{ entity: any; }} event
     */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[WarehouseSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[WarehouseSubscriber] afterUpdate error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[WarehouseSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[WarehouseSubscriber] beforeRemove error", err);
    }
  }

  /**
     * @param {any} event
     */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[WarehouseSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[WarehouseSubscriber] afterRemove error", err);
    }
  }
}

module.exports = WarehouseSubscriber;