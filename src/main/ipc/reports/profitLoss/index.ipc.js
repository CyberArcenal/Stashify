//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/datasource");
const { AuditLog } = require("../../../../entities/AuditLog");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class ProfitLossHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getProfitLossReport = this.importHandler(
      "./get/profit_loss_report.ipc",
    );
    this.refreshProfitLossReport = this.importHandler(
      "./refresh_profit_loss_report.ipc",
    );
    this.getExpenseBreakdown = this.importHandler(
      "./get/expense_breakdown.ipc",
    );
    this.getMonthlyTrends = this.importHandler("./get/monthly_trends.ipc");
    this.getPerformanceMetrics = this.importHandler(
      "./get/performance_metrics.ipc",
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
        `[ProfitLossHandler] Failed to load handler: ${path}`,
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
        logger.info(`ProfitLossHandler: ${method}`, { params });
      }

      switch (method) {
        case "getProfitLossReport":
          return await this.getProfitLossReport(params);
        case "refreshProfitLossReport":
          return await this.refreshProfitLossReport(params);
        case "getExpenseBreakdown":
          return await this.getExpenseBreakdown(params);
        case "getMonthlyTrends":
          return await this.getMonthlyTrends(params);
        case "getPerformanceMetrics":
          return await this.getPerformanceMetrics(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("ProfitLossHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("ProfitLossHandler error:", error);
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
        entity: "ProfitLoss",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log profit/loss activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log profit/loss activity:", error);
    }
  }
}

const profitLossHandler = new ProfitLossHandler();

ipcMain.handle(
  "profitLoss",
  withErrorHandling(
    profitLossHandler.handleRequest.bind(profitLossHandler),
    "IPC:profitLoss",
  ),
);

module.exports = { ProfitLossHandler, profitLossHandler };
