// src/main/ipc/product/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class ProductHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllProducts = this.importHandler("./get/all.ipc");
    this.getProductById = this.importHandler("./get/by_id.ipc");
    this.getLowStockProducts = this.importHandler("./get/low_stock.ipc");
    this.getProductStatistics = this.importHandler("./get/statistics.ipc");


    // ✏️ WRITE OPERATIONS (basic)
    this.createProduct = this.importHandler("./create.ipc");
    this.updateProduct = this.importHandler("./update.ipc");
    this.deleteProduct = this.importHandler("./delete.ipc");

  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[ProductHandler] Failed to load handler: ${path}`,
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
        logger.info(`ProductHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllProducts":
          return await this.getAllProducts(enrichedParams);
        case "getProductById":
          return await this.getProductById(enrichedParams);
        case "getLowStockProducts":
          return await this.getLowStockProducts(enrichedParams);
        case "getProductStatistics":
          return await this.getProductStatistics(enrichedParams);

        // WRITE (with transaction)
        case "createProduct":
          return await this.handleWithTransaction(
            this.createProduct,
            enrichedParams,
          );
        case "updateProduct":
          return await this.handleWithTransaction(
            this.updateProduct,
            enrichedParams,
          );
        case "deleteProduct":
          return await this.handleWithTransaction(
            this.deleteProduct,
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
      console.error("ProductHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("ProductHandler error:", error);
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
        entity: "Product",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log product activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log product activity:", error);
    }
  }
}

const productHandler = new ProductHandler();

ipcMain.handle(
  "product",
  withErrorHandling(
    productHandler.handleRequest.bind(productHandler),
    "IPC:product",
  ),
);

module.exports = { ProductHandler, productHandler };