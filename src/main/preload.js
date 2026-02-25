const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("backendAPI", {
  // Core utilities
  // ping: () => ipcRenderer.invoke("ping"),
  // runMigrations: () => ipcRenderer.invoke("run-migrations"),
  // getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // // Dashboard & logs
  dashboard: (payload) => ipcRenderer.invoke("dashboard", payload),
  // auditLog: (payload) => ipcRenderer.invoke("auditLog", payload),

  // // Inventory APIs
  // inventoryLog: (payload) => ipcRenderer.invoke("inventoryLog", payload),
  // stockAdjustment: (payload) => ipcRenderer.invoke("stockAdjustment", payload),
  // inventorySettings: (payload) => ipcRenderer.invoke("inventorySettings", payload),
  // inventoryReport: (payload) => ipcRenderer.invoke("inventoryReport", payload),
  // stockItem: (payload) => ipcRenderer.invoke("stockItem", payload),
  // stockMovement: (payload) => ipcRenderer.invoke("stockMovement", payload),
  // stockTransfer: (payload) => ipcRenderer.invoke("stockTransfer", payload),
  // outOfStock: (payload) => ipcRenderer.invoke("outOfStock", payload),
  // lowStock: (payload) => ipcRenderer.invoke("lowStock", payload),

  // // Product APIs
  // category: (payload) => ipcRenderer.invoke("category", payload),
  product: (payload) => ipcRenderer.invoke("product", payload),
  productVariant: (payload) => ipcRenderer.invoke("productVariant", payload),
  // productImage: (payload) => ipcRenderer.invoke("productImage", payload),
  // productBulk: (payload) => ipcRenderer.invoke("productBulk", payload),

  // // Orders
  // orderLog: (payload) => ipcRenderer.invoke("orderLog", payload),
  // orderItem: (payload) => ipcRenderer.invoke("orderItem", payload),
  // orders: (payload) => ipcRenderer.invoke("orders", payload),

  // // Reports
  // salesReport: (payload) => ipcRenderer.invoke("salesReport", payload),
  // purchaseLog: (payload) => ipcRenderer.invoke("purchaseLog", payload),
  // purchaseItem: (payload) => ipcRenderer.invoke("purchaseItem", payload),
  // purchase: (payload) => ipcRenderer.invoke("purchase", payload),
  // profitLoss: (payload) => ipcRenderer.invoke("profitLoss", payload),

  // // Notifications
  // notifications: (payload) => ipcRenderer.invoke("notifications", payload),

  // // Supplier & warehouse
  // supplier: (payload) => ipcRenderer.invoke("supplier", payload),
  // warehouse: (payload) => ipcRenderer.invoke("warehouse", payload),

  // // Settings
  // systemSettings: (payload) => ipcRenderer.invoke("systemSettings", payload),
  // systemConfig: (payload) => ipcRenderer.invoke("systemConfig", payload),

  // // Exports
  // auditExport: (payload) => ipcRenderer.invoke("auditExport", payload),
  // inventoryLogExport: (payload) => ipcRenderer.invoke("inventoryLogExport", payload),
  // inventoryExport: (payload) => ipcRenderer.invoke("inventoryExport", payload),
  // lowStockExport: (payload) => ipcRenderer.invoke("lowStockExport", payload),
  // orderExport: (payload) => ipcRenderer.invoke("orderExport", payload),
  // orderLogExport: (payload) => ipcRenderer.invoke("orderLogExport", payload),
  // outOfStockExport: (payload) => ipcRenderer.invoke("outOfStockExport", payload),
  // productExport: (payload) => ipcRenderer.invoke("productExport", payload),
  // variantExport: (payload) => ipcRenderer.invoke("variantExport", payload),
  // profitLossExport: (payload) => ipcRenderer.invoke("profitLossExport", payload),
  // purchaseExport: (payload) => ipcRenderer.invoke("purchaseExport", payload),
  // salesExport: (payload) => ipcRenderer.invoke("salesExport", payload),
  // stockExport: (payload) => ipcRenderer.invoke("stockExport", payload),
  // stockMovementExport: (payload) => ipcRenderer.invoke("stockMovementExport", payload),
  // supplierExport: (payload) => ipcRenderer.invoke("supplierExport", payload),
  // warehouseExport: (payload) => ipcRenderer.invoke("warehouseExport", payload),

  // // File ops
  // openFile: (filePath) => ipcRenderer.invoke("openFile", filePath),
  // showItemInFolder: (filePath) => ipcRenderer.invoke("showItemInFolder", filePath),
  // getFileInfo: (filePath) => ipcRenderer.invoke("getFileInfo", filePath),
  // fileExists: (filePath) => ipcRenderer.invoke("fileExists", filePath),
  // openDirectory: (dirPath) => ipcRenderer.invoke("openDirectory", dirPath),
  // getFilesInDirectory: (dirPath, extensions) => ipcRenderer.invoke("getFilesInDirectory", dirPath, extensions),
  // getRecentExports: (exportDir, limit) => ipcRenderer.invoke("getRecentExports", exportDir, limit),
  // deleteFile: (filePath) => ipcRenderer.invoke("deleteFile", filePath),
  // copyFileToClipboard: (filePath) => ipcRenderer.invoke("copyFileToClipboard", filePath),

  // // Activation
  // activation: (payload) => ipcRenderer.invoke("activation", payload),

  // // Update APIs
  // checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  // startUpdateDownload: () => ipcRenderer.invoke("start-update-download"),
  // startUpdate: () => ipcRenderer.send("update:install-now"),
  // startDownload: () => ipcRenderer.send("update:start-download"),

  // // Update event listeners
  // onUpdateAvailable: (callback) => ipcRenderer.on("update:available", callback),
  // onDownloadProgress: (callback) => ipcRenderer.on("update:progress", callback),
  // onUpdateDownloaded: (callback) => ipcRenderer.on("update:downloaded", callback),
  // onUpdateError: (callback) => ipcRenderer.on("update:error", callback),
  // onUpdateNotAvailable: (callback) => ipcRenderer.on("update:not-available", callback),
});

console.log("✅ Preload script aligned with global.d.ts");
