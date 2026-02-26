// src/renderer/pages/stock-adjustment/hooks/useStockAdjustment.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { StockMovement } from "../../../api/core/stockMovement";
import type { Product } from "../../../api/core/product";
import type { Warehouse } from "../../../api/core/warehouse";
import stockMovementAPI from "../../../api/core/stockMovement";
import productAPI from "../../../api/core/product";
import warehouseAPI from "../../../api/core/warehouse";
import {
  stockMovementExportAPI,
  type StockMovementExportParams,
} from "../../../api/exports/movement";
import { dialogs } from "../../../utils/dialogs";
import { showSuccess, showError } from "../../../utils/notification";

export interface MovementWithDetails extends StockMovement {
  product_name: string;
  product_sku: string;
  warehouse_name: string;
  user_name: string;
  change_direction: "IN" | "OUT";
  net_effect: number;
}

export interface AdjustmentFilters {
  search: string;
  type: "all" | "increase" | "decrease";
  warehouse: string; // warehouse id or "all"
  date_from: string;
  date_to: string;
}

export interface PaginationType {
  current_page: number;
  total_pages: number;
  count: number;
  page_size: number;
}

interface UseStockAdjustmentReturn {
  movements: MovementWithDetails[];
  paginatedMovements: MovementWithDetails[];
  filters: AdjustmentFilters;
  setFilters: React.Dispatch<React.SetStateAction<AdjustmentFilters>>;
  loading: boolean;
  error: string | null;
  pagination: PaginationType;
  sortConfig: { key: string; direction: "asc" | "desc" };
  setSortConfig: React.Dispatch<
    React.SetStateAction<{ key: string; direction: "asc" | "desc" }>
  >;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  reload: () => void;
  handleFilterChange: (key: keyof AdjustmentFilters, value: string) => void;
  resetFilters: () => void;
  handleSort: (key: string) => void;
  warehouses: Warehouse[];
  products: Product[];
  exportFormat: "csv" | "excel" | "pdf";
  setExportFormat: (format: "csv" | "excel" | "pdf") => void;
  exportLoading: boolean;
  handleExport: () => Promise<void>;
}

const useStockAdjustment = (): UseStockAdjustmentReturn => {
  const [allMovements, setAllMovements] = useState<MovementWithDetails[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "created_at",
    direction: "desc",
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );
  const [exportLoading, setExportLoading] = useState(false);

  const [filters, setFilters] = useState<AdjustmentFilters>({
    search: "",
    type: "all",
    warehouse: "all",
    date_from: "",
    date_to: "",
  });

  const mountedRef = useRef(true);

  // Load warehouses and products once
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [whRes, prodRes] = await Promise.all([
          warehouseAPI.getAll({
            sortBy: "name",
            sortOrder: "ASC",
            limit: 1000,
          }),
          productAPI.getAll({ sortBy: "name", sortOrder: "ASC", limit: 1000 }),
        ]);
        if (whRes.status) setWarehouses(whRes.data);
        if (prodRes.status) setProducts(prodRes.data);
      } catch (err) {
        console.error("Failed to load static data:", err);
      }
    };
    loadStaticData();
  }, []);

  // Load movements
  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        page: currentPage,
        limit: pageSize,
      };
      if (filters.warehouse !== "all")
        params.warehouseId = parseInt(filters.warehouse);
      if (filters.date_from) params.startDate = filters.date_from;
      if (filters.date_to) params.endDate = filters.date_to;

      const response = await stockMovementAPI.getAll(params);
      if (!response.status) throw new Error(response.message);

      // Enrich with product/warehouse details
      const enriched = await Promise.all(
        response.data.map(async (movement) => {
          let product_name = "Unknown";
          let product_sku = "";
          let warehouse_name = "Unknown";
          let user_name = "System";
          let metadataObj = {};
          try {
            metadataObj = JSON.parse(movement.metadata);
          } catch (e) {
            console.error("Invalid metadata JSON", e);
          }

          if (movement.stockItem?.product) {
            product_name =
              (movement.stockItem.product as any).name || "Unknown";
            product_sku = (movement.stockItem.product as any).sku || "";
          } else if (movement.stockItem?.productId) {
            const prod = products.find(
              (p) => p.id === movement.stockItem?.productId,
            );
            if (prod) {
              product_name = prod.name;
              product_sku = prod.sku || "";
            }
          }

          if (movement.warehouse) {
            warehouse_name = (movement.warehouse as any).name || "Unknown";
          } else if (movement.warehouseId) {
            const wh = warehouses.find((w) => w.id === movement.warehouseId);
            if (wh) warehouse_name = wh.name;
          }

          if (metadataObj?.user) user_name = metadataObj?.user;
          else if (movement.created_by)
            user_name = `User ${movement.created_by}`;

          return {
            ...movement,
            product_name,
            product_sku,
            warehouse_name,
            user_name,
            change_direction: movement.change > 0 ? "IN" : "OUT",
            net_effect: movement.change,
          };
        }),
      );

      // Client-side filters
      let filtered = enriched;
      if (filters.type === "increase")
        filtered = filtered.filter((m) => m.change > 0);
      else if (filters.type === "decrease")
        filtered = filtered.filter((m) => m.change < 0);

      if (filters.search.trim()) {
        const lower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.product_name.toLowerCase().includes(lower) ||
            m.product_sku.toLowerCase().includes(lower) ||
            (m.reason && m.reason.toLowerCase().includes(lower)),
        );
      }

      // Client-side sorting (though API already sorts)
      if (sortConfig.key) {
        filtered.sort((a, b) => {
          let aVal: any = a[sortConfig.key as keyof MovementWithDetails];
          let bVal: any = b[sortConfig.key as keyof MovementWithDetails];
          if (typeof aVal === "string") aVal = aVal.toLowerCase();
          if (typeof bVal === "string") bVal = bVal.toLowerCase();
          if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        });
      }

      if (mountedRef.current) {
        setAllMovements(filtered);
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "Failed to load movements");
        console.error("Movement loading error:", err);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters, sortConfig, currentPage, pageSize, products, warehouses]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Pagination calculations
  const totalItems = allMovements.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedMovements = allMovements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const pagination = {
    current_page: currentPage,
    total_pages: totalPages,
    count: totalItems,
    page_size: pageSize,
  };

  const handleFilterChange = useCallback(
    (key: keyof AdjustmentFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      type: "all",
      warehouse: "all",
      date_from: "",
      date_to: "",
    });
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  }, []);

  const reload = useCallback(() => {
    fetchMovements();
  }, [fetchMovements]);

  const handleExport = async () => {
    if (allMovements.length === 0) {
      await dialogs.info("No Data", "There is no adjustment data to export.");
      return;
    }

    setExportLoading(true);
    try {
      const params: StockMovementExportParams = {
        format: exportFormat,
        warehouse: filters.warehouse !== "all" ? filters.warehouse : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        movement_type: "adjustment", // assuming we want only adjustments
      };
      await stockMovementExportAPI.exportMovements(params);
      showSuccess(`Export completed (${exportFormat.toUpperCase()})`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  return {
    movements: allMovements,
    paginatedMovements,
    filters,
    setFilters,
    loading,
    error,
    pagination,
    sortConfig,
    setSortConfig,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    reload,
    handleFilterChange,
    resetFilters,
    handleSort,
    warehouses,
    products,
    exportFormat,
    setExportFormat,
    exportLoading,
    handleExport,
  };
};

export default useStockAdjustment;
