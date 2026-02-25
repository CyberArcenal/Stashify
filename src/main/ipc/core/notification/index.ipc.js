// src/main/ipc/notification/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class NotificationHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllNotifications = this.importHandler("./get/all.ipc");
    this.getNotificationById = this.importHandler("./get/by_id.ipc");
    this.getUnreadCount = this.importHandler("./get/unread_count.ipc");

    // ✏️ WRITE OPERATIONS (basic)
    this.deleteNotification = this.importHandler("./delete.ipc");

    // ✅ READ STATUS OPERATIONS
    this.markAsRead = this.importHandler("./mark_read.ipc");
    this.markAllAsRead = this.importHandler("./mark_all_read.ipc");
    this.deleteAllRead = this.importHandler("./delete_all_read.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[NotificationHandler] Failed to load handler: ${path}`,
        // @ts-ignore
        error.message,
      );
      return async () => ({
        status: false,
        message: `Handler not implemented: ${path}`,
        data: null,
      });
    }
  }

  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      const enrichedParams = { ...params };

      if (logger) {
        // @ts-ignore
        logger.info(`NotificationHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllNotifications":
          return await this.getAllNotifications(enrichedParams);
        case "getNotificationById":
          return await this.getNotificationById(enrichedParams);
        case "getUnreadCount":
          return await this.getUnreadCount(enrichedParams);

        // WRITE (with transaction)
        case "deleteNotification":
          return await this.handleWithTransaction(
            this.deleteNotification,
            enrichedParams,
          );

        // READ STATUS (with transaction)
        case "markAsRead":
          return await this.handleWithTransaction(
            this.markAsRead,
            enrichedParams,
          );
        case "markAllAsRead":
          return await this.handleWithTransaction(
            this.markAllAsRead,
            enrichedParams,
          );
        case "deleteAllRead":
          return await this.handleWithTransaction(
            this.deleteAllRead,
            enrichedParams,
          );

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("NotificationHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("NotificationHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }

  // @ts-ignore
  async handleWithTransaction(handler, params) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await handler(params, queryRunner);
      if (result.status) {
        await queryRunner.commitTransaction();
      } else {
        await queryRunner.rollbackTransaction();
      }
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // @ts-ignore
  async logActivity(user_id, action, description, qr = null) {
    const { saveDb } = require("../../../../utils/dbUtils/dbActions");
    try {
      let activityRepo;
      if (qr) {
        // @ts-ignore
        activityRepo = qr.manager.getRepository(AuditLog);
      } else {
        activityRepo = AppDataSource.getRepository(AuditLog);
      }
      const activity = activityRepo.create({
        user: user_id,
        action,
        description,
        entity: "Notification",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log notification activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log notification activity:", error);
    }
  }
}

const notificationHandler = new NotificationHandler();

ipcMain.handle(
  "notification",
  withErrorHandling(
    notificationHandler.handleRequest.bind(notificationHandler),
    "IPC:notification",
  ),
);

module.exports = { NotificationHandler, notificationHandler };
