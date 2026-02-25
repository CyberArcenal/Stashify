// src/renderer/pages/inventory/hooks/useProducts.ts
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Product } from "../../../api/core/product";
import type { Category } from "../../../api/core/category";
import categoryAPI from "../../../api/core/category";
import stockItemAPI from "../../../api/core/stockItem";
import productAPI from "../../../api/core/product";

export interface ProductFilters {
  search: string;
  category_id: string;
  is_published: string;
  low_stock: string;
  is_deleted: string;
}

export interface ProductWithDetails extends Product {
  status: "in-stock" | "low-stock" | "out-of-stock";
  category_name?: string;
  total_quantity: number;
}

export interface PaginationType {
  current_page: number;
  total_pages: number;
  count: number;
  page_size: number;
}

interface UseProductsReturn {
  products: ProductWithDetails[];
  paginatedProducts: ProductWithDetails[];
  filters: ProductFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProductFilters>>;
  loading: boolean;
  error: string | null;
  categories: Category[];
  pagination: PaginationType;
  selectedProducts: number[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<number[]>>;
  sortConfig: { key: string; direction: "asc" | "desc" };
  setSortConfig: React.Dispatch<
    React.SetStateAction<{ key: string; direction: "asc" | "desc" }>
  >;
  pageSize: number;
  setPageSize: (size: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  reload: () => void;
  handleFilterChange: (key: keyof ProductFilters, value: string) => void;
  resetFilters: () => void;
  toggleProductSelection: (id: number) => void;
  toggleSelectAll: () => void;
  handleSort: (key: string) => void;
}

const useProducts = (initialFilters?: Partial<ProductFilters>): UseProductsReturn => {
  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    category_id: "",
    is_published: "",
    low_stock: "",
    is_deleted: "false",
    ...initialFilters,
  });

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const stockCache = useRef<Map<number, number>>(new Map());

  // Timeout helper
  const callWithTimeout = async <T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> => {
    let timeoutId: number;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
  };

  // Load categories once with timeout
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await callWithTimeout(
          categoryAPI.getAll({ sortBy: "name", sortOrder: "ASC", limit: 1000 }),
          5000
        );
        if (response.status) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getTotalQuantity = useCallback(async (productId: number): Promise<number> => {
    if (stockCache.current.has(productId)) {
      return stockCache.current.get(productId)!;
    }
    try {
      const response = await callWithTimeout(stockItemAPI.getByProduct(productId), 5000);
      const qty = response.status ? response.data.reduce((sum, item) => sum + item.quantity, 0) : 0;
      stockCache.current.set(productId, qty);
      return qty;
    } catch (err) {
      console.error(`Failed to fetch stock for product ${productId}`, err);
      return 0;
    }
  }, []);

  const determineStatus = useCallback((qty: number): ProductWithDetails["status"] => {
    if (qty === 0) return "out-of-stock";
    if (qty <= 5) return "low-stock";
    return "in-stock";
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
        };
        if (filters.search) params.search = filters.search;
        if (filters.category_id) params.categoryId = parseInt(filters.category_id);
        if (filters.is_published) params.is_published = filters.is_published === "true";

        const response = await callWithTimeout(productAPI.getAll(params), 10000);
        if (!response.status) throw new Error(response.message);

        const productsWithQuantity: ProductWithDetails[] = await Promise.all(
          response.data.map(async (p) => {
            const totalQty = await getTotalQuantity(p.id);
            return {
              ...p,
              total_quantity: totalQty,
              category_name: p.category?.name,
              status: determineStatus(totalQty),
            };
          })
        );

        // Client-side filters
        let filtered = productsWithQuantity;
        if (filters.is_deleted === "true") {
          filtered = filtered.filter(p => p.is_deleted === true);
        } else if (filters.is_deleted === "false") {
          filtered = filtered.filter(p => p.is_deleted === false);
        }

        if (filters.low_stock === "true") {
          filtered = filtered.filter(p => p.total_quantity > 0 && p.total_quantity <= 5);
        } else if (filters.low_stock === "false") {
          filtered = filtered.filter(p => p.total_quantity > 5);
        }

        if (isMountedRef.current) {
          setAllProducts(filtered);
          setSelectedProducts([]);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err.message || "Failed to load products");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    };

    const timer = setTimeout(loadProducts, 300);
    return () => clearTimeout(timer);
  }, [
    filters.search,
    filters.category_id,
    filters.is_published,
    filters.low_stock,
    filters.is_deleted,
    sortConfig.key,
    sortConfig.direction,
    getTotalQuantity,
    determineStatus,
  ]);

  const sortedProducts = useMemo(() => {
    const sorted = [...allProducts];
    const { key, direction } = sortConfig;
    if (key) {
      sorted.sort((a, b) => {
        let aVal: any = a[key as keyof ProductWithDetails];
        let bVal: any = b[key as keyof ProductWithDetails];
        if (key === "total_quantity") {
          aVal = a.total_quantity;
          bVal = b.total_quantity;
        } else if (key === "net_price") {
          aVal = a.net_price ?? 0;
          bVal = b.net_price ?? 0;
        } else if (key === "category_name") {
          aVal = a.category_name ?? "";
          bVal = b.category_name ?? "";
        } else {
          aVal = a[key as keyof Product] ?? "";
          bVal = b[key as keyof Product] ?? "";
        }
        if (typeof aVal === "string" && typeof bVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [allProducts, sortConfig]);

  const totalItems = sortedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pagination = {
    current_page: currentPage,
    total_pages: totalPages,
    count: totalItems,
    page_size: pageSize,
  };

  const handleFilterChange = useCallback((key: keyof ProductFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      category_id: "",
      is_published: "",
      low_stock: "",
      is_deleted: "false",
    });
    setCurrentPage(1);
  }, []);

  const toggleProductSelection = useCallback((id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedProducts((prev) =>
      prev.length === paginatedProducts.length ? [] : paginatedProducts.map((p) => p.id)
    );
  }, [paginatedProducts]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  }, []);

  const reload = useCallback(() => {
    setCurrentPage(1);
    // Trigger effect by forcing a re-run (filters are unchanged but effect will run due to debounce)
    setFilters((prev) => ({ ...prev }));
  }, []);

  const setPageSizeHandler = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    products: sortedProducts,
    paginatedProducts,
    filters,
    setFilters,
    loading,
    error,
    categories,
    pagination,
    selectedProducts,
    setSelectedProducts,
    sortConfig,
    setSortConfig,
    pageSize,
    setPageSize: setPageSizeHandler,
    currentPage,
    setCurrentPage,
    reload,
    handleFilterChange,
    resetFilters,
    toggleProductSelection,
    toggleSelectAll,
    handleSort,
  };
};

export default useProducts;