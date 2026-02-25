// src/main/ipc/customer/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { AppDataSource } = require("../../../db/datasource");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");
const { AuditLog } = require("../../../../entities/AuditLog");

class CustomerHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ OPERATIONS
    this.getAllCustomers = this.importHandler("./get/all.ipc");
    this.getCustomerById = this.importHandler("./get/by_id.ipc");
    this.getCustomerLoyaltyHistory = this.importHandler(
      "./get/loyalty_history.ipc",
    );

    // ✏️ WRITE OPERATIONS (basic)
    this.createCustomer = this.importHandler("./create.ipc");
    this.updateCustomer = this.importHandler("./update.ipc");
    this.deleteCustomer = this.importHandler("./delete.ipc");

    // 💰 LOYALTY OPERATIONS
    this.addLoyaltyPoints = this.importHandler("./loyalty/add_points.ipc");
    this.redeemLoyaltyPoints = this.importHandler(
      "./loyalty/redeem_points.ipc",
    );
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(
        `[CustomerHandler] Failed to load handler: ${path}`,
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
        logger.info(`CustomerHandler: ${method}`, { params });
      }

      switch (method) {
        // READ
        case "getAllCustomers":
          return await this.getAllCustomers(enrichedParams);
        case "getCustomerById":
          return await this.getCustomerById(enrichedParams);
        case "getCustomerLoyaltyHistory":
          return await this.getCustomerLoyaltyHistory(enrichedParams);

        // WRITE (with transaction)
        case "createCustomer":
          return await this.handleWithTransaction(
            this.createCustomer,
            enrichedParams,
          );
        case "updateCustomer":
          return await this.handleWithTransaction(
            this.updateCustomer,
            enrichedParams,
          );
        case "deleteCustomer":
          return await this.handleWithTransaction(
            this.deleteCustomer,
            enrichedParams,
          );

        // LOYALTY (with transaction)
        case "addLoyaltyPoints":
          return await this.handleWithTransaction(
            this.addLoyaltyPoints,
            enrichedParams,
          );
        case "redeemLoyaltyPoints":
          return await this.handleWithTransaction(
            this.redeemLoyaltyPoints,
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
      console.error("CustomerHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("CustomerHandler error:", error);
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
        entity: "Customer",
        timestamp: new Date(),
      });
      await saveDb(activityRepo, activity);
    } catch (error) {
      console.warn("Failed to log customer activity:", error);
      // @ts-ignore
      if (logger) logger.warn("Failed to log customer activity:", error);
    }
  }
}

const customerHandler = new CustomerHandler();

ipcMain.handle(
  "customer",
  withErrorHandling(
    customerHandler.handleRequest.bind(customerHandler),
    "IPC:customer",
  ),
);

module.exports = { CustomerHandler, customerHandler };
