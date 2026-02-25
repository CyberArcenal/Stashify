// src/main/ipc/order/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class OrderHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllOrders = this.importHandler("./get/all.ipc");
    this.getOrderById = this.importHandler("./get/by_id.ipc");
    this.getOrderByCustomer = this.importHandler("./get/by_customer.ipc");
    this.getOrderTotals = this.importHandler("./get/totals.ipc");

    // ✏️ WRITE OPERATIONS (basic)
    this.createOrder = this.importHandler("./create.ipc");
    this.updateOrder = this.importHandler("./update.ipc");
    this.deleteOrder = this.importHandler("./delete.ipc");

    // 🔄 STATUS & SPECIAL OPERATIONS
    this.updateOrderStatus = this.importHandler("./update_status.ipc");
    this.cancelOrder = this.importHandler("./cancel.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[OrderHandler] Failed to load handler: ${path}`,
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
        logger.info(`OrderHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllOrders":
          return await this.getAllOrders(enrichedParams);
        case "getOrderById":
          return await this.getOrderById(enrichedParams);
        case "getOrderByCustomer":
          return await this.getOrderByCustomer(enrichedParams);
        case "getOrderTotals":
          return await this.getOrderTotals(enrichedParams);

        // WRITE (with transaction)
        case "createOrder":
          return await this.handleWithTransaction(
            this.createOrder,
            enrichedParams,
          );
        case "updateOrder":
          return await this.handleWithTransaction(
            this.updateOrder,
            enrichedParams,
          );
        case "deleteOrder":
          return await this.handleWithTransaction(
            this.deleteOrder,
            enrichedParams,
          );

        // STATUS (with transaction)
        case "updateOrderStatus":
          return await this.handleWithTransaction(
            this.updateOrderStatus,
            enrichedParams,
          );
        case "cancelOrder":
          return await this.handleWithTransaction(
            this.cancelOrder,
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
      console.error("OrderHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("OrderHandler error:", error);
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
        entity: "Order",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log order activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log order activity:", error);
    }
  }
}

const orderHandler = new OrderHandler();

ipcMain.handle(
  "order",
  withErrorHandling(orderHandler.handleRequest.bind(orderHandler), "IPC:order"),
);

module.exports = { OrderHandler, orderHandler };
