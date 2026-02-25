// src/main/ipc/productVariant/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class ProductVariantHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllProductVariants = this.importHandler("./get/all.ipc");
    this.getProductVariantById = this.importHandler("./get/by_id.ipc");
    this.getVariantsByProduct = this.importHandler("./get/by_product.ipc");

    // ✏️ WRITE OPERATIONS (basic)
    this.createProductVariant = this.importHandler("./create.ipc");
    this.updateProductVariant = this.importHandler("./update.ipc");
    this.deleteProductVariant = this.importHandler("./delete.ipc");

    // 🔄 STOCK SYNC OPERATIONS
    this.syncVariantStock = this.importHandler("./sync_stock.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[ProductVariantHandler] Failed to load handler: ${path}`,
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
        logger.info(`ProductVariantHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllProductVariants":
          return await this.getAllProductVariants(enrichedParams);
        case "getProductVariantById":
          return await this.getProductVariantById(enrichedParams);
        case "getVariantsByProduct":
          return await this.getVariantsByProduct(enrichedParams);

        // WRITE (with transaction)
        case "createProductVariant":
          return await this.handleWithTransaction(
            this.createProductVariant,
            enrichedParams,
          );
        case "updateProductVariant":
          return await this.handleWithTransaction(
            this.updateProductVariant,
            enrichedParams,
          );
        case "deleteProductVariant":
          return await this.handleWithTransaction(
            this.deleteProductVariant,
            enrichedParams,
          );

        // STOCK SYNC (with transaction)
        case "syncVariantStock":
          return await this.handleWithTransaction(
            this.syncVariantStock,
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
      console.error("ProductVariantHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("ProductVariantHandler error:", error);
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
        entity: "ProductVariant",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log product variant activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log product variant activity:", error);
    }
  }
}

const productVariantHandler = new ProductVariantHandler();

ipcMain.handle(
  "productVariant",
  withErrorHandling(
    productVariantHandler.handleRequest.bind(productVariantHandler),
    "IPC:productVariant",
  ),
);

module.exports = { ProductVariantHandler, productVariantHandler };
