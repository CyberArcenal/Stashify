// src/main/ipc/stockMovement/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class StockMovementHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS (basic)
    this.getAllStockMovements = this.importHandler("./get/all.ipc");
    this.getStockMovementById = this.importHandler("./get/by_id.ipc");

    // 📊 FILTERING & REPORTING
    this.getMovementsByProduct = this.importHandler("./get/by_product.ipc");
    this.getMovementsByWarehouse = this.importHandler("./get/by_warehouse.ipc");
    this.getMovementsByDateRange = this.importHandler(
      "./get/by_date_range.ipc",
    );
    this.getMovementSummary = this.importHandler("./get/summary.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[StockMovementHandler] Failed to load handler: ${path}`,
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
        logger.info(`StockMovementHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllStockMovements":
          return await this.getAllStockMovements(enrichedParams);
        case "getStockMovementById":
          return await this.getStockMovementById(enrichedParams);

        // FILTERING & REPORTING
        case "getMovementsByProduct":
          return await this.getMovementsByProduct(enrichedParams);
        case "getMovementsByWarehouse":
          return await this.getMovementsByWarehouse(enrichedParams);
        case "getMovementsByDateRange":
          return await this.getMovementsByDateRange(enrichedParams);
        case "getMovementSummary":
          return await this.getMovementSummary(enrichedParams);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("StockMovementHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("StockMovementHandler error:", error);
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
        entity: "StockMovement",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log stock movement activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log stock movement activity:", error);
    }
  }
}

const stockMovementHandler = new StockMovementHandler();

ipcMain.handle(
  "stockMovement",
  withErrorHandling(
    stockMovementHandler.handleRequest.bind(stockMovementHandler),
    "IPC:stockMovement",
  ),
);

module.exports = { StockMovementHandler, stockMovementHandler };
