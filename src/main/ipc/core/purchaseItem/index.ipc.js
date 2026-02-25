// src/main/ipc/purchaseItem/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class PurchaseItemHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllPurchaseItems = this.importHandler("./get/all.ipc");
    this.getPurchaseItemById = this.importHandler("./get/by_id.ipc");
    this.createPurchaseItem = this.importHandler("./create.ipc");
    this.updatePurchaseItem = this.importHandler("./update.ipc");
    this.deletePurchaseItem = this.importHandler("./delete.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[PurchaseItemHandler] Failed to load handler: ${path}`,
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
        logger.info(`PurchaseItemHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllPurchaseItems":
          return await this.getAllPurchaseItems(enrichedParams);
        case "getPurchaseItemById":
          return await this.getPurchaseItemById(enrichedParams);
        case "createPurchaseItem":
          return await this.handleWithTransaction(
            this.createPurchaseItem,
            enrichedParams,
          );
        case "updatePurchaseItem":
          return await this.handleWithTransaction(
            this.updatePurchaseItem,
            enrichedParams,
          );
        case "deletePurchaseItem":
          return await this.handleWithTransaction(
            this.deletePurchaseItem,
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
      console.error("PurchaseItemHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("PurchaseItemHandler error:", error);
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
        entity: "PurchaseItem",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log purchase item activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log purchase item activity:", error);
    }
  }
}

const purchaseItemHandler = new PurchaseItemHandler();

ipcMain.handle(
  "purchaseItem",
  withErrorHandling(
    purchaseItemHandler.handleRequest.bind(purchaseItemHandler),
    "IPC:purchaseItem",
  ),
);

module.exports = { PurchaseItemHandler, purchaseItemHandler };
