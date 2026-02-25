//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/datasource");
const { AuditLog } = require("../../../../entities/AuditLog");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class LowStockHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getLowStockReport = this.importHandler("./get/low_stock_report.ipc");
    this.refreshLowStockReport = this.importHandler(
      "./refresh_low_stock_report.ipc",
    );
    this.exportLowStock = this.importHandler("./lowStock/export_low_stock.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[LowStockHandler] Failed to load handler: ${path}`,
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

      if (logger) {
        // @ts-ignore
        logger.info(`LowStockHandler: ${method}`, { params });
      }

      switch (method) {
        case "getLowStockReport":
          return await this.getLowStockReport(params);
        case "refreshLowStockReport":
          return await this.refreshLowStockReport(params);
        case "exportLowStock":
          return await this.handleWithTransaction(this.exportLowStock, params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("LowStockHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("LowStockHandler error:", error);
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
        entity: "LowStock",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log low stock activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log low stock activity:", error);
    }
  }
}

const lowStockHandler = new LowStockHandler();

ipcMain.handle(
  "lowStock",
  withErrorHandling(
    lowStockHandler.handleRequest.bind(lowStockHandler),
    "IPC:lowStock",
  ),
);

module.exports = { LowStockHandler, lowStockHandler };
