// electron.d.ts
//@ts-check

export interface backendAPI {
  dashboard: (payload: any) => Promise<any>;
  auditLog: (payload: any) => Promise<any>;
  ping: () => Promise<any>;
  logo: (payload: any) => Promise<any>;
  loyalty: (payload: any) => Promise<any>;
  customer: (payload: any) => Promise<any>;
  runMigrations: () => Promise<any>;
  getAppVersion: () => Promise<any>;
  category: (payload: any) => Promise<any>;
  product: (payload: any) => Promise<any>;
  inventoryLog: (payload: any) => Promise<any>;
  stockAdjustment: (payload: any) => Promise<any>;
  salesReport: (payload: any) => Promise<any>;
  purchaseLog: (payload: any) => Promise<any>;
  purchaseItem: (payload: any) => Promise<any>;
  purchase: (payload: any) => Promise<any>;
  profitLoss: (payload: any) => Promise<any>;
  productVariant: (payload: any) => Promise<any>;
  productImage: (payload: any) => Promise<any>;
  productBulk: (payload: any) => Promise<any>;
  outOfStock: (payload: any) => Promise<any>;
  orderLogs: (payload: any) => Promise<any>;
  orderItems: (payload: any) => Promise<any>;
  order: (payload: any) => Promise<any>;
  notifications: (payload: any) => Promise<any>;
  lowStock: (payload: any) => Promise<any>;
  inventorySettings: (payload: any) => Promise<any>;
  inventoryReport: (payload: any) => Promise<any>;
  stockItem: (payload: any) => Promise<any>;
  stockMovement: (payload: any) => Promise<any>;
  stockTransfer: (payload: any) => Promise<any>;
  supplier: (payload: any) => Promise<any>;
  systemSettings: (payload: any) => Promise<any>;
  userSecuritySettings: (payload: any) => Promise<any>;
  warehouse: (payload: any) => Promise<any>;
  themeExport: (payload: any) => Promise<any>;
  theme: (payload: any) => Promise<any>;
  auditExport: (payload: any) => Promise<any>;
  inventoryExport: (payload: any) => Promise<any>;
  inventoryLogExport: (payload: any) => Promise<any>;
  customerExport: (payload: any) => Promise<any>;
  orderExport: (payload: any) => Promise<any>;
  stockMovementExport: (payload: any) => Promise<any>;
  productExport: (payload: any) => Promise<any>;
  profitLossExport: (payload: any) => Promise<any>;
  stockExport: (payload: any) => Promise<any>;
  supplierExport: (payload: any) => Promise<any>;
  variantExport: (payload: any) => Promise<any>;
  salesExport: (payload: any) => Promise<any>;
  purchaseExport: (payload: any) => Promise<any>;
  outOfStockExport: (payload: any) => Promise<any>;
  lowOfStockExport: (payload: any) => Promise<any>;
  orderLogExport: (payload: any) => Promise<any>;
  warehouseExport: (payload: any) => Promise<any>;
  systemConfig: (payload: any) => Promise<any>;
  getSystemHealth: () => Promise<any>;
  getSystemInfo: () => Promise<any>;
  showItemInFolder: (fullPath) => Promise<any>;
  openFile: (filePath) => Promise<any>;
  showItemInFolder: (filePath) => Promise<any>;
  getFileInfo: (filePath) => Promise<any>;
  fileExists: (filePath) => Promise<any>;
  openDirectory: (dirPath) => Promise<any>;
  getFilesInDirectory: (dirPath, extensions) => Promise<any>;
  getRecentExports: (exportDir, limit) => Promise<any>;
  deleteFile: (filePath) => Promise<any>;
  copyFileToClipboard: (filePath) => Promise<any>;

  activation: (payload: any) => Promise<any>;

  // Events
  onActivationCompleted: (callback: (data: any) => void) => void;
  onActivationDeactivated: (callback: () => void) => void;
  onLicenseSynced: (callback: (data: any) => void) => void;

  startDownload: () => (payload: any) => Promise<any>;

  // Update APIs
  checkForUpdates: () => Promise<any>;
  startUpdateDownload: () => Promise<any>;
  startUpdate: () => void;

  // Update event listeners
  onUpdateAvailable: (
    callback: (event: any, data: UpdateInfoData) => void
  ) => void;
  onDownloadProgress: (
    callback: (event: any, data: ProgressInfoData) => void
  ) => void;
  onUpdateDownloaded: (
    callback: (event: any, data: DownloadedInfoData) => void
  ) => void;
  onUpdateError: (callback: (event: any, error: string) => void) => void;
  onUpdateNotAvailable: (callback: () => void) => void;
}
// Idagdag ang mga interface definitions
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
declare global {
  interface Window {
    backendAPI: backendAPI;
  }
}
