import { useState, useEffect, useCallback } from "react";
import type { ProductVariant } from "../../../api/core/productVariant";
import type { Category } from "../../../api/core/category";
import productVariantAPI from "../../../api/core/productVariant";
import categoryAPI from "../../../api/core/category";

export interface VariantFilters {
  search: string;
  productId: string; // string because input value
  categoryId: string;
  is_active: string;  // "true" | "false" | ""
  lowStock: string;   // "true" | "false" | ""
  is_deleted: string; // "true" | "false" | ""
}

export interface VariantWithDetails extends ProductVariant {
  total_quantity: number;
  product_name?: string;
  category_name?: string;
}

const useVariants = () => {
  const [allVariants, setAllVariants] = useState<VariantWithDetails[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<VariantWithDetails[]>([]);
  const [paginatedVariants, setPaginatedVariants] = useState<VariantWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<VariantFilters>({
    search: "",
    productId: "",
    categoryId: "",
    is_active: "",
    lowStock: "",
    is_deleted: "false", // default: active only
  });

  const [selectedVariants, setSelectedVariants] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    total_pages: 0,
  });

  // Fetch categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryAPI.getAll({ limit: 100 });
        setCategories(response.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch variants from API
  const fetchVariants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        limit: 1000, // sapat para sa client-side filtering
      };
      if (filters.is_deleted !== "") {
        params.is_deleted = filters.is_deleted === "true";
      }
      if (filters.is_active !== "") {
        params.is_active = filters.is_active === "true";
      }
      if (filters.productId && filters.productId !== "") {
        params.productId = parseInt(filters.productId);
      }
      const response = await productVariantAPI.getAll(params);
      if (response.status) {
        // Compute total_quantity from stockItems (kung mayroon)
        const variantsWithQuantity = response.data.map((v) => {
          const total = v.stockItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
          return {
            ...v,
            total_quantity: total,
            product_name: v.product?.name,
            category_name: v.product?.category?.name,
          };
        });
        setAllVariants(variantsWithQuantity);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.is_deleted, filters.is_active, filters.productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // Apply client-side filters (search, category, lowStock)
  useEffect(() => {
    let filtered = [...allVariants];

    // Search by name, SKU, barcode
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          v.sku?.toLowerCase().includes(term) ||
          v.barcode?.toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (filters.categoryId) {
      const catId = parseInt(filters.categoryId);
      filtered = filtered.filter((v) => v.product?.category?.id === catId);
    }

    // Low stock (threshold = 5)
    if (filters.lowStock === "true") {
      filtered = filtered.filter((v) => v.total_quantity > 0 && v.total_quantity <= 5);
    } else if (filters.lowStock === "false") {
      filtered = filtered.filter((v) => v.total_quantity > 5);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof typeof a];
      let bVal: any = b[sortConfig.key as keyof typeof b];

      // Special handling for nested fields
      if (sortConfig.key === "product_name") {
        aVal = a.product_name || "";
        bVal = b.product_name || "";
      } else if (sortConfig.key === "category_name") {
        aVal = a.category_name || "";
        bVal = b.category_name || "";
      } else if (sortConfig.key === "total_quantity") {
        aVal = a.total_quantity;
        bVal = b.total_quantity;
      } else if (sortConfig.key === "net_price") {
        aVal = a.net_price || 0;
        bVal = b.net_price || 0;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredVariants(filtered);

    // Update pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    setPagination({ count: total, total_pages: totalPages });

    // Adjust current page if out of bounds
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }

    // Slice for current page
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    setPaginatedVariants(filtered.slice(start, end));
  }, [allVariants, filters, sortConfig, pageSize, currentPage]);

  const handleFilterChange = (key: keyof VariantFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      productId: "",
      categoryId: "",
      is_active: "",
      lowStock: "",
      is_deleted: "false",
    });
    setCurrentPage(1);
  };

  const toggleVariantSelection = (id: number) => {
    setSelectedVariants((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedVariants.length === paginatedVariants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(paginatedVariants.map((v) => v.id));
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const reload = () => {
    fetchVariants();
    setSelectedVariants([]);
  };

  return {
    allVariants,
    filteredVariants,
    paginatedVariants,
    filters,
    loading,
    error,
    categories,
    pagination,
    selectedVariants,
    setSelectedVariants,
    sortConfig,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    reload,
    handleFilterChange,
    resetFilters,
    toggleVariantSelection,
    toggleSelectAll,
    handleSort,
  };
};

export default useVariants;