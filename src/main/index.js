// src/main/index.js
// @ts-check
/**
 * @file Main entry point for Inventory Management System
 * @version 1.2.0
 * @author CyberArcenal
 * @description Electron main process with TypeORM, SQLite, React, and auto-updater
 */

// ===================== CORE IMPORTS =====================
const {
  app,
  ipcMain,
  screen,
  dialog,
  shell,
  // @ts-ignore
  BrowserWindow,
// @ts-ignore
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const url = require("url");
// @ts-ignore
const { autoUpdater } = require("electron-updater");

// TypeORM and Database
// @ts-ignore
require("reflect-metadata");
const { AppDataSource } = require("./db/datasource");
const MigrationManager = require("../utils/dbUtils/migrationManager");
const { companyName } = require("../utils/settings/system");
const showErrorPage = require("../utils/errorPage");

// ===================== TYPE DEFINITIONS =====================
/**
 * @typedef {import('electron').BrowserWindow} BrowserWindow
 * @typedef {import('typeorm').DataSource} DataSource
 */

/**
 * @typedef {Object} AppConfig
 * @property {boolean} isDev - Development mode flag
 * @property {string} appName - Application name
 * @property {string} version - App version
 * @property {string} userDataPath - Path to user data directory
 */

/**
 * @typedef {Object} MigrationResult
 * @property {boolean} success - Migration success status
 * @property {string} message - Result message
 * @property {Error} [error] - Error object if any
 */

// ===================== GLOBAL STATE =====================
/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {BrowserWindow | null} */
let splashWindow = null;

/** @type {BrowserWindow | null} */
// @ts-ignore
// @ts-ignore
let activationWindow = null;

/** @type {boolean} */
let isDatabaseInitialized = false;

/** @type {boolean} */
let isShuttingDown = false;

/** @type {MigrationManager | null} */
let migrationManager = null;

/** @type {AppConfig} */
const APP_CONFIG = {
  isDev: process.env.NODE_ENV === "development" || !app.isPackaged,
  appName: "Inventory Pro",
  version: app.getVersion(),
  userDataPath: app.getPath("userData"),
};

// ===================== LOGGING SERVICE =====================
/**
 * Log levels for consistent logging
 * @enum {string}
 */
const LogLevel = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  SUCCESS: "SUCCESS",
};

/**
 * Enhanced logging utility with file writing capability
 * @param {LogLevel} level - Log level
 * @param {string} message - Log message
 * @param {any} [data] - Optional data to log
 * @param {boolean} [writeToFile=false] - Write to log file
 */
