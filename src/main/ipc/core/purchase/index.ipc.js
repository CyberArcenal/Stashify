// src/main/ipc/purchase/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class PurchaseHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllPurchases = this.importHandler("./get/all.ipc");
    this.getPurchaseById = this.importHandler("./get/by_id.ipc");
    this.getPurchaseBySupplier = this.importHandler("./get/by_supplier.ipc");

    // ✏️ WRITE OPERATIONS (basic)
    this.createPurchase = this.importHandler("./create.ipc");
    this.updatePurchase = this.importHandler("./update.ipc");
    this.deletePurchase = this.importHandler("./delete.ipc");

    // 🔄 STATUS & RECEIVING OPERATIONS
    this.updatePurchaseStatus = this.importHandler("./update_status.ipc");
   
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[PurchaseHandler] Failed to load handler: ${path}`,
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
        logger.info(`PurchaseHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllPurchases":
          return await this.getAllPurchases(enrichedParams);
        case "getPurchaseById":
          return await this.getPurchaseById(enrichedParams);
        case "getPurchaseBySupplier":
          return await this.getPurchaseBySupplier(enrichedParams);

        // WRITE (with transaction)
        case "createPurchase":
          return await this.handleWithTransaction(
            this.createPurchase,
            enrichedParams,
          );
        case "updatePurchase":
          return await this.handleWithTransaction(
            this.updatePurchase,
            enrichedParams,
          );
        case "deletePurchase":
          return await this.handleWithTransaction(
            this.deletePurchase,
            enrichedParams,
          );

        // STATUS & RECEIVING (with transaction)
        case "updatePurchaseStatus":
          return await this.handleWithTransaction(
            this.updatePurchaseStatus,
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
      console.error("PurchaseHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("PurchaseHandler error:", error);
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
        entity: "Purchase",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log purchase activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log purchase activity:", error);
    }
  }
}

const purchaseHandler = new PurchaseHandler();

ipcMain.handle(
  "purchase",
  withErrorHandling(
    purchaseHandler.handleRequest.bind(purchaseHandler),
    "IPC:purchase",
  ),
);

module.exports = { PurchaseHandler, purchaseHandler };
