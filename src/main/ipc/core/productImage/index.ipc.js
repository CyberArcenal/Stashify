// src/main/ipc/productImage/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class ProductImageHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllProductImages = this.importHandler("./get/all.ipc");
    this.getProductImageById = this.importHandler("./get/by_id.ipc");
    this.createProductImage = this.importHandler("./create.ipc");
    this.updateProductImage = this.importHandler("./update.ipc");
    this.deleteProductImage = this.importHandler("./delete.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[ProductImageHandler] Failed to load handler: ${path}`,
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
        logger.info(`ProductImageHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllProductImages":
          return await this.getAllProductImages(enrichedParams);
        case "getProductImageById":
          return await this.getProductImageById(enrichedParams);
        case "createProductImage":
          return await this.handleWithTransaction(
            this.createProductImage,
            enrichedParams,
          );
        case "updateProductImage":
          return await this.handleWithTransaction(
            this.updateProductImage,
            enrichedParams,
          );
        case "deleteProductImage":
          return await this.handleWithTransaction(
            this.deleteProductImage,
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
      console.error("ProductImageHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("ProductImageHandler error:", error);
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
        entity: "ProductImage",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log product image activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log product image activity:", error);
    }
  }
}

const productImageHandler = new ProductImageHandler();

ipcMain.handle(
  "productImage",
  withErrorHandling(
    productImageHandler.handleRequest.bind(productImageHandler),
    "IPC:productImage",
  ),
);

module.exports = { ProductImageHandler, productImageHandler };
