import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Folder,
  Tag,
  RefreshCw,
} from "lucide-react";
import {
  categoryAPI,
  CategoryData,
  CategoryStats,
  PaginationType,
} from "@/renderer/api/category";
import Pagination from "@/renderer/components/UI/Pagination";
import {
  showApiError,
  showError,
  showSuccess,
} from "@/renderer/utils/notification";
import { dialogs } from "@/renderer/utils/dialogs";

interface Filters {
  search: string;
  is_active: boolean;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryData[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [page_size, setPageSize] = useState(10);
  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  const navigate = useNavigate();
  const pageSizes = [10, 25, 50, 100];
  const [filters, setFilters] = useState<Filters>({
    search: "",
    is_active: undefined,
  });

  useEffect(() => {
    fetchCategories();
  }, [page_size]);

  const fetchCategories = async (page: number = 1) => {
    try {
      setLoading(true);
      const data = await categoryAPI.findPage(page_size, page, filters);
      setCategories(data.data);
      setFilteredCategories(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      fetchCategories();
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    if (key === "is_active") {
      if (value === "active") {
        setFilters((prev) => ({ ...prev, is_active: true }));
      } else if (value === "inactive") {
        setFilters((prev) => ({ ...prev, is_active: false }));
      } else if (value === "all") {
        setFilters((prev) => ({ ...prev, is_active: undefined }));
      }
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      is_active: undefined,
    });
  };

  const toggleCategorySelection = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedCategories.length === filteredCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map((category) => category.id));
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    const confirmed = await dialogs.confirm({
      title: "Delete?",
      message: `Are you sure you want to delete this category?`,
      icon: "info",
    });
    if (confirmed) {
      try {
        await categoryAPI.delete(categoryId);
        setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
        setSelectedCategories((prev) => prev.filter((id) => id !== categoryId));
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-[var(--accent-green-dark)] text-[var(--accent-green)]"
      : "bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getProductCount = (category: CategoryData) => {
    return category.product_quantity || 0;
  };

  const [quickStats, setStats] = useState<CategoryStats>({
    total: 0,
    active: 0,
    archived: 0,
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    productsInActiveCategories: 0,
    categoriesWithChildren: 0,
    leafCategories: 0,
    categoriesWithoutProducts: 0,
    avgProductsPerCategory: 0,
    maxProductsPerCategory: 0,
    minProductsPerCategory: 0,
    categoriesLast24h: 0,
    categoriesLast7d: 0,
    categoriesLast30d: 0,
    topCategoriesByProductCount: [],
  });

  const fetchStats = async () => {
    try {
      const stats = await categoryAPI.get_stats();
      setStats(stats);
    } catch (error) {
      showApiError("Failed to fetch category statistics.");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  function handlePageChange(page: number): void {
    fetchCategories(page);
  }

  function handlePageSizeChange(pageSize: number): void {
    setPageSize(pageSize);
  }

  const handleRefresh = () => {
    fetchCategories(pagination.current_page);
  };

  // Add these functions after the existing handler functions
  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return;

    const categoryCount = selectedCategories.length;
    const confirmed = await dialogs.confirm({
      title: "Delete Categories",
      message: `Are you sure you want to delete ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}? This action cannot be undone.`,
      icon: "warning",
    });

    if (!confirmed) return;

    try {
      // Delete categories one by one
      for (const categoryId of selectedCategories) {
        await categoryAPI.delete(categoryId);
      }

      showSuccess(
        `Successfully deleted ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}`,
      );
      await fetchCategories(pagination.current_page);
    } catch (error) {
      console.error("Failed to delete categories:", error);
      showError(
        `Failed to delete ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}. Please try again.`,
      );
    }
  };

  const handleArchiveSelected = async () => {
    if (selectedCategories.length === 0) return;

    const categoryCount = selectedCategories.length;
    const confirmed = await dialogs.confirm({
      title: "Archive Categories",
      message: `Are you sure you want to archive ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      // Archive categories one by one
      for (const categoryId of selectedCategories) {
        await categoryAPI.update(categoryId, { is_active: false });
      }

      showSuccess(
        `Successfully archived ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}`,
      );
      await fetchCategories(pagination.current_page);
    } catch (error) {
      console.error("Failed to archive categories:", error);
      showError(
        `Failed to archive ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}. Please try again.`,
      );
    }
  };

  const handleActivateSelected = async () => {
    if (selectedCategories.length === 0) return;

    const categoryCount = selectedCategories.length;
    const confirmed = await dialogs.confirm({
      title: "Activate Categories",
      message: `Are you sure you want to activate ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}?`,
      icon: "info",
    });

    if (!confirmed) return;

    try {
      // Activate categories one by one
      for (const categoryId of selectedCategories) {
        await categoryAPI.update(categoryId, { is_active: true });
      }

      showSuccess(
        `Successfully activated ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}`,
      );
      await fetchCategories(pagination.current_page);
    } catch (error) {
      console.error("Failed to activate categories:", error);
      showError(
        `Failed to activate ${categoryCount} categor${categoryCount > 1 ? "ies" : "y"}. Please try again.`,
      );
    }
  };

  return (
    <div
      className="compact-card rounded-lg shadow-sm border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Categories
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Manage product categories and organization
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            className="compact-button px-base py-sm rounded-md flex items-center"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
          </button>
          <Link
            to="/products/categories/form"
            className="compact-button px-base py-sm rounded-md flex items-center"
            style={{
              backgroundColor: "var(--primary-color)",
              color: "var(--sidebar-text)",
            }}
          >
            <Plus className="icon-sm mr-sm" />
            New Category
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-sm mb-6">
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Total Categories
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {quickStats.total}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Active
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-green)" }}
          >
            {quickStats.active}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Archived
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            {quickStats.archived}
          </div>
        </div>
        <div
          className="compact-stats rounded-md border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Total Products
          </div>
          <div
            className="text-xl font-bold mt-1"
            style={{ color: "var(--accent-blue)" }}
          >
            {quickStats.totalProducts}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-sm mb-6 compact-card rounded-md"
          style={{ backgroundColor: "var(--card-secondary-bg)" }}
        >
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Search
            </label>
            <input
              type="text"
              placeholder="Search categories..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Status
            </label>
            <select
              value={
                filters.is_active === true
                  ? "active"
                  : filters.is_active === false
                    ? "inactive"
                    : ""
              }
              onChange={(e) => handleFilterChange("is_active", e.target.value)}
              className="w-full compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full compact-button rounded"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "var(--sidebar-text)",
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedCategories.length > 0 && (
        <div
          className="mb-4 p-sm rounded-md flex items-center justify-between"
          style={{
            backgroundColor: "var(--accent-blue-dark)",
            border: "1px solid var(--accent-blue)",
          }}
        >
          <span
            className="text-sm font-medium"
            style={{ color: "var(--sidebar-text)" }}
          >
            {selectedCategories.length} categor
            {selectedCategories.length > 1 ? "ies" : "y"} selected
          </span>
          <div className="flex gap-xs">
            <button
              className="compact-button bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={handleActivateSelected}
              title="Activate selected"
            >
              <Eye className="icon-sm" />
              Activate
            </button>
            <button
              className="compact-button bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={handleArchiveSelected}
              title="Archive selected"
            >
              <Trash2 className="icon-sm" />
              Archive
            </button>
            <button
              className="compact-button bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-[var(--sidebar-text)] rounded-md transition-colors"
              onClick={handleDeleteSelected}
              title="Permanently delete selected"
            >
              <Trash2 className="icon-sm" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Page size selector and refresh */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs">
            <label className="text-sm" style={{ color: "var(--sidebar-text)" }}>
              Show:
            </label>
            <select
              value={page_size}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="compact-input border rounded"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              entries
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-xs transition-colors rounded"
            style={{ color: "var(--sidebar-text)" }}
            title="Refresh data"
          >
            <RefreshCw className="icon-sm" />
          </button>
        </div>
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Showing {(pagination.current_page - 1) * pagination.page_size + 1} to{" "}
          {Math.min(
            pagination.current_page * pagination.page_size,
            pagination.count,
          )}{" "}
          of {pagination.count} entries
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div
            className="animate-spin rounded-full h-6 w-6 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <span
            className="ml-3 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading categories...
          </span>
        </div>
      )}

      {/* Categories Table */}
      {!loading && (
        <>
          <div
            className="overflow-x-auto rounded-md border"
            style={{ borderColor: "var(--border-color)" }}
          >
            <table
              className="min-w-full compact-table"
              style={{ borderColor: "var(--border-color)" }}
            >
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr>
                  <th
                    scope="col"
                    className="w-12 px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedCategories.length ===
                          filteredCategories.length &&
                        filteredCategories.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Products
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-md py-sm text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-bg)" }}>
                {filteredCategories.map((category) => (
                  <tr
                    key={category.id}
                    className={`hover:bg-[var(--card-secondary-bg)] transition-colors ${
                      selectedCategories.includes(category.id)
                        ? "bg-[var(--accent-blue-dark)] border-l-4 border-l-[var(--accent-blue)]"
                        : ""
                    }`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-md py-sm whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategorySelection(category.id)}
                        className="h-3 w-3 rounded"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </td>
                    <td className="px-md py-sm whitespace-nowrap">
                      <div className="flex items-center">
                        {category.image_url ? (
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center mr-sm overflow-hidden mr-2"
                            style={{
                              backgroundColor:
                                category.color || "var(--text-tertiary)",
                            }}
                          >
                            <img
                              src={category.image_url}
                              alt={category.name || "Category"}
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center mr-sm mr-2"
                            style={{
                              backgroundColor:
                                category.color || "var(--text-tertiary)",
                            }}
                          >
                            <Folder
                              className="icon-xs"
                              style={{ color: "var(--sidebar-text)" }}
                            />
                          </div>
                        )}

                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {category.name}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            ID: {category.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-md py-sm">
                      <div
                        className="text-sm max-w-xs truncate"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {category.description}
                      </div>
                    </td>
                    <td className="px-md py-sm whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(category.is_active)}`}
                      >
                        {category.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-md py-sm whitespace-nowrap">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {getProductCount(category)}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        products
                      </div>
                    </td>
                    <td
                      className="px-md py-sm whitespace-nowrap text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatDate(category.created_at)}
                    </td>
                    <td className="px-md py-sm whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() => {
                            navigate(
                              `/products/categories/view/${category.id}`,
                            );
                          }}
                          className="transition-colors p-xs rounded"
                          style={{ color: "var(--accent-blue)" }}
                          title="View Products"
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          onClick={() => {
                            navigate(
                              `/products/categories/form/${category.id}`,
                            );
                          }}
                          className="transition-colors p-xs rounded"
                          style={{ color: "var(--accent-blue)" }}
                          title="Edit Category"
                        >
                          <Edit className="icon-sm" />
                        </button>
                        <button
                          className="transition-colors p-xs rounded"
                          style={{ color: "var(--accent-red)" }}
                          title="Delete Category"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredCategories.length === 0 && (
            <div className="text-center py-8">
              <div
                className="text-4xl mb-4"
                style={{ color: "var(--text-secondary)" }}
              >
                📁
              </div>
              <p
                className="text-base mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                No categories found.
              </p>
              <p
                className="mb-6 text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                {filters.search || filters.is_active !== undefined
                  ? "Try adjusting your filters to see more results."
                  : "Get started by creating your first category."}
              </p>
              <div className="flex justify-center gap-sm">
                {filters.search || filters.is_active !== undefined ? (
                  <button
                    className="compact-button px-base py-sm rounded-md transition-colors"
                    style={{
                      backgroundColor: "var(--accent-blue)",
                      color: "var(--sidebar-text)",
                    }}
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                ) : null}
                <Link
                  to="/products/categories/form"
                  className="compact-button px-base py-sm rounded-md transition-colors"
                  style={{
                    backgroundColor: "var(--accent-green)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Create First Category
                </Link>
              </div>
            </div>
          )}

          {/* Table Footer */}
          {filteredCategories.length > 0 && (
            <div className="mt-4">
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoriesPage;
