// src/main/ipc/dashboard/index.ipc.js - Dashboard Handler
//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/datasource");
const { AuditLog } = require("../../../../entities/AuditLog");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class DashboardHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📊 DASHBOARD HANDLERS
    this.getDashboardData = this.importHandler("./get/dashboard_data.ipc");
    this.refreshDashboardData = this.importHandler("./refresh_dashboard_data.ipc");
  }

  /**
   * @param {string} path
   */
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[DashboardHandler] Failed to load handler: ${path}`,
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

  /** @param {Electron.IpcMainInvokeEvent} event @param {{ method: any; params: {}; }} payload */
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      if (logger) {
        // @ts-ignore
        logger.info(`DashboardHandler: ${method}`, { params });
      }

      switch (method) {
        case "getDashboardData":
          return await this.getDashboardData(params);
        case "refreshDashboardData":
          return await this.refreshDashboardData(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("DashboardHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("DashboardHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }

  /**
   * Wrap critical operations in a database transaction
   * @param {(arg0: any, arg1: import("typeorm").QueryRunner) => any} handler
   * @param {{ userId: any; }} params
   */
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

  /**
   * @param {any} user_id
   * @param {any} action
   * @param {any} description
   */
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
        entity: "Dashboard",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log dashboard activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log dashboard activity:", error);
    }
  }
}

const dashboardHandler = new DashboardHandler();

ipcMain.handle(
  "dashboard",
  withErrorHandling(
    // @ts-ignore
    dashboardHandler.handleRequest.bind(dashboardHandler),
    "IPC:dashboard"
  )
);

module.exports = { DashboardHandler, dashboardHandler };