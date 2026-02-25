// src/main/ipc/stockItem/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class StockItemHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllStockItems = this.importHandler("./get/all.ipc");
    this.getStockItemById = this.importHandler("./get/by_id.ipc");

    // ✏️ WRITE OPERATIONS
    this.createStockItem = this.importHandler("./create.ipc");
    this.updateStockItem = this.importHandler("./update.ipc");
    this.deleteStockItem = this.importHandler("./delete.ipc");

    // 🔄 STOCK MOVEMENTS
    this.transferStock = this.importHandler("./transfer.ipc");
    this.adjustStock = this.importHandler("./adjust.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[StockItemHandler] Failed to load handler: ${path}`,
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
        logger.info(`StockItemHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllStockItems":
          return await this.getAllStockItems(enrichedParams);
        case "getStockItemById":
          return await this.getStockItemById(enrichedParams);

        // WRITE (with transaction)
        case "createStockItem":
          return await this.handleWithTransaction(
            this.createStockItem,
            enrichedParams,
          );
        case "updateStockItem":
          return await this.handleWithTransaction(
            this.updateStockItem,
            enrichedParams,
          );
        case "deleteStockItem":
          return await this.handleWithTransaction(
            this.deleteStockItem,
            enrichedParams,
          );

        // STOCK MOVEMENTS (with transaction)
        case "transferStock":
          return await this.handleWithTransaction(
            this.transferStock,
            enrichedParams,
          );
        case "adjustStock":
          return await this.handleWithTransaction(
            this.adjustStock,
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
      console.error("StockItemHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("StockItemHandler error:", error);
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
        entity: "StockItem",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log stock item activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log stock item activity:", error);
    }
  }
}

const stockItemHandler = new StockItemHandler();

ipcMain.handle(
  "stockItem",
  withErrorHandling(
    stockItemHandler.handleRequest.bind(stockItemHandler),
    "IPC:stockItem",
  ),
);

module.exports = { StockItemHandler, stockItemHandler };
