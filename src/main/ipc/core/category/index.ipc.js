// src/main/ipc/category/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");


class CategoryHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllCategories = this.importHandler("./get/all.ipc");
    this.getCategoryById = this.importHandler("./get/by_id.ipc");
    this.createCategory = this.importHandler("./create.ipc");
    this.updateCategory = this.importHandler("./update.ipc");
    this.deleteCategory = this.importHandler("./delete.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      // @ts-ignore
      console.warn(`[CategoryHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`CategoryHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllCategories":
          return await this.getAllCategories(enrichedParams);
        case "getCategoryById":
          return await this.getCategoryById(enrichedParams);
        case "createCategory":
          return await this.handleWithTransaction(this.createCategory, enrichedParams);
        case "updateCategory":
          return await this.handleWithTransaction(this.updateCategory, enrichedParams);
        case "deleteCategory":
          return await this.handleWithTransaction(this.deleteCategory, enrichedParams);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("CategoryHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("CategoryHandler error:", error);
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
        entity: "Category",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log category activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log category activity:", error);
    }
  }
}

const categoryHandler = new CategoryHandler();

ipcMain.handle(
  "category",
  withErrorHandling(categoryHandler.handleRequest.bind(categoryHandler), "IPC:category")
);

module.exports = { CategoryHandler, categoryHandler };