// src/renderer/pages/inventory-report/hooks/useInventoryReport.ts
import { useState, useEffect, useCallback } from "react";
import type { InventoryReportData } from "../../../../api/analytics/inventoryReport";
import inventoryReportAPI from "../../../../api/analytics/inventoryReport";
import { dialogs } from "../../../../utils/dialogs";
import { inventoryExportAPI, type InventoryExportParams } from "../../../../api/exports/inventory";
import { showError, showSuccess } from "../../../../utils/notification";

type DateRangeOption = "3months" | "6months" | "1year" | "custom";
type TabType = "overview" | "stock" | "analysis";
type ExportFormat = "csv" | "excel" | "pdf";

interface UseInventoryReportReturn {
  reportData: InventoryReportData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  dateRange: DateRangeOption;
  setDateRange: (range: DateRangeOption) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  exportFormat: ExportFormat;
  setExportFormat: (format: ExportFormat) => void;
  exportLoading: boolean;
  handleExport: () => Promise<void>;
  handleRefresh: () => void;
}

const useInventoryReport = (): UseInventoryReportReturn => {
  const [reportData, setReportData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>("6months");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exportLoading, setExportLoading] = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = { period: dateRange };
      const data = await inventoryReportAPI.getInventoryReport(params);
      console.log("Inventory report data", data)
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch inventory data");
      console.error("Error fetching inventory data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = async () => {
    if (!reportData) {
      await dialogs.warning("No report data available to export.");
      return;
    }

    const confirmed = await dialogs.confirm({
      title: "Export Inventory Report",
      message: `Export this report in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });
    if (!confirmed) return;

    setExportLoading(true);
    try {
      const params: InventoryExportParams = {
        format: exportFormat,
        period: dateRange === "custom" ? "custom" : dateRange,
        group_by: "month",
      };
      if (dateRange === "custom" && reportData.dateRange) {
        params.start_date = reportData.dateRange.startDate;
        params.end_date = reportData.dateRange.endDate;
      }

      const validationErrors = inventoryExportAPI.validateExportParams(params);
      if (validationErrors.length > 0) {
        showError(validationErrors.join(", "));
        return;
      }

      await inventoryExportAPI.exportInventory(params);
      showSuccess("Inventory report exported successfully");
    } catch (err: any) {
      showError(err.message || "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  return {
    reportData,
    loading,
    error,
    refreshing,
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    exportFormat,
    setExportFormat,
    exportLoading,
    handleExport,
    handleRefresh,
  };
};

export default useInventoryReport;