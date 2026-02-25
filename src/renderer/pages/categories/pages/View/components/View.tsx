// components/CategoryViewPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Folder,
  Calendar,
  Tag,
  Package,
  Eye,
} from "lucide-react";
import { categoryAPI, CategoryData } from "@/renderer/api/category";
import { showConfirm } from "@/renderer/utils/dialogs";

const CategoryViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const categoryData = await categoryAPI.findById(parseInt(id));
        setCategory(categoryData);
        if (!categoryData) {
          setError("Category not found");
        }
      } catch (err) {
        console.error("Error fetching category:", err);
        setError("Failed to load category");
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id]);

  const handleDelete = async () => {
    if (!category) return;

    const confirmed = await showConfirm({
      title: "Delete Category",
      message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await categoryAPI.delete(category.id);
      // You might want to show a success toast here
      // console.log("Category deleted successfully");
      navigate("/products/categories");
    } catch (error) {
      console.error("Error deleting category:", error);
      // You might want to show an error toast here
      setError("Failed to delete category");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
      : "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
  };

  // Calculate product count from children or use a placeholder
  const getProductCount = (category: CategoryData) => {
    // If you have actual product count data, replace this logic
    // For now, using children count as a placeholder
    return category.children_data?.length || 0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-bg)] compact-card rounded-lg shadow-sm border border-[var(--border-color)]">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent-blue)]"></div>
            <span className="ml-3 text-[var(--sidebar-text)] text-sm">
              Loading category...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-bg)] compact-card rounded-lg shadow-sm border border-[var(--border-color)]">
          <div className="text-center py-8">
            <div className="text-[var(--danger-color)] text-4xl mb-4">❌</div>
            <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-2">
              Error
            </h2>
            <p className="text-[var(--sidebar-text)] text-sm mb-4">{error}</p>
            <Link
              to="/products/categories"
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md inline-flex items-center"
            >
              <ArrowLeft className="icon-sm mr-sm" />
              Back to Categories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Category not found
  if (!category) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card-bg)] compact-card rounded-lg shadow-sm border border-[var(--border-color)]">
          <div className="text-center py-8">
            <div className="text-[var(--text-tertiary)] text-4xl mb-4">❌</div>
            <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-2">
              Category Not Found
            </h2>
            <p className="text-[var(--sidebar-text)] text-sm mb-4">
              The category you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/products/categories"
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md inline-flex items-center"
            >
              <ArrowLeft className="icon-sm mr-sm" />
              Back to Categories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Action Buttons */}
      <div className="bg-[var(--card-bg)] compact-card rounded-lg shadow-sm border border-[var(--border-color)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
          <div className="flex items-center">
            <Link
              to="/products/categories"
              className="mr-sm p-sm bg-[var(--card-secondary-bg)] rounded-md hover:bg-[var(--card-hover-bg)] mr-1"
            >
              <ArrowLeft className="icon-sm text-[var(--sidebar-text)]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[var(--sidebar-text)]">
                {category.name}
              </h1>
              <p className="text-[var(--sidebar-text)] mt-1 text-sm">
                Category Details
              </p>
            </div>
          </div>
          <div className="flex gap-sm">
            <Link
              to={`/products/categories/form/${category.id}`}
              className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
            >
              <Edit className="icon-sm mr-sm" />
              Edit Category
            </Link>
            <button
              onClick={handleDelete}
              className="compact-button bg-[var(--danger-color)] hover:bg-[var(--danger-hover)] text-[var(--sidebar-text)] rounded-md flex items-center"
            >
              <Trash2 className="icon-sm mr-sm" />
              Delete Category
            </button>
          </div>
        </div>
      </div>

      {/* Category Details Card */}
      <div className="bg-[var(--card-bg)] compact-card rounded-lg shadow-sm border border-[var(--border-color)]">
        <div className="max-w-2xl mx-auto">
          {/* Category Header */}
          <div className="flex items-center mb-6 pb-6 border-b border-[var(--border-color)]">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mr-1"
              style={{
                backgroundColor: category.color || "var(--default-color)",
              }}
            >
              <Folder className="icon-md text-[var(--sidebar-text)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--sidebar-text)]">
                {category.name}
              </h2>
              <p className="text-[var(--sidebar-text)] text-sm">
                ID: {category.id} • Slug: {category.slug}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center">
                <Tag className="icon-sm mr-sm" />
                Basic Information
              </h3>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Category Name
                </label>
                <p className="text-[var(--sidebar-text)] font-medium text-sm">
                  {category.name}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Description
                </label>
                <p className="text-[var(--sidebar-text)] text-sm">
                  {category.description || "No description provided"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(category.is_active)}`}
                >
                  {category.is_active ? "Active" : "Archived"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Parent Category
                </label>
                <p className="text-[var(--sidebar-text)] text-sm">
                  {category.parent_data?.name || "No parent category"}
                </p>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-base font-medium text-[var(--sidebar-text)] flex items-center">
                <Calendar className="icon-sm mr-sm" />
                Additional Information
              </h3>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Category Code
                </label>
                <p className="text-[var(--sidebar-text)] font-mono text-sm">
                  CAT-{category.id.toString().padStart(4, "0")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Date Created
                </label>
                <p className="text-[var(--sidebar-text)] text-sm">
                  {formatDate(category.created_at)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Last Updated
                </label>
                <p className="text-[var(--sidebar-text)] text-sm">
                  {formatDate(category.updated_at)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1 flex items-center">
                  <Package className="icon-xs mr-xs" />
                  Subcategories
                </label>
                <p className="text-[var(--sidebar-text)] font-medium text-sm">
                  {category.children_data?.length || 0} subcategor
                  {category.children_data?.length !== 1 ? "ies" : "y"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
                  Color
                </label>
                <div className="flex items-center gap-xs">
                  <div
                    className="w-5 h-5 rounded border border-[var(--border-light)]"
                    style={{
                      backgroundColor: category.color || "var(--default-color)",
                    }}
                  ></div>
                  <span className="text-[var(--sidebar-text)] font-mono text-sm">
                    {category.color || "var(--default-color)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subcategories Section */}
          {category.children_data && category.children_data.length > 0 && (
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <h3 className="text-base font-medium text-[var(--sidebar-text)] mb-4">
                Subcategories
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                {category.children_data.map((child) => (
                  <div
                    key={child.id}
                    className="bg-[var(--card-secondary-bg)] p-sm rounded-md border border-[var(--border-color)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[var(--sidebar-text)] text-sm">
                          {child.name}
                        </p>
                        <p className="text-xs text-[var(--sidebar-text)]">
                          Slug: {child.slug}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          child.is_active
                            ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                            : "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]"
                        }`}
                      >
                        {child.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Section */}
          {category.image_url && (
            <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
              <h3 className="text-base font-medium text-[var(--sidebar-text)] mb-4">
                Category Image
              </h3>
              <div className="flex justify-center">
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="max-w-xs max-h-48 object-cover rounded-md border border-[var(--border-color)]"
                />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
            <h3 className="text-base font-medium text-[var(--sidebar-text)] mb-4">
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-sm">
              <Link
                to={`/products?category=${category.id}`}
                className="compact-button bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--sidebar-text)] rounded-md flex items-center"
              >
                <Eye className="icon-sm mr-sm" />
                View Products
              </Link>
              <Link
                to={`/products/categories/form/${category.id}`}
                className="compact-button bg-[var(--accent-emerald-light)] hover:bg-[var(--accent-blue-hover-light)] text-[var(--accent-emerald)] rounded-md flex items-center"
              >
                <Edit className="icon-sm mr-sm" />
                Edit Category
              </Link>
              <button
                onClick={handleDelete}
                className="compact-button bg-[var(--accent-red-light)] hover:bg-[var(--danger-hover-light)] text-[var(--danger-color)] rounded-md flex items-center"
              >
                <Trash2 className="icon-sm mr-sm" />
                Delete Category
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryViewPage;