async function log(level, message, data = null, writeToFile = false) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${APP_CONFIG.appName} ${level}]`;
  const logMessage = `${prefix} ${message}`;

  if (APP_CONFIG.isDev) {
    const colors = {
      [LogLevel.DEBUG]: "\x1b[36m",
      [LogLevel.INFO]: "\x1b[34m",
      [LogLevel.WARN]: "\x1b[33m",
      [LogLevel.ERROR]: "\x1b[31m",
      [LogLevel.SUCCESS]: "\x1b[32m",
    };
    console.log(`${colors[level] || ""}${logMessage}\x1b[0m`);
  } else {
    console.log(logMessage);
  }

  if (data) {
    console.dir(data, { depth: 3, colors: APP_CONFIG.isDev });
  }

  if (writeToFile && !APP_CONFIG.isDev) {
    try {
      const logDir = path.join(APP_CONFIG.userDataPath, "logs");
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(
        logDir,
        `Inventory-${new Date().toISOString().split("T")[0]}.log`
      );
      const logEntry = `${logMessage}${
        data ? "\n" + JSON.stringify(data, null, 2) : ""
      }\n`;

      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error("Failed to write log to file:", error);
    }
  }
}

// ===================== ERROR HANDLING =====================
/**
 * Custom error classes for better error tracking
 */
// @ts-ignore
// @ts-ignore
class DatabaseError extends Error {
  // @ts-ignore
  constructor(message, originalError) {
    super(message);
    this.name = "DatabaseError";
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

class WindowError extends Error {
  // @ts-ignore
  constructor(message, windowType) {
    super(message);
    this.name = "WindowError";
    this.windowType = windowType;
    this.timestamp = new Date().toISOString();
  }
}

// @ts-ignore
// @ts-ignore
class MigrationError extends Error {
  // @ts-ignore
  constructor(message, pendingMigrations = []) {
    super(message);
    this.name = "MigrationError";
    this.pendingMigrations = pendingMigrations;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Global error handler for uncaught exceptions
 */
function setupGlobalErrorHandlers() {
  process.on("uncaughtException", (error) => {
    log(
      LogLevel.ERROR,
      "Uncaught Exception:",
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      true
    );

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("app:error", {
        type: "uncaughtException",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    log(
      LogLevel.ERROR,
      "Unhandled Promise Rejection:",
      {
        reason: reason instanceof Error ? reason.message : reason,
        promise: promise.toString(),
        timestamp: new Date().toISOString(),
      },
      true
    );
  });

  // @ts-ignore
  // @ts-ignore
  app.on("renderer-process-crashed", (event, webContents, killed) => {
    log(
      LogLevel.ERROR,
      "Renderer process crashed:",
      {
        killed,
        webContentsId: webContents.id,
        timestamp: new Date().toISOString(),
      },
      true
    );
  });
}

// ===================== DATABASE SERVICE =====================
async function initializeDatabase() {
  try {
    log(LogLevel.INFO, "Initializing database...");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      log(LogLevel.SUCCESS, "Database connected");
    }

    migrationManager = new MigrationManager(AppDataSource);

    const status = await migrationManager.getMigrationStatus();

    if (status.needsMigration) {
      log(
        LogLevel.INFO,
        `Found ${status.pending} pending migration(s). Running now...`
      );

      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send("migration:status", {
          status: "running",
          message: "Updating database structure...",
        });
      }

      const result = await migrationManager.runMigrations();

      if (result.success) {
        log(LogLevel.SUCCESS, result.message);
        if (splashWindow) {
          splashWindow.webContents.send("migration:status", {
            status: "completed",
            message: result.message,
          });
        }
      } else {
        log(LogLevel.ERROR, "Migration failed:", result.error);
        dialog.showMessageBoxSync({
          type: "warning",
          title: "Migration Warning",
          message: "Database update had an issue",
          detail: result.message + "\n\nContinuing with current schema.",
          buttons: ["OK"],
        });
      }
    } else {
      log(LogLevel.INFO, "Database is up to date ✅");
    }

    isDatabaseInitialized = true;
    return { success: true };
  } catch (error) {
    log(LogLevel.ERROR, "Database init failed:", error);

    try {
      await AppDataSource.synchronize(false);
      log(LogLevel.WARN, "Used fallback synchronize");
      isDatabaseInitialized = true;
      return { success: true, fallback: true };
    } catch (e) {
      // @ts-ignore
      return { success: false, error: e.message };
    }
  }
}

/**
 * Safely close database connection
 */
async function safeCloseDatabase() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      log(LogLevel.INFO, "Database connection closed gracefully");
      isDatabaseInitialized = false;
    }
  } catch (error) {
    log(LogLevel.ERROR, "Error closing database connection:", error);
  }
}

// ===================== WINDOW MANAGEMENT =====================
/**
 * Get icon path based on platform and environment
 * @returns {string}
 */
function getIconPath() {
  const platform = process.platform;
  const iconDir = APP_CONFIG.isDev
    ? path.resolve(__dirname, "..", "..", "build")
    : path.join(process.resourcesPath, "build");

  const iconMap = {
    win32: "icon.ico",
    darwin: "icon.icns",
    linux: "icon.png",
  };

  // @ts-ignore
  const iconFile = iconMap[platform] || "icon.png";
  const iconPath = path.join(iconDir, iconFile);

  // @ts-ignore
  return fsSync.existsSync(iconPath) ? iconPath : null;
}

/**
 * Create splash window
 * @returns {Promise<BrowserWindow>}
 */
async function createSplashWindow() {
  try {
    log(LogLevel.INFO, "Creating splash window...");

    const splashConfig = {
      width: 500,
      height: 400,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      center: true,
      resizable: false,
      movable: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    };

    splashWindow = new BrowserWindow(splashConfig);

    const splashPath = path.join(__dirname, "splash.html");
    if (!fsSync.existsSync(splashPath)) {
      throw new WindowError("Splash HTML file not found", "splash");
    }

    await splashWindow.loadFile(splashPath);
    splashWindow.show();

    log(LogLevel.SUCCESS, "Splash window created");
    return splashWindow;
  } catch (error) {
    throw new WindowError(
      // @ts-ignore
      `Failed to create splash window: ${error.message}`,
      "splash"
    );
  }
}

/**
 * Get application URL for main window
 * @returns {Promise<string>}
 */
async function getAppUrl() {
  if (APP_CONFIG.isDev) {
    const devServerUrl = "http://localhost:5173";
    log(LogLevel.INFO, `Development mode - URL: ${devServerUrl}`);
    return devServerUrl;
  }

  // Production paths to check (with and without renderer subfolder)
  const possiblePaths = [
    path.join(__dirname, "..", "..", "dist", "index.html"),
    path.join(__dirname, "..", "..", "dist", "renderer", "index.html"),
    // @ts-ignore
    path.join(process.resourcesPath, "app.asar.unpacked", "dist", "index.html"),
    // @ts-ignore
    path.join(process.resourcesPath, "dist", "index.html"),
    path.join(app.getAppPath(), "dist", "index.html"),
  ];

  for (const filePath of possiblePaths) {
    try {
      await fs.access(filePath);
      const fileUrl = url.pathToFileURL(filePath).href;
      log(LogLevel.INFO, `Found production build at: ${filePath}`);
      return fileUrl;
    } catch {
      continue;
    }
  }

  throw new Error(
    `Production build not found. Checked paths:\n${possiblePaths.join("\n")}`
  );
}

/**
 * Create main application window
 * @returns {Promise<BrowserWindow>}
 */
async function createMainWindow() {
  try {
    log(LogLevel.INFO, "Creating main window...");

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } =
      primaryDisplay.workAreaSize;
    const windowWidth = Math.min(1400, screenWidth - 100);
    const windowHeight = Math.min(900, screenHeight - 100);
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = Math.floor((screenHeight - windowHeight) / 2);

    const windowConfig = {
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      minWidth: 1024,
      minHeight: 768,
      show: false,
      frame: true,
      titleBarStyle: "default",
      backgroundColor: "#ffffff",
      icon: getIconPath(),
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: !APP_CONFIG.isDev,
        sandbox: true,
        enableRemoteModule: false,
      },
    };

    // @ts-ignore
    mainWindow = new BrowserWindow(windowConfig);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setTitle((await companyName()) || APP_CONFIG.appName);

    // Window event handlers
    mainWindow.on("ready-to-show", () => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        setTimeout(() => {
          // @ts-ignore
          splashWindow.close();
          splashWindow = null;
        }, 300);
      }

      // @ts-ignore
      mainWindow.show();
      // @ts-ignore
      mainWindow.focus();
      // @ts-ignore
      mainWindow.center();
      log(LogLevel.SUCCESS, "Main window ready");

      // Send app ready event with data (aligned with POS)
      // @ts-ignore
      mainWindow.webContents.send("app:ready", {
        version: APP_CONFIG.version,
        isDev: APP_CONFIG.isDev,
        databaseReady: isDatabaseInitialized,
      });
    });

    // Close confirmation dialog (from POS)
    // @ts-ignore
    mainWindow.on("close", (event) => {
      if (!APP_CONFIG.isDev && !isShuttingDown) {
        event.preventDefault();

        // @ts-ignore
        const choice = dialog.showMessageBoxSync(mainWindow, {
          type: "question",
          buttons: ["Yes", "No"],
          title: "Confirm",
          message: "Are you sure you want to quit?",
          detail: "Any unsaved changes will be lost.",
        });

        if (choice === 0) {
          isShuttingDown = true;
          // @ts-ignore
          mainWindow.destroy();
        }
      }
    });

    ["maximize", "unmaximize", "minimize", "restore"].forEach((event) => {
      // @ts-ignore
      mainWindow.on(event, () => {
        // @ts-ignore
        mainWindow.webContents.send("window-state-changed", event);
      });
    });

    // Load application URL
    const appUrl = await getAppUrl();
    log(LogLevel.INFO, `Loading URL: ${appUrl}`);

    try {
      await mainWindow.loadURL(appUrl);
      if (APP_CONFIG.isDev) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
      log(LogLevel.SUCCESS, "Main window loaded successfully");
    } catch (error) {
      // Throw error to be handled by startupSequence (no double error window)
      throw new Error(
        APP_CONFIG.isDev
          ? "Dev server not running. Run 'npm run dev' first."
          : "Production build not found or corrupted."
      );
    }

    // Additional post-load setup
    mainWindow.webContents.on("did-finish-load", () => {
      log(LogLevel.INFO, "Main window loaded, checking for updates again");

      // Periodic update check (every 30 minutes)
      setInterval(
        () => {
          checkForUpdates().catch((err) => {
            log(LogLevel.WARN, "Periodic update check failed", err.message);
          });
        },
        30 * 60 * 1000
      );
    });

    return mainWindow;
  } catch (error) {
    throw new WindowError(
      // @ts-ignore
      `Failed to create main window: ${error.message}`,
      "main"
    );
  }
}

// ===================== ACTIVATION WINDOW (placeholder) =====================
/**
 * Check if activation is required and show activation window if needed
 * @returns {Promise<boolean>} - True if activation is complete and can proceed
 */
async function handleActivation() {
  // TODO: Implement actual activation logic
  // For now, just return true to continue
  return true;
}

// ===================== AUTO-UPDATER SETUP =====================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

async function checkForUpdates() {
  try {
    log(LogLevel.INFO, "Checking for updates...");
    await autoUpdater.checkForUpdates();
  } catch (error) {
    // @ts-ignore
    log(LogLevel.ERROR, "Update check failed", error.message);
  }
}

autoUpdater.on("checking-for-update", () => {
  log(LogLevel.INFO, "Checking for update...");
});

// @ts-ignore
autoUpdater.on("update-available", (info) => {
  log(LogLevel.INFO, `Update available: ${info.version}`);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("update:available", {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  }
});

// @ts-ignore
autoUpdater.on("update-not-available", (info) => {
  log(LogLevel.INFO, "No updates available");

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("update:not-available", info);
  }
});

// @ts-ignore
autoUpdater.on("download-progress", (progress) => {
  log(LogLevel.INFO, `Download progress: ${Math.floor(progress.percent)}%`);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("update:progress", {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    });
  }
});

// @ts-ignore
autoUpdater.on("update-downloaded", (info) => {
  log(LogLevel.INFO, `Update downloaded: ${info.version}`);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("update:downloaded", {
      version: info.version,
      releaseDate: info.releaseDate,
      downloadedFile: info.downloadedFile,
    });
  }

  const choice = dialog.showMessageBoxSync({
    type: "question",
    buttons: ["Install & Restart", "Later"],
    defaultId: 0,
    cancelId: 1,
    title: "Update Ready",
    message: `Version ${info.version} has been downloaded. Do you want to install it now?`,
  });

  if (choice === 0) {
    autoUpdater.quitAndInstall();
  }
});

// @ts-ignore
autoUpdater.on("error", (error) => {
  log(LogLevel.ERROR, "Update error", error.message);

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send("update:error", error.message);
  }
});

// ===================== IPC HANDLERS =====================
/**
 * Register all IPC handlers
 */
function registerIpcHandlers() {
  log(LogLevel.INFO, "Registering IPC handlers...");

  // Window Control Handlers
  ipcMain.on("window:minimize", () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on("window:maximize", () => {
    if (mainWindow) {
      mainWindow.isMaximized()
        ? mainWindow.unmaximize()
        : mainWindow.maximize();
    }
  });

  ipcMain.on("window:close", () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on("window:reload", () => {
    if (mainWindow) mainWindow.reload();
  });

  ipcMain.on("window:toggle-devtools", () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });

  // Application Info
  ipcMain.handle("app:get-info", () => ({
    name: APP_CONFIG.appName,
    version: APP_CONFIG.version,
    isDev: APP_CONFIG.isDev,
    platform: process.platform,
    arch: process.arch,
    userDataPath: APP_CONFIG.userDataPath,
    databaseReady: isDatabaseInitialized,
  }));

  // @ts-ignore
  // @ts-ignore
  ipcMain.on("app:open-external", (event, url) => {
    if (typeof url === "string" && url.startsWith("http")) {
      shell.openExternal(url).catch(console.error);
    }
  });

  // Database Status
  ipcMain.handle("database:get-status", async () => {
    try {
      const isInitialized = AppDataSource.isInitialized;
      let migrationStatus = null;

      if (migrationManager) {
        migrationStatus = await migrationManager.getMigrationStatus();
      }

      return {
        initialized: isInitialized,
        migrationManager: !!migrationManager,
        migrationStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      log(LogLevel.ERROR, "Failed to get database status:", error);
      // @ts-ignore
      return { error: error.message };
    }
  });

  ipcMain.handle("database:backup", async () => {
    try {
      if (!migrationManager) {
        throw new Error("Migration manager not initialized");
      }
      const backupPath = await migrationManager.backupDatabase();
      return { success: true, backupPath };
    } catch (error) {
      log(LogLevel.ERROR, "Database backup failed:", error);
      // @ts-ignore
      return { success: false, error: error.message };
    }
  });

  // Update handlers
  ipcMain.on("update:start-download", () => {
    log(LogLevel.INFO, "User requested download");
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("update:install-now", () => {
    log(LogLevel.INFO, "User requested immediate installation");
    autoUpdater.quitAndInstall();
  });

  // Import modular IPC handlers (inventory-specific)
  try {
    const ipcModules = [
      "./ipc/core/barcode/index.ipc.js",
      "./ipc/core/category/index.ipc.js",
      "./ipc/core/customer/index.ipc.js",
      "./ipc/core/loyaltyTransaction/index.ipc.js",
      "./ipc/core/notification/index.ipc.js",
      "./ipc/core/notificationLog/index.ipc.js",
      "./ipc/core/order/index.ipc.js",
      "./ipc/core/orderItem/index.ipc.js",
      "./ipc/core/product/index.ipc.js",
      "./ipc/core/productImage/index.ipc.js",
      "./ipc/core/productVariant/index.ipc.js",
      "./ipc/core/purchase/index.ipc.js",
      "./ipc/core/purchaseItem/index.ipc.js",
      "./ipc/core/stockItem/index.ipc.js",
      "./ipc/core/stockMovement/index.ipc.js",
      "./ipc/core/supplier/index.ipc.js",
      "./ipc/core/warehouse/index.ipc.js",
      "./ipc/activation.ipc.js",
      "./ipc/system_config.ipc.js",
      "./ipc/windows_control.ipc.js",
      "./ipc/reports/dashboard/index.ipc.js",
      "./ipc/reports/inventoryReport/index.ipc.js",
      "./ipc/reports/lowStock/index.ipc.js",
      "./ipc/reports/outOfStock/index.ipc.js",
      "./ipc/reports/profitLoss/index.ipc.js",
      "./ipc/reports/salesReport/index.ipc.js",
      "./ipc/exports/audit/index.ipc.js",
      "./ipc/exports/customer/index.ipc.js",
      "./ipc/exports/inventoryReport/index.ipc.js",
      "./ipc/exports/lowOfStock/index.ipc.js",
      "./ipc/exports/order/index.ipc.js",
      "./ipc/exports/outOfStock/index.ipc.js",
      "./ipc/exports/product/index.ipc.js",
      "./ipc/exports/productVariant/index.ipc.js",
      "./ipc/exports/profitLoss/index.ipc.js",
      "./ipc/exports/purchase/index.ipc.js",
      "./ipc/exports/sales/index.ipc.js",
      "./ipc/exports/stockItem/index.ipc.js",
      "./ipc/exports/stockMovement/index.ipc.js",
      "./ipc/exports/supplier/index.ipc.js",
      "./ipc/exports/warehouse/index.ipc.js",
    ];

    ipcModules.forEach((modulePath) => {
      try {
        const fullPath = path.join(__dirname, modulePath);
        if (fsSync.existsSync(fullPath)) {
          require(fullPath);
          log(LogLevel.DEBUG, `Loaded IPC module: ${modulePath}`);
        } else {
          log(LogLevel.WARN, `IPC module not found: ${modulePath}`);
        }
      } catch (error) {
        log(LogLevel.ERROR, `Failed to load IPC module ${modulePath}:`, error);
      }
    });

    log(LogLevel.SUCCESS, "All IPC handlers registered");
  } catch (error) {
    log(LogLevel.ERROR, "Failed to register IPC handlers:", error);
  }
}

// ===================== MAIN STARTUP SEQUENCE =====================
async function startupSequence() {
  try {
    log(
      LogLevel.INFO,
      `🚀 Starting ${APP_CONFIG.appName} v${APP_CONFIG.version}...`
    );
    log(
      LogLevel.INFO,
      `Environment: ${APP_CONFIG.isDev ? "Development" : "Production"}`
    );
    log(LogLevel.INFO, `User Data Path: ${APP_CONFIG.userDataPath}`);

    // 1. Setup global error handlers
    setupGlobalErrorHandlers();

    // 2. Create splash window
    await createSplashWindow();

    // 3. Initialize database and run migrations
    const dbResult = await initializeDatabase();

    // 4. Handle database initialization failure (aligned with POS)
    if (!dbResult.success) {
      log(LogLevel.ERROR, "Database initialization failed:", dbResult.error);

      const userChoice = dialog.showMessageBoxSync({
        type: "warning",
        title: "Database Warning",
        message: "Database initialization failed",
        detail: `${dbResult.error}\n\nApplication may have limited functionality.`,
        buttons: ["Continue Anyway", "Quit Application"],
        defaultId: 0,
        cancelId: 1,
      });

      if (userChoice === 1) {
        log(LogLevel.INFO, "User chose to quit due to database error");
        app.quit();
        return;
      }
    }

    // 5. Register all IPC handlers
    registerIpcHandlers();

    // 6. Handle activation if required
    const activationComplete = await handleActivation();
    if (!activationComplete) {
      log(LogLevel.INFO, "Activation required but not completed. Exiting.");
      app.quit();
      return;
    }

    // 7. Create main window
    await createMainWindow();

    // 8. Early update check (after main window loads)
    setTimeout(() => {
      checkForUpdates().catch((err) => {
        log(LogLevel.WARN, "Update check failed, continuing startup", err.message);
      });
    }, 1000);

    log(LogLevel.SUCCESS, `✅ ${APP_CONFIG.appName} started successfully!`);
  } catch (error) {
    log(LogLevel.ERROR, "Startup sequence failed:", error);

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    // Create error window
    const errorWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      frame: true,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    });

    showErrorPage(
      errorWindow,
      "Startup Failed",
      // @ts-ignore
      "The application failed to start properly.",
      // @ts-ignore
      error.message
    );

    errorWindow.show();
  }
}

// ===================== APPLICATION EVENT HANDLERS =====================
app.on("ready", startupSequence);

app.on("window-all-closed", async () => {
  log(LogLevel.INFO, "All windows closed, quitting application");
  await safeCloseDatabase();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  log(LogLevel.INFO, "Application activated");

  if (BrowserWindow.getAllWindows().length === 0) {
    await startupSequence();
  }
});

// @ts-ignore
app.on("before-quit", async (event) => {
  log(LogLevel.INFO, "Application quitting...");

  if (!isShuttingDown) {
    event.preventDefault();
    await safeCloseDatabase();
    app.quit();
  }
});

app.on("will-quit", () => {
  log(LogLevel.INFO, "Application will quit");
});

app.on("quit", () => {
  log(LogLevel.INFO, "Application quit");
  process.exit(0);
});

// ===================== EXPORT FOR TESTING =====================
if (APP_CONFIG.isDev) {
  module.exports = {
    APP_CONFIG,
    getIconPath,
    initializeDatabase,
    createMainWindow,
    safeCloseDatabase,
    log,
  };
}