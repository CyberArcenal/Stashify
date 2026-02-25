class FileHandler {
  /**
   * Get export directory path
   */
  getExportDirectory(): string {
    // This should match the handler's EXPORT_DIR
    return "product_exports"; // Relative to Downloads folder
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async openExportedFile(fullPath: string): Promise<void> {
    try {
      if (!window.backendAPI || !window.backendAPI.openFile) {
        console.warn("openFile API not available, file saved at:", fullPath);
        return;
      }

      const response = await window.backendAPI.openFile(fullPath);

      if (!response.status) {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error("Failed to open file:", error);
      throw new Error(`Failed to open file: ${error.message}`);
    }
  }

  async showFileInFolder(fullPath: string): Promise<void> {
    try {
      if (!window.backendAPI || !window.backendAPI.showItemInFolder) {
        console.warn(
          "showItemInFolder API not available, file saved at:",
          fullPath,
        );
        return;
      }

      const response = await window.backendAPI.showItemInFolder(fullPath);

      if (!response.status) {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error("Failed to show file in folder:", error);
      throw new Error(`Failed to show file in folder: ${error.message}`);
    }
  }

  // Pwede ring idagdag ang ibang utility functions
  async getFileInfo(fullPath: string): Promise<any> {
    try {
      if (!window.backendAPI || !window.backendAPI.getFileInfo) {
        throw new Error("getFileInfo API not available");
      }

      const response = await window.backendAPI.getFileInfo(fullPath);

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message);
    } catch (error: any) {
      console.error("Failed to get file info:", error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }
}

export const fileHandler = new FileHandler();
