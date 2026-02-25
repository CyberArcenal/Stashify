// update_handlers.js
// @ts-check
const { ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");

// Configuration para sa auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// I-register ang update handlers
/**
 * @param {{ isDestroyed: () => any; webContents: { send: (arg0: string, arg1: string | import("builder-util-runtime").UpdateInfo) => void; }; }} splashWindow
 * @param {{ isDestroyed: () => any; webContents: { send: (arg0: string, arg1: { version: string; releaseDate: string; releaseNotes: string | import("builder-util-runtime").ReleaseNoteInfo[] | null | undefined; }) => void; }; }} mainWindow
 */
function registerUpdateHandlers(splashWindow, mainWindow) {
  // IPC handlers
  ipcMain.handle("check-for-updates", async () => {
    return await autoUpdater.checkForUpdates();
  });

  ipcMain.handle("start-update-download", () => {
    autoUpdater.downloadUpdate();
  });

  // Event handlers para sa auto-updater
  autoUpdater.on("checking-for-update", () => {
    console.log("🔍 Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`✅ Update available: ${info.version}`);
    
    // Ipaalam sa BOTH windows
    if (splashWindow && !splashWindow.isDestroyed()) {
      // @ts-ignore
      splashWindow.webContents.send("update:available", {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update:available", {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("✅ No updates available");
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("update:not-available", info);
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.floor(progress.percent);
    console.log(`⬇️ Download progress: ${percent}%`);
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("update:progress", {
        // @ts-ignore
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred,
      });
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`📦 Update downloaded: ${info.version}`);
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("update:downloaded", {
        version: info.version,
        releaseDate: info.releaseDate,
        // @ts-ignore
        downloadedFile: info.downloadedFile,
      });
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("❌ Update error:", error.message);
    
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("update:error", error.message);
    }
  });

  // IPC handler para sa update actions
  ipcMain.on("update:start-download", () => {
    console.log("⬇️ User requested download");
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("update:install-now", () => {
    console.log("🔄 User requested immediate installation");
    autoUpdater.quitAndInstall();
  });
}

// Function para i-check ang updates
async function checkForUpdates() {
  try {
    console.log("🔍 Checking for updates...");
    const result = await autoUpdater.checkForUpdates();
    
    if (result) {
      console.log(`✅ Update available: ${result.updateInfo.version}`);
      return result;
    } else {
      console.log("✅ No updates available");
      return null;
    }
  } catch (error) {
    // @ts-ignore
    console.error("❌ Update check failed:", error.message);
    throw error;
  }
}

module.exports = { registerUpdateHandlers, checkForUpdates };