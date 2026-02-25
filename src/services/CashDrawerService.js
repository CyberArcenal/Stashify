// src/services/CashDrawerService.js

const { logger } = require("../utils/logger");

/**
 * @typedef {Object} SystemSettings
 * @property {() => Promise<boolean>} enableCashDrawer
 * @property {() => Promise<string>} drawerOpenCode
 * @property {() => Promise<'printer'|'usb'|string>} cashDrawerConnectionType
 */

/**
 * @typedef {Object} NotificationService
 * @property {(notification: Object, actor: string) => Promise<any>} create
 */

/**
 * @typedef {Object} AuditLogger
 * @property {(action: string, entity: string, entityId: any, data: any, actor: string) => Promise<void>} logCreate
 */

class CashDrawerService {
  /**
   * @param {Object} deps
   * @param {SystemSettings} deps.systemSettings
   * @param {NotificationService} deps.notificationService
   * @param {AuditLogger} deps.auditLogger
   * @param {Object} [deps.logger] - Optional logger (defaults to console)
   */
  constructor({ systemSettings, notificationService, auditLogger, logger = console }) {
    this.systemSettings = systemSettings;
    this.notificationService = notificationService;
    this.auditLogger = auditLogger;
    logger = logger;

    /** @type {any | null} */
    this.driver = null;
    this.isOpen = false;
  }

  /**
   * Load the appropriate driver based on connection type.
   * @private
   */
  async _loadDriver() {
    const connectionType = await this.systemSettings.cashDrawerConnectionType();

    const DriverClass = CashDrawerDriverFactory.getDriver(connectionType);
    if (!DriverClass) {
      throw new Error(`Unsupported cash drawer connection type: ${connectionType}`);
    }

    // Instantiate driver (driver constructor may accept additional config)
    return new DriverClass();
  }

  /**
   * Get or initialize the driver.
   * @private
   */
  async _getDriver() {
    if (!this.driver) {
      this.driver = await this._loadDriver();
    }
    return this.driver;
  }

  /**
   * Open the cash drawer if enabled.
   * @param {string} reason - Reason for opening (e.g., "sale", "refund", "test")
   * @returns {Promise<boolean>}
   * @throws {Error} if drawer is disabled or driver fails
   */
  async openDrawer(reason = "sale") {
    const drawerEnabled = await this.systemSettings.enableCashDrawer();
    if (!drawerEnabled) {
      const error = new Error("Cash drawer is disabled in settings");
      logger.warn("[CashDrawerService] Attempted to open drawer when disabled");
      throw error;
    }

    try {
      const driver = await this._getDriver();

      if (typeof driver.openDrawer !== "function") {
        throw new Error("Current driver does not support openDrawer");
      }

      const code = await this.systemSettings.drawerOpenCode();
      const pin = this._parsePinCode(code);

      await driver.openDrawer(pin);
      this.isOpen = true;

      await this.auditLogger.logCreate(
        "CashDrawerEvent",
        null,
        { action: "openDrawer", reason },
        "system"
      );

      logger.info(`[CashDrawerService] Drawer opened (${reason})`);
      return true;

    } catch (err) {
      this.isOpen = false;
      const errorMessage = err instanceof Error ? err.message : String(err);

      logger.error(`[CashDrawerService] Failed to open drawer: ${errorMessage}`);

      // Notify admins (you might want to limit this to avoid spam)
      await this._sendErrorNotification(reason, err);

      throw err; // Re-throw for caller to handle
    }
  }

  /**
   * Parse drawer open code from settings.
   * @private
   */
  _parsePinCode(code) {
    if (!code) return 0;
    const parsed = parseInt(code.trim(), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Send an error notification about drawer failure.
   * @private
   */
  async _sendErrorNotification(reason, error) {
    try {
      await this.notificationService.create(
        {
          userId: 1, // Consider making this configurable
          title: "Cash Drawer Error",
          message: `Failed to open cash drawer (${reason}): ${error instanceof Error ? error.message : error}`,
          type: "error",
          metadata: {
            reason,
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
        "system"
      );
    } catch (notifErr) {
      logger.error("Failed to send error notification for cash drawer", notifErr);
    }
  }

  /**
   * Get current status of the drawer service.
   * @returns {{ driverLoaded: boolean, isOpen: boolean }}
   */
  getStatus() {
    return {
      driverLoaded: !!this.driver,
      isOpen: this.isOpen,
    };
  }

  /**
   * Check if the drawer driver is available.
   * @returns {boolean}
   */
  isAvailable() {
    return !!this.driver;
  }
}

/**
 * Factory for creating cash drawer drivers based on connection type.
 */
class CashDrawerDriverFactory {
  static getDriver(type) {
    switch (type) {
      case "printer":
        // Defer require to avoid circular dependencies and only load when needed
        return require("../drivers/thermalDriver");
      case "usb":
        return require("../drivers/usbDrawerDriver");
      default:
        return null;
    }
  }
}

module.exports = CashDrawerService;