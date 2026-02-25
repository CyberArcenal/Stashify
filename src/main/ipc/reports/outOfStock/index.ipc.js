//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/datasource");
const { AuditLog } = require("../../../../entities/AuditLog");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class OutOfStockHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getOutOfStockReport = this.importHandler(
      "./get/out_of_stock_report.ipc",
    );
    this.refreshOutOfStockReport = this.importHandler(
      "./refresh_out_of_stock_report.ipc",
    );
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      // @ts-ignore
      console.warn(
        `[OutOfStockHandler] Failed to load handler: ${path}`,
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
        logger.info(`OutOfStockHandler: ${method}`, { params });
      }

      switch (method) {
        case "getOutOfStockReport":
          return await this.getOutOfStockReport(params);
        case "refreshOutOfStockReport":
          return await this.refreshOutOfStockReport(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("OutOfStockHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("OutOfStockHandler error:", error);
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
        entity: "OutOfStock",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log out of stock activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log out of stock activity:", error);
    }
  }
}

const outOfStockHandler = new OutOfStockHandler();

ipcMain.handle(
  "outOfStock",
  withErrorHandling(
    outOfStockHandler.handleRequest.bind(outOfStockHandler),
    "IPC:outOfStock",
  ),
);

module.exports = { OutOfStockHandler, outOfStockHandler };
