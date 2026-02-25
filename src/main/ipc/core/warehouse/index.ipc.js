// src/main/ipc/warehouse/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class WarehouseHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllWarehouses = this.importHandler("./get/all.ipc");
    this.getWarehouseById = this.importHandler("./get/by_id.ipc");
    this.createWarehouse = this.importHandler("./create.ipc");
    this.updateWarehouse = this.importHandler("./update.ipc");
    this.deleteWarehouse = this.importHandler("./delete.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[WarehouseHandler] Failed to load handler: ${path}`,
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
        logger.info(`WarehouseHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllWarehouses":
          return await this.getAllWarehouses(enrichedParams);
        case "getWarehouseById":
          return await this.getWarehouseById(enrichedParams);
        case "createWarehouse":
          return await this.handleWithTransaction(
            this.createWarehouse,
            enrichedParams,
          );
        case "updateWarehouse":
          return await this.handleWithTransaction(
            this.updateWarehouse,
            enrichedParams,
          );
        case "deleteWarehouse":
          return await this.handleWithTransaction(
            this.deleteWarehouse,
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
      console.error("WarehouseHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("WarehouseHandler error:", error);
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
        entity: "Warehouse",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log warehouse activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log warehouse activity:", error);
    }
  }
}

const warehouseHandler = new WarehouseHandler();

ipcMain.handle(
  "warehouse",
  withErrorHandling(
    warehouseHandler.handleRequest.bind(warehouseHandler),
    "IPC:warehouse",
  ),
);

module.exports = { WarehouseHandler, warehouseHandler };
