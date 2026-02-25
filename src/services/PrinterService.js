// src/services/PrinterService.js

const { AppDataSource } = require("../main/db/datasource");
const {
  companyName,
  companyLocation,
  receiptFooterMessage,
  receiptPrinterType,
} = require("../utils/settings/system");

const { logger } = require("../utils/logger");
const Order = require("../entities/Order");
const auditLogger = require("../utils/auditLogger");

class PrinterService {
  constructor() {
    this.driver = null;
    this.isReady = false; // track if printer is ready (last print success)
  }

  // @ts-ignore
  async _loadDriver(type) {
    switch (type.toLowerCase()) {
      case "thermal":
        const ThermalDriver = require("../drivers/thermalDriver");
        return new ThermalDriver();
      case "dot_matrix":
        // TODO: implement dot matrix driver if needed
        console.warn(
          "[PrinterService] Dot matrix driver not implemented, falling back to thermal",
        );
        const FallbackThermal = require("../drivers/thermalDriver");
        return new FallbackThermal();
      case "laser":
        // TODO: implement laser driver (e.g., PDF generation + system print)
        console.warn(
          "[PrinterService] Laser printer driver not implemented, falling back to thermal",
        );
        const FallbackThermal2 = require("../drivers/thermalDriver");
        return new FallbackThermal2();
      default:
        throw new Error(`Unsupported printer type: ${type}`);
    }
  }

  async _getDriver() {
    if (!this.driver) {
      const type = await receiptPrinterType();
      this.driver = await this._loadDriver(type);
    }
    return this.driver;
  }

  /**
   * Print a receipt for the given order ID.
   * @param {number} saleId
   * @returns {Promise<boolean>}
   */
  async printReceipt(saleId) {
    const notificationService = require("./Notification");
    let driver;
    try {
      driver = await this._getDriver();
    } catch (err) {
      // @ts-ignore
      console.error("[PrinterService] No driver available:", err.message);
      throw new Error("No driver available");
    }

    let order;
    try {
      order = await AppDataSource.getRepository(Order).findOne({
        where: { id: saleId },
        relations: ["saleItems", "saleItems.product", "customer"],
      });

      if (!order) {
        throw new Error(`order with ID ${saleId} not found`);
      }

      const receiptText = await this.formatReceipt(order);
      await driver.print(receiptText);
      this.isReady = true;

      await auditLogger.logCreate(
        "PrinterEvent",
        order.id,
        { action: "printReceipt" },
        "system",
      );
      console.log(`[PrinterService] Printed receipt for order #${order.id}`);
      return true;
    } catch (err) {
      // @ts-ignore
      console.error("[PrinterService] Failed to print receipt:", err.message);
      this.isReady = false;

      try {
        await notificationService.create(
          {
            userId: 1,
            title: "Printer Error",
            // @ts-ignore
            message: `Failed to print receipt: ${error.message}`,
            type: "error",
            // @ts-ignore
            metadata: { error: error.message },
          },
          "system",
        );
      } catch (notifErr) {
        // @ts-ignore
        logger.error("Failed to send printer error notification", notifErr);
      }

      throw err;
    }
  }

  /**
   * Format receipt text including the configurable footer.
   * @param {any} order
   * @returns {Promise<string>}
   */
  async formatReceipt(order) {
    const storeName = await companyName();
    const storeLocation = await companyLocation();
    const footer = await receiptFooterMessage();

    const itemsText = order.saleItems
      // @ts-ignore
      .map((i) => `${i.product.name} x${i.quantity} = ${i.lineTotal}`)
      .join("\n");

    const receipt = `
      ${storeName}
      Address: ${storeLocation}
      -------------------------
      order #${order.id}
      -------------------------
${itemsText}
      -------------------------
      TOTAL: ${order.totalAmount}
      Payment: ${order.paymentMethod}
      -------------------------
      ${footer}
      Thank you for shopping!
    `;

    // Trim extra spaces for cleaner output
    return receipt.replace(/^\s+/gm, "").trim();
  }

  getStatus() {
    return {
      driverLoaded: !!this.driver,
      isReady: this.isReady,
    };
  }

  isAvailable() {
    return !!this.driver;
  }
}

module.exports = PrinterService;
