// components/ProductImagesPage.tsx
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
  Image,
  Star,
} from "lucide-react";
import { productImageAPI, ProductImageData } from "@/renderer/api/productImage"; // Adjust the import path as needed
import { showError } from "@/renderer/utils/notification";
import { showConfirm } from "@/renderer/utils/dialogs";

interface Filters {
  search: string;
  isPrimary: string;
}

const ProductImagesPage: React.FC = () => {
  const [productImages, setProductImages] = useState<ProductImageData[]>([]);
  const [filteredProductImages, setFilteredProductImages] = useState<
    ProductImageData[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Filters>({
    search: "",
    isPrimary: "",
  });

  // Fetch product images from API
  useEffect(() => {
    const fetchProductImages = async () => {
      try {
        setLoading(true);
        const data = await productImageAPI.findAll();
        setProductImages(data);
        setFilteredProductImages(data);
      } catch (error) {
        console.error("Error fetching product images:", error);
        // You might want to show a toast notification here
      } finally {
        setLoading(false);
      }
    };

    fetchProductImages();
  }, []);

  // Filter product images based on filters
  useEffect(() => {
    setLoading(true);
    const filtered = productImages.filter((image) => {
      const matchesSearch =
        !filters.search ||
        image.product_display
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        image.alt_text.toLowerCase().includes(filters.search.toLowerCase());

      const matchesPrimary =
        !filters.isPrimary ||
        (filters.isPrimary === "primary" && image.is_primary) ||
        (filters.isPrimary === "secondary" && !image.is_primary);

      return matchesSearch && matchesPrimary;
    });

    // Simulate API delay for better UX
    const timer = setTimeout(() => {
      setFilteredProductImages(filtered);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters, productImages]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      isPrimary: "",
    });
  };

  const toggleImageSelection = (imageId: number) => {
    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedImages.length === filteredProductImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredProductImages.map((image) => image.id));
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    const confirmed = await showConfirm({
      title: "Delete Product Image",
      message: "Are you sure you want to delete this product image?",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      await productImageAPI.delete(imageId);
      // Remove the image from local state
      setProductImages((prev) => prev.filter((img) => img.id !== imageId));
      setSelectedImages((prev) => prev.filter((id) => id !== imageId));
      // Optional: show a success toast here
      // console.log("Product image deleted successfully");
    } catch (error) {
      console.error("Error deleting product image:", error);
      // Optional: show an error toast here
      showError("Failed to delete product image");
    }
  };

  const getPrimaryBadge = (isPrimary: boolean) => {
    return isPrimary
      ? {
          backgroundColor: "var(--accent-orange-light)",
          color: "var(--accent-orange)",
        }
      : {
          backgroundColor: "var(--status-inactive-bg)",
          color: "var(--status-inactive-text)",
        };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Quick Stats Data
  const quickStats = {
    total: productImages.length,
    primary: productImages.filter((img) => img.is_primary).length,
    secondary: productImages.filter((img) => !img.is_primary).length,
    totalProducts: new Set(productImages.map((img) => img.product)).size,
  };

  return (
    <div
      className="p-6 rounded-xl shadow-md border"
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
            Product Images
          </h2>
          <p className="mt-1" style={{ color: "var(--sidebar-text)" }}>
            Manage product images and galleries
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 rounded-lg flex items-center"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <Link
            to="/products/images/form"
            className="px-4 py-2 rounded-lg flex items-center hover:bg-[var(--accent-blue-hover)]"
            style={{ backgroundColor: "var(--accent-blue)", color: "white" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Image
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Total Images
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {quickStats.total}
          </div>
        </div>
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Primary Images
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{ color: "var(--accent-orange)" }}
          >
            {quickStats.primary}
          </div>
        </div>
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Secondary Images
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{ color: "var(--sidebar-text)" }}
          >
            {quickStats.secondary}
          </div>
        </div>
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--card-secondary-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            Products with Images
          </div>
          <div
            className="text-2xl font-bold mt-1"
            style={{ color: "var(--accent-blue)" }}
          >
            {quickStats.totalProducts}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 rounded-lg"
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
              placeholder="Search by product or alt text..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full p-2 border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--sidebar-text)",
                borderColor: "var(--border-color)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--sidebar-text)" }}
            >
              Image Type
            </label>
            <select
              value={filters.isPrimary}
              onChange={(e) => handleFilterChange("isPrimary", e.target.value)}
              className="w-full p-2 border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                color: "var(--sidebar-text)",
                borderColor: "var(--border-color)",
              }}
            >
              <option value="">All Types</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full p-2 rounded-md hover:bg-[var(--primary-hover)]"
              style={{
                backgroundColor: "var(--primary-color)",
                color: "white",
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedImages.length > 0 && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center justify-between"
          style={{ backgroundColor: "var(--accent-blue-light)" }}
        >
          <span style={{ color: "var(--accent-emerald)" }}>
            {selectedImages.length} image(s) selected
          </span>
          <div className="flex space-x-2">
            <button
              className="p-2 rounded-md"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                color: "var(--sidebar-text)",
              }}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-8">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
        </div>
      )}

      {/* Product Images Table */}
      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedImages.length ===
                          filteredProductImages.length &&
                        filteredProductImages.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Image
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Product
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Alt Text
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Order
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "var(--card-bg)" }}>
                {filteredProductImages.map((image) => (
                  <tr
                    key={image.id}
                    className="hover:bg-[var(--card-secondary-bg)]"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedImages.includes(image.id)}
                        onChange={() => toggleImageSelection(image.id)}
                        className="h-4 w-4 rounded"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center mr-3"
                          style={{
                            backgroundColor: "var(--card-secondary-bg)",
                          }}
                        >
                          {image.image_url ? (
                            <img
                              src={image.image_url}
                              alt={image.alt_text}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image
                              className="w-6 h-6"
                              style={{ color: "var(--sidebar-text)" }}
                            />
                          )}
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            Image #{image.id}
                          </div>
                          <div
                            className="text-sm"
                            style={{ color: "var(--sidebar-text)" }}
                          >
                            {image.is_primary && "Primary"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {image.product_display}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        ID: {image.product}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-sm max-w-xs truncate"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {image.alt_text || "No alt text"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={getPrimaryBadge(image.is_primary)}
                      >
                        {image.is_primary ? (
                          <>
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Primary
                          </>
                        ) : (
                          "Secondary"
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm font-medium"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {image.sort_order}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {formatDate(image.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            navigate(`/products/images/view/${image.id}`);
                          }}
                          style={{ color: "var(--accent-blue)" }}
                          title="View Image"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            navigate(`/products/images/form/${image.id}`);
                          }}
                          style={{ color: "var(--accent-blue)" }}
                          title="Edit Image"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          style={{ color: "var(--danger-color)" }}
                          title="Delete Image"
                          onClick={() => handleDeleteImage(image.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredProductImages.length === 0 && (
            <div className="text-center py-8">
              <div
                className="text-5xl mb-4"
                style={{ color: "var(--sidebar-text)" }}
              >
                🖼️
              </div>
              <p style={{ color: "var(--sidebar-text)" }}>
                No product images found.
              </p>
              <button
                className="mt-4 px-4 py-2 rounded-lg hover:bg-[var(--accent-blue-hover)]"
                style={{
                  backgroundColor: "var(--accent-blue)",
                  color: "white",
                }}
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Table Footer */}
          {filteredProductImages.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">
                  {filteredProductImages.length}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {filteredProductImages.length}
                </span>{" "}
                results
              </div>
              <div className="flex space-x-2">
                <button
                  className="px-3 py-1 rounded-md cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Previous
                </button>
                <button
                  className="px-3 py-1 rounded-md cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductImagesPage;
