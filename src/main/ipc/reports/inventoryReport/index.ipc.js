// src/main/ipc/inventoryReport/index.ipc.js - Inventory Report Handler
//@ts-check
const { ipcMain } = require("electron");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { AppDataSource } = require("../../../db/datasource");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class InventoryReportHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📊 REPORT HANDLERS
    this.getInventoryReport = this.importHandler("./get/inventory_report.ipc");
    this.refreshInventoryReport = this.importHandler("./refresh_inventory_report.ipc");
    this.getLowStockProducts = this.importHandler("./get/low_stock_products.ipc");
    this.getCategoryStock = this.importHandler("./get/category_stock.ipc");
    this.getStockMovements = this.importHandler("./get/stock_movements.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[InventoryReportHandler] Failed to load handler: ${path}`,
        // @ts-ignore
        error.message
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

      if (logger) {
        // @ts-ignore
        logger.info(`InventoryReportHandler: ${method}`, { params });
      }

      switch (method) {
        case "getInventoryReport":
          return await this.getInventoryReport(params);
        case "refreshInventoryReport":
          return await this.refreshInventoryReport(params);
        case "getLowStockProducts":
          return await this.getLowStockProducts(params);
        case "getCategoryStock":
          return await this.getCategoryStock(params);
        case "getStockMovements":
          return await this.getStockMovements(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("InventoryReportHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("InventoryReportHandler error:", error);
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
        entity: "InventoryReport",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log inventory report activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log inventory report activity:", error);
    }
  }
}

const inventoryReportHandler = new InventoryReportHandler();

ipcMain.handle(
  "inventoryReport",
  withErrorHandling(
    inventoryReportHandler.handleRequest.bind(inventoryReportHandler),
    "IPC:inventoryReport"
  )
);

module.exports = { InventoryReportHandler, inventoryReportHandler };