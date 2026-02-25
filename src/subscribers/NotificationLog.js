// src/subscribers/NotificationLogSubscriber.js
// @ts-check
const NotificationLog = require("../entities/NotificationLog");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading NotificationLogSubscriber");

class NotificationLogSubscriber {
  listenTo() {
    return NotificationLog;
  }

  /**
     * @param {any} entity
     */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationLogSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationLogSubscriber] beforeInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationLogSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationLogSubscriber] afterInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationLogSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationLogSubscriber] beforeUpdate error", err);
    }
  }

  /**
     * @param {{ entity: any; }} event
     */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[NotificationLogSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationLogSubscriber] afterUpdate error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationLogSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationLogSubscriber] beforeRemove error", err);
    }
  }

  /**
     * @param {any} event
     */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[NotificationLogSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationLogSubscriber] afterRemove error", err);
    }
  }
}

module.exports = NotificationLogSubscriber;