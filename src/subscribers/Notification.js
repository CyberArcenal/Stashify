// src/subscribers/NotificationSubscriber.js
// @ts-check
const Notification = require("../entities/Notification");
const { logger } = require("../utils/logger");

console.log("[Subscriber] Loading NotificationSubscriber");

class NotificationSubscriber {
  listenTo() {
    return Notification;
  }

  /**
     * @param {any} entity
     */
  async beforeInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationSubscriber] beforeInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationSubscriber] beforeInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async afterInsert(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationSubscriber] afterInsert", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationSubscriber] afterInsert error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeUpdate(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationSubscriber] beforeUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationSubscriber] beforeUpdate error", err);
    }
  }

  /**
     * @param {{ entity: any; }} event
     */
  async afterUpdate(event) {
    try {
      const { entity } = event;
      // @ts-ignore
      logger.info("[NotificationSubscriber] afterUpdate", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationSubscriber] afterUpdate error", err);
    }
  }

  /**
     * @param {any} entity
     */
  async beforeRemove(entity) {
    try {
      // @ts-ignore
      logger.info("[NotificationSubscriber] beforeRemove", {
        entity: JSON.parse(JSON.stringify(entity)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationSubscriber] beforeRemove error", err);
    }
  }

  /**
     * @param {any} event
     */
  async afterRemove(event) {
    try {
      // @ts-ignore
      logger.info("[NotificationSubscriber] afterRemove", {
        event: JSON.parse(JSON.stringify(event)),
      });
    } catch (err) {
      // @ts-ignore
      logger.error("[NotificationSubscriber] afterRemove error", err);
    }
  }
}

module.exports = NotificationSubscriber;