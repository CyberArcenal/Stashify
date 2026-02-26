// src/renderer/pages/stock-transfer/hooks/useStockTransfer.ts
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

export interface TransferWithDetails extends StockMovement {
  product_name: string;
  product_sku: string;
  from_warehouse_name: string;
  to_warehouse_name?: string; // For transfer_out, we may need destination; but movement only has one warehouse? Actually transfer_out has source warehouse, transfer_in has destination. We'll enrich from metadata if possible.
  user_name: string;
  change_direction: "IN" | "OUT";
  net_effect: number;
}

export interface TransferFilters {
  search: string;
  type: "all" | "transfer_in" | "transfer_out";
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

interface UseStockTransferReturn {
  transfers: TransferWithDetails[];
  paginatedTransfers: TransferWithDetails[];
  filters: TransferFilters;
  setFilters: React.Dispatch<React.SetStateAction<TransferFilters>>;
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
  handleFilterChange: (key: keyof TransferFilters, value: string) => void;
  resetFilters: () => void;
  handleSort: (key: string) => void;
  warehouses: Warehouse[];
  products: Product[];
  exportFormat: "csv" | "excel" | "pdf";
  setExportFormat: (format: "csv" | "excel" | "pdf") => void;
  exportLoading: boolean;
  handleExport: () => Promise<void>;
}

const useStockTransfer = (): UseStockTransferReturn => {
  const [allTransfers, setAllTransfers] = useState<TransferWithDetails[]>([]);
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

  const [filters, setFilters] = useState<TransferFilters>({
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

  // Load transfers
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        page: currentPage,
        limit: pageSize,
        movement_type: filters.type !== "all" ? filters.type : undefined,
      };
      if (filters.warehouse !== "all")
        params.warehouseId = parseInt(filters.warehouse);
      if (filters.date_from) params.startDate = filters.date_from;
      if (filters.date_to) params.endDate = filters.date_to;

      // Fetch only transfer movements
      const response = await stockMovementAPI.getAll({
        ...params,
        movement_type: undefined, // We'll filter by type array manually if needed
      });
      if (!response.status) throw new Error(response.message);

      // Filter for transfer_in and transfer_out
      let movements = response.data.filter(
        (m) =>
          m.movement_type === "transfer_in" ||
          m.movement_type === "transfer_out",
      );

      console.log("Movement transfer", movements);

      // Enrich with product/warehouse details
      const enriched = await Promise.all(
        movements.map(async (movement) => {
          let product_name = "Unknown";
          let product_sku = "";
          let from_warehouse_name = "Unknown";
          let to_warehouse_name = "Unknown";
          let user_name = "System";
          let metadataObj = {};

          try {
            metadataObj = JSON.parse(movement.metadata);
          } catch (e) {
            console.error("Invalid metadata JSON", e);
          }

          // Product
          if (movement.stockItem?.product) {
            product_name =
              (movement.stockItem.product as any).name || "Unknown";
            product_sku = (movement.stockItem.product as any).sku || "";
          } else if (movement.stockItem?.product?.id) {
            const prod = products.find(
              (p) => p.id === movement.stockItem?.product?.id,
            );
            if (prod) {
              product_name = prod.name;
              product_sku = prod.sku || "";
            }
          }

          // Warehouse: For transfer_out, the movement.warehouse is source; for transfer_in, it's destination.
          // We can store both if metadata contains destination/source.
          if (movement.warehouse) {
            from_warehouse_name = (movement.warehouse as any).name || "Unknown";
          } else if (movement.warehouse?.id) {
            const wh = warehouses.find((w) => w.id === movement.warehouse?.id);
            if (wh) from_warehouse_name = wh.name;
          }

          // Try to get destination from metadata (if available)
          if (metadataObj?.to_warehouse_id) {
            const toWh = warehouses.find(
              (w) => w.id === metadataObj.to_warehouse_id,
            );
            if (toWh) {
              to_warehouse_name = toWh.name;
            } else {
              to_warehouse_name = "N/A";
            }
          } else {
            to_warehouse_name = "N/A";
          }

          if (metadataObj?.user) user_name = metadataObj?.user;
          else if (movement.created_by)
            user_name = `User ${movement.created_by}`;

          return {
            ...movement,
            product_name,
            product_sku,
            from_warehouse_name,
            to_warehouse_name,
            user_name,
            change_direction: movement.change > 0 ? "IN" : "OUT",
            net_effect: movement.change,
          };
        }),
      );

      // Client-side search
      let filtered = enriched;
      if (filters.search.trim()) {
        const lower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.product_name.toLowerCase().includes(lower) ||
            m.product_sku.toLowerCase().includes(lower) ||
            (m.reason && m.reason.toLowerCase().includes(lower)),
        );
      }

      if (mountedRef.current) {
        setAllTransfers(filtered);
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "Failed to load transfers");
        console.error("Transfer loading error:", err);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters, sortConfig, currentPage, pageSize, products, warehouses]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Pagination calculations
  const totalItems = allTransfers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedTransfers = allTransfers.slice(
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
    (key: keyof TransferFilters, value: string) => {
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
    fetchTransfers();
  }, [fetchTransfers]);

  const handleExport = async () => {
    if (allTransfers.length === 0) {
      await dialogs.info("No Data", "There is no transfer data to export.");
      return;
    }

    setExportLoading(true);
    try {
      const params: StockMovementExportParams = {
        format: exportFormat,
        warehouse: filters.warehouse !== "all" ? filters.warehouse : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        movement_type: filters.type !== "all" ? filters.type : undefined,
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
    transfers: allTransfers,
    paginatedTransfers,
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

export default useStockTransfer;
