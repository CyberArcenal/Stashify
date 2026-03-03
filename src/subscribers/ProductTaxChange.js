// src/subscribers/ProductTaxChangeSubscriber.js
// @ts-check
const ProductTaxChange = require("../entities/ProductTaxChange");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading ProductTaxChangeSubscriber");

class ProductTaxChangeSubscriber {
  listenTo() {
    return ProductTaxChange;
  }

  /**
   * @param {import("typeorm").InsertEvent<any>} event
   */
  async beforeInsert(event) {
    try {
      // @ts-ignore
      logger.info("[ProductTaxChangeSubscriber] beforeInsert", {
        entity: event.entity,
      });
    } catch (err) {
      logger.error(
        "[ProductTaxChangeSubscriber] beforeInsert error",
        // @ts-ignore
        err.stack || err,
      );
    }
  }

  /**
   * @param {import("typeorm").InsertEvent<any>} event
   */
  async afterInsert(event) {
    try {
      // @ts-ignore
      logger.info("[ProductTaxChangeSubscriber] afterInsert", {
        entity: event.entity,
      });
    } catch (err) {
      logger.error(
        "[ProductTaxChangeSubscriber] afterInsert error",
        // @ts-ignore
        err.stack || err,
      );
    }
  }

  /**
   * @param {import("typeorm").UpdateEvent<any>} event
   */
  async beforeUpdate(event) {
    try {
      // @ts-ignore
      logger.info("[ProductTaxChangeSubscriber] beforeUpdate", {
        entity: event.entity,
        databaseEntity: event.databaseEntity, // old values before update
      });
    } catch (err) {
      logger.error(
        "[ProductTaxChangeSubscriber] beforeUpdate error",
        // @ts-ignore
        err.stack || err,
      );
    }
  }

  /**
   * @param {import("typeorm").UpdateEvent<any>} event
   */
  async afterUpdate(event) {
    try {
      // @ts-ignore
      logger.info("[ProductTaxChangeSubscriber] afterUpdate", {
        entity: event.entity,
      });
    } catch (err) {
      logger.error(
        "[ProductTaxChangeSubscriber] afterUpdate error",
        // @ts-ignore
        err.stack || err,
      );
    }
  }

  /**
   * @param {import("typeorm").RemoveEvent<any>} event
   */
  async beforeRemove(event) {
    try {
      // @ts-ignore
      logger.info("[ProductTaxChangeSubscriber] beforeRemove", {
        entity: event.entity,
      });
    } catch (err) {
      logger.error(
        "[ProductTaxChangeSubscriber] beforeRemove error",
        // @ts-ignore
        err.stack || err,
      );
    }
  }

  /**
   * @param {import("typeorm").RemoveEvent<any>} event
   */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[ProductTaxChangeSubscriber] afterRemove", {
        entity: event.entity,
      });
    } catch (err) {
      logger.error(
        "[ProductTaxChangeSubscriber] afterRemove error",
        // @ts-ignore
        err.stack || err,
      );
    }
  }
}

module.exports = ProductTaxChangeSubscriber;
