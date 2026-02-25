// src/main/ipc/loyaltyTransaction/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class LoyaltyTransactionHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllLoyaltyTransactions = this.importHandler("./get/all.ipc");
    this.getLoyaltyTransactionById = this.importHandler("./get/by_id.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[LoyaltyTransactionHandler] Failed to load handler: ${path}`,
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
        logger.info(`LoyaltyTransactionHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllLoyaltyTransactions":
          return await this.getAllLoyaltyTransactions(enrichedParams);
        case "getLoyaltyTransactionById":
          return await this.getLoyaltyTransactionById(enrichedParams);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("LoyaltyTransactionHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("LoyaltyTransactionHandler error:", error);
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
        entity: "LoyaltyTransaction",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log loyalty transaction activity:", error);
      if (logger)
        // @ts-ignore
        logger.warn("Failed to log loyalty transaction activity:", error);
    }
  }
}

const loyaltyTransactionHandler = new LoyaltyTransactionHandler();

ipcMain.handle(
  "loyaltyTransaction",
  withErrorHandling(
    loyaltyTransactionHandler.handleRequest.bind(loyaltyTransactionHandler),
    "IPC:loyaltyTransaction",
  ),
);

module.exports = { LoyaltyTransactionHandler, loyaltyTransactionHandler };
