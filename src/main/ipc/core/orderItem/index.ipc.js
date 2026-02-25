// src/main/ipc/orderItem/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class OrderItemHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllOrderItems = this.importHandler("./get/all.ipc");
    this.getOrderItemById = this.importHandler("./get/by_id.ipc");
    this.createOrderItem = this.importHandler("./create.ipc");
    this.updateOrderItem = this.importHandler("./update.ipc");
    this.deleteOrderItem = this.importHandler("./delete.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[OrderItemHandler] Failed to load handler: ${path}`,
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
        logger.info(`OrderItemHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllOrderItems":
          return await this.getAllOrderItems(enrichedParams);
        case "getOrderItemById":
          return await this.getOrderItemById(enrichedParams);
        case "createOrderItem":
          return await this.handleWithTransaction(
            this.createOrderItem,
            enrichedParams,
          );
        case "updateOrderItem":
          return await this.handleWithTransaction(
            this.updateOrderItem,
            enrichedParams,
          );
        case "deleteOrderItem":
          return await this.handleWithTransaction(
            this.deleteOrderItem,
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
      console.error("OrderItemHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("OrderItemHandler error:", error);
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
        entity: "OrderItem",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log order item activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log order item activity:", error);
    }
  }
}

const orderItemHandler = new OrderItemHandler();

ipcMain.handle(
  "orderItem",
  withErrorHandling(
    orderItemHandler.handleRequest.bind(orderItemHandler),
    "IPC:orderItem",
  ),
);

module.exports = { OrderItemHandler, orderItemHandler };
