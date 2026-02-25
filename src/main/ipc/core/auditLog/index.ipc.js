// src/main/ipc/auditLog/index.ipc.js
//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class AuditLogHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.getAllAuditLogs = this.importHandler("./get/all.ipc");
    this.getAuditLogById = this.importHandler("./get/by_id.ipc");
    // No write operations – audit logs are created automatically by the system.
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      // @ts-ignore
      console.warn(`[AuditLogHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`AuditLogHandler: ${method}`, { params });
      }

      switch (method) {
        case "getAllAuditLogs":
          return await this.getAllAuditLogs(enrichedParams);
        case "getAuditLogById":
          return await this.getAuditLogById(enrichedParams);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("AuditLogHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("AuditLogHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }

  // No transaction or logActivity needed for read-only handler.
}

const auditLogHandler = new AuditLogHandler();

ipcMain.handle(
  "auditLog",
  withErrorHandling(auditLogHandler.handleRequest.bind(auditLogHandler), "IPC:auditLog")
);

module.exports = { AuditLogHandler, auditLogHandler };