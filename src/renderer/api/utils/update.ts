// updateAPI.ts
export interface UpdateInfoData {
  version: string;
  releaseDate: string;
  releaseNotes: string | ReleaseNoteInfo[] | null;
}

export interface ReleaseNoteInfo {
  version: string;
  note: string;
}

export interface ProgressInfoData {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export interface DownloadedInfoData {
  version: string;
  releaseDate: string;
  downloadedFile: string;
}

export interface UpdateCheckResponse {
  status: boolean;
  message: string;
  data: UpdateInfoData | null;
}

export interface UpdateProgressResponse {
  status: boolean;
  message: string;
  data: ProgressInfoData;
}

export interface UpdateDownloadedResponse {
  status: boolean;
  message: string;
  data: DownloadedInfoData;
}

export interface UpdateErrorResponse {
  status: boolean;
  message: string;
  data: {
    error: string;
  };
}

export interface UpdateNotAvailableResponse {
  status: boolean;
  message: string;
  data: null;
}

export interface UpdatePayload {
  method: string;
  params?: Record<string, any>;
}

class UpdateAPI {
  // 🔎 Read-only methods
  async check(): Promise<UpdateCheckResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.checkForUpdates) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.checkForUpdates();

      if (response) {
        return {
          status: true,
          message: "Update check completed",
          data: response.updateInfo,
        };
      }

      return {
        status: true,
        message: "No updates available",
        data: null,
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to check for updates");
    }
  }

  // 🔄 Action methods
  async startDownload(): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.startUpdateDownload) {
        throw new Error("Electron API not available");
      }

      await window.backendAPI.startUpdateDownload();

      return {
        status: true,
        message: "Update download started",
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to start download");
    }
  }

  async install(): Promise<{ status: boolean; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.startUpdate) {
        throw new Error("Electron API not available");
      }

      window.backendAPI.startUpdate();

      return {
        status: true,
        message: "Update installation initiated",
      };
    } catch (error: any) {
      throw new Error(error.message || "Failed to install update");
    }
  }

  // 🔒 Event listeners
  onUpdateAvailable(callback: (data: UpdateInfoData) => void) {
    if (window.backendAPI && window.backendAPI.onUpdateAvailable) {
      window.backendAPI.onUpdateAvailable((_event, data) => callback(data));
    }
  }

  onDownloadProgress(callback: (data: ProgressInfoData) => void) {
    if (window.backendAPI && window.backendAPI.onDownloadProgress) {
      window.backendAPI.onDownloadProgress((_event, data) => callback(data));
    }
  }

  onUpdateDownloaded(callback: (data: DownloadedInfoData) => void) {
    if (window.backendAPI && window.backendAPI.onUpdateDownloaded) {
      window.backendAPI.onUpdateDownloaded((_event, data) => callback(data));
    }
  }

  onUpdateError(callback: (error: string) => void) {
    if (window.backendAPI && window.backendAPI.onUpdateError) {
      window.backendAPI.onUpdateError((_event, error) => callback(error));
    }
  }

  onUpdateNotAvailable(callback: () => void) {
    if (window.backendAPI && window.backendAPI.onUpdateNotAvailable) {
      window.backendAPI.onUpdateNotAvailable(() => callback());
    }
  }

  // Utility methods
  async getCurrentVersion(): Promise<string> {
    try {
      if (!window.backendAPI || !window.backendAPI.getAppVersion) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.getAppVersion();
      return response || "0.0.0";
    } catch (error: any) {
      console.error("Error getting current version:", error);
      return "0.0.0";
    }
  }

  async checkAndPrompt(): Promise<boolean> {
    try {
      const result = await this.check();

      if (result.data) {
        // You can implement a UI prompt here
        console.log(`Update available: ${result.data.version}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking updates:", error);
      return false;
    }
  }

  async downloadAndInstall(): Promise<boolean> {
    try {
      await this.startDownload();

      return new Promise((resolve) => {
        this.onUpdateDownloaded(() => {
          this.install();
          resolve(true);
        });

        this.onUpdateError(() => {
          resolve(false);
        });
      });
    } catch (error) {
      console.error("Error downloading update:", error);
      return false;
    }
  }

  async getUpdateStatus(): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    availableVersion?: string;
    downloadProgress?: number;
  }> {
    try {
      const currentVersion = await this.getCurrentVersion();
      const checkResult = await this.check();

      return {
        hasUpdate: !!checkResult.data,
        currentVersion,
        availableVersion: checkResult.data?.version,
        downloadProgress: 0,
      };
    } catch (error) {
      console.error("Error getting update status:", error);
      return {
        hasUpdate: false,
        currentVersion: "0.0.0",
      };
    }
  }
}

const updateAPI = new UpdateAPI();

export default updateAPI;
