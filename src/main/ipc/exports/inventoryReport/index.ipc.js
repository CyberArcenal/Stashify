//@ts-check
const { ipcMain } = require("electron");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");
const { logger } = require("../../../../utils/logger");

class InventoryReportExportHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.exportInventoryReport = this.importHandler("./export_inventory_report.ipc");
    this.getExportPreview = this.importHandler("./get/export_preview.ipc");
    this.getExportHistory = this.importHandler("./get/export_history.ipc");
    this.getSupportedFormats = this.importHandler("./get/supported_formats.ipc");
  }

  // @ts-ignore
  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      // @ts-ignore
      console.warn(`[InventoryReportExportHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`InventoryReportExportHandler: ${method}`, { params });
      }

      switch (method) {
        case "export":
          return await this.exportInventoryReport(params);
        case "exportPreview":
          return await this.getExportPreview(params);
        case "getExportHistory":
          return await this.getExportHistory(params);
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
      console.error("InventoryReportExportHandler error:", error);
      // @ts-ignore
      if (logger) logger.error("InventoryReportExportHandler error:", error);
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
    return await handler(params);
  }

  // @ts-ignore
  async logActivity(user_id, action, description, qr = null) {
    // Not needed for export handler
  }
}

const inventoryReportExportHandler = new InventoryReportExportHandler();

ipcMain.handle(
  "inventoryReportExport",
  withErrorHandling(
    inventoryReportExportHandler.handleRequest.bind(inventoryReportExportHandler),
    "IPC:inventoryReportExport"
  )
);

module.exports = { InventoryReportExportHandler, inventoryReportExportHandler };