//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { AuditLog } = require("../../../../entities/AuditLog");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");

class SalesReportHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getSalesReport = this.importHandler("./get/sales_report.ipc");
    this.refreshSalesReport = this.importHandler("./refresh_sales_report.ipc");
    this.getProductPerformance = this.importHandler(
      "./get/product_performance.ipc",
    );
    this.getCategoryPerformance = this.importHandler(
      "./get/category_performance.ipc",
    );
    this.getMonthlyTrends = this.importHandler("./get/monthly_trends.ipc");
    this.getSalesTargets = this.importHandler("./get/sales_targets.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      // @ts-ignore
      console.warn(
        `[SalesReportHandler] Failed to load handler: ${path}`,
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
        logger.info(`SalesReportHandler: ${method}`, { params });
      }

      switch (method) {
        case "getSalesReport":
          return await this.getSalesReport(params);
        case "refreshSalesReport":
          return await this.refreshSalesReport(params);
        case "getProductPerformance":
          return await this.getProductPerformance(params);
        case "getCategoryPerformance":
          return await this.getCategoryPerformance(params);
        case "getMonthlyTrends":
          return await this.getMonthlyTrends(params);
        case "getSalesTargets":
          return await this.getSalesTargets(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("SalesReportHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("SalesReportHandler error:", error);
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
        entity: "SalesReport",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log sales report activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log sales report activity:", error);
    }
  }
}

const salesReportHandler = new SalesReportHandler();

ipcMain.handle(
  "salesReport",
  withErrorHandling(
    salesReportHandler.handleRequest.bind(salesReportHandler),
    "IPC:salesReport",
  ),
);

module.exports = { SalesReportHandler, salesReportHandler };
