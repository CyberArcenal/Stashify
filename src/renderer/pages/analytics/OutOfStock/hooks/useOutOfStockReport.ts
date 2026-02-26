import { useState, useEffect, useMemo, useCallback } from "react";
import type { OutOfStockReportData } from "../../../../api/analytics/outStock";
import outOfStockAPI from "../../../../api/analytics/outStock";
import { dialogs } from "../../../../utils/dialogs";
import { showError, showSuccess } from "../../../../utils/notification";

export interface Filters {
  search: string;
  category: string;
  status: string;
  warehouse: string;
}

interface UseOutOfStockReportReturn {
  reportData: OutOfStockReportData | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  resetFilters: () => void;
  filteredItems: OutOfStockReportData["stockItems"];
  paginatedItems: OutOfStockReportData["stockItems"];
  pagination: {
    current_page: number;
    total_pages: number;
    count: number;
    page_size: number;
  };
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  categories: string[];
  warehouses: string[];
  exportLoading: "pdf" | "csv" | "excel" | null;
  handleExport: (format: "pdf" | "csv" | "excel") => Promise<void>;
  refreshData: () => Promise<void>;
}

const useOutOfStockReport = (): UseOutOfStockReportReturn => {
  const [reportData, setReportData] = useState<OutOfStockReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    status: "all",
    warehouse: "all",
  });
  const [exportLoading, setExportLoading] = useState<"pdf" | "csv" | "excel" | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await outOfStockAPI.getOutOfStockReport();
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = async () => {
    await loadData(true);
  };

  const handleExport = async (format: "pdf" | "csv" | "excel") => {
    const confirmed = await dialogs.confirm({
      title: "Export Report",
      message: `Export this report in ${format.toUpperCase()} format?`,
      icon: "info",
    });
    if (!confirmed) return;

    setExportLoading(format);
    try {
      const params: any = {
        category: filters.category !== "all" ? filters.category : "",
        include_backorder: false,
      };
      await outOfStockAPI.exportReport(format, params);
      showSuccess("Report exported successfully");
    } catch (err: any) {
      showError(err.message || "Export failed");
    } finally {
      setExportLoading(null);
    }
  };

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ search: "", category: "all", status: "all", warehouse: "all" });
    setCurrentPage(1);
  }, []);

  // Compute filtered items
  const filteredItems = useMemo(() => {
    if (!reportData) return [];
    return reportData.stockItems.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.category.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.variant.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.warehouse.toLowerCase().includes(filters.search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(filters.search.toLowerCase()));

      const matchesCategory = filters.category === "all" || item.category === filters.category;
      const matchesStatus = filters.status === "all" || item.status === filters.status;
      const matchesWarehouse = filters.warehouse === "all" || item.warehouse === filters.warehouse;

      return matchesSearch && matchesCategory && matchesStatus && matchesWarehouse;
    });
  }, [reportData, filters]);

  // Pagination
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pagination = {
    current_page: currentPage,
    total_pages: totalPages,
    count: totalItems,
    page_size: pageSize,
  };

  // Unique categories and warehouses for filters
  const categories = useMemo(
    () => Array.from(new Set(reportData?.stockItems.map((i) => i.category) || [])),
    [reportData]
  );
  const warehouses = useMemo(
    () => Array.from(new Set(reportData?.stockItems.map((i) => i.warehouse) || [])),
    [reportData]
  );

  return {
    reportData,
    loading,
    error,
    refreshing,
    filters,
    setFilter,
    resetFilters,
    filteredItems,
    paginatedItems,
    pagination,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    categories,
    warehouses,
    exportLoading,
    handleExport,
    refreshData,
  };
};

export default useOutOfStockReport;