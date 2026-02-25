// src/main/ipc/supplier/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class SupplierHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllSuppliers = this.importHandler("./get/all.ipc");
    this.getSupplierById = this.importHandler("./get/by_id.ipc");
    this.createSupplier = this.importHandler("./create.ipc");
    this.updateSupplier = this.importHandler("./update.ipc");
    this.deleteSupplier = this.importHandler("./delete.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[SupplierHandler] Failed to load handler: ${path}`,
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
        logger.info(`SupplierHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllSuppliers":
          return await this.getAllSuppliers(enrichedParams);
        case "getSupplierById":
          return await this.getSupplierById(enrichedParams);
        case "createSupplier":
          return await this.handleWithTransaction(
            this.createSupplier,
            enrichedParams,
          );
        case "updateSupplier":
          return await this.handleWithTransaction(
            this.updateSupplier,
            enrichedParams,
          );
        case "deleteSupplier":
          return await this.handleWithTransaction(
            this.deleteSupplier,
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
      console.error("SupplierHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("SupplierHandler error:", error);
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
        entity: "Supplier",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log supplier activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log supplier activity:", error);
    }
  }
}

const supplierHandler = new SupplierHandler();

ipcMain.handle(
  "supplier",
  withErrorHandling(
    supplierHandler.handleRequest.bind(supplierHandler),
    "IPC:supplier",
  ),
);

module.exports = { SupplierHandler, supplierHandler };
