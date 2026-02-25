//@ts-check
const { ipcMain } = require("electron");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");

class AuditExportHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.exportAuditLogs = this.importHandler("./export_audit_logs.ipc");
    this.getExportPreview = this.importHandler("./get/export_preview.ipc");
    this.getSupportedFormats = this.importHandler("./get/supported_formats.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      // @ts-ignore
      console.warn(`[AuditExportHandler] Failed to load handler: ${path}`, error.message);
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

      if (logger) {
        // @ts-ignore
        logger.info(`AuditExportHandler: ${method}`, { params });
      }

      switch (method) {
        case "export":
          return await this.exportAuditLogs(params);
        case "exportPreview":
          return await this.getExportPreview(params);
        case "getSupportedFormats":
          return await this.getSupportedFormats(params);
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("AuditExportHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("AuditExportHandler error:", error);
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
    // No transaction needed for read-only export, but keep for consistency
    return await handler(params);
  }

  // @ts-ignore
  async logActivity(user_id, action, description, qr = null) {
    // Not needed for export handler, but keep for interface
  }
}

const auditExportHandler = new AuditExportHandler();

ipcMain.handle(
  "auditExport",
  withErrorHandling(
    auditExportHandler.handleRequest.bind(auditExportHandler),
    "IPC:auditExport"
  )
);

module.exports = { AuditExportHandler, auditExportHandler };