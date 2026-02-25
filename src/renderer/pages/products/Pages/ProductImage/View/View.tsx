// pages/ProductImageView.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  Download,
  Eye,
  Calendar,
  Package,
  Image as ImageIcon,
  User,
} from "lucide-react";
import {
  showError,
  showSuccess,
  showInfo,
  showApiError,
} from "@/renderer/utils/notification";
import { productImageAPI, ProductImageData } from "@/renderer/api/productImage";
import { auditLogAPI } from "@/renderer/api/auditLog";
import { showConfirm } from "@/renderer/utils/dialogs";
import { formatCurrency } from "@/renderer/utils/formatters";

const ProductImageView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [image, setImage] = useState<ProductImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Convert to number
  const imageId = id ? parseInt(id, 10) : null;

  // Fetch product image data
  useEffect(() => {
    const fetchProductImage = async () => {
      if (!imageId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const imageData = await productImageAPI.findById(imageId);

        if (imageData) {
          setImage(imageData);

          // Log view action in audit log
          try {
            await auditLogAPI.logReadAction(
              1, // Current user ID - you might want to get this from auth context
              "ProductImage",
              imageId.toString(),
              { action: "viewed_image", image_id: imageId },
            );
          } catch (auditError) {
            console.warn("Failed to log audit trail:", auditError);
          }
        } else {
          showError("Product image not found");
          navigate("/products");
        }
      } catch (error) {
        console.error("Error fetching product image:", error);
        showError("Failed to load product image details");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProductImage();
  }, [imageId, navigate]);

  const handleEdit = () => {
    if (image) {
      navigate(`/products/${image.product}/images/form/${image.id}`);
    }
  };

  const handleDelete = async () => {
    if (!image || !imageId) return;

    const confirmed = await showConfirm({
      title: "Delete Product Image",
      message:
        "Are you sure you want to delete this product image? This action cannot be undone.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      setDeleting(true);
      await productImageAPI.delete(imageId);

      // Log delete action in audit log
      try {
        await auditLogAPI.logDeleteAction(
          1, // Current user ID
          "ProductImage",
          imageId.toString(),
          { action: "deleted_image", image_data: image },
        );
      } catch (auditError) {
        console.warn("Failed to log audit trail:", auditError);
      }

      showSuccess("Product image deleted successfully");
      navigate(`/products/view/${image.product}`);
    } catch (error: any) {
      console.error("Error deleting product image:", error);
      showApiError(error.message || "Failed to delete product image");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetAsPrimary = async () => {
    if (!image || !imageId) return;

    try {
      const updatedImage = await productImageAPI.setAsPrimary(imageId);
      setImage(updatedImage);

      // Log update action in audit log
      try {
        await auditLogAPI.logUpdateAction(
          1, // Current user ID
          "ProductImage",
          imageId.toString(),
          {
            action: "set_as_primary",
            previous_primary: image.is_primary,
            new_primary: true,
          },
        );
      } catch (auditError) {
        console.warn("Failed to log audit trail:", auditError);
      }

      showSuccess("Image set as primary successfully");
    } catch (error: any) {
      console.error("Error setting image as primary:", error);
      showApiError(error.message || "Failed to set image as primary");
    }
  };

  const handleDownload = () => {
    if (!image) return;

    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = image.image_url;
    link.download = `product-image-${image.id}-${image.product_data?.name || "unknown"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showInfo("Image download started");
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

  const getFileSizeFromUrl = (url: string): string => {
    // This is a placeholder - in a real application, you might want to store file size in your database
    // or make a HEAD request to get the content-length
    return "Unknown";
  };

  const getImageDimensions = (
    url: string,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    });
  };

  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (image) {
      getImageDimensions(image.image_url).then(setImageDimensions);
    }
  }, [image]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <p className="mt-4" style={{ color: "var(--sidebar-text)" }}>
            Loading product image...
          </p>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: "var(--sidebar-text)" }}
          >
            Product Image Not Found
          </h1>
          <p style={{ color: "var(--sidebar-text)" }}>
            The product image with ID "{id}" does not exist.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="mt-4 px-4 py-2 text-[var(--sidebar-text)] rounded-lg hover:bg-[var(--accent-blue-hover)]"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{ backgroundColor: "var(--background-color)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/products/view/${image.product}`)}
            className="flex items-center mb-4"
            style={{ color: "var(--accent-blue)" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Product
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                Product Image Details
              </h1>
              <p style={{ color: "var(--sidebar-text)" }}>
                View and manage product image information
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-[var(--sidebar-text)] rounded-lg flex items-center text-sm hover:bg-[var(--accent-green-hover)]"
                style={{ backgroundColor: "var(--accent-green)" }}
                title="Download Image"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
              {!image.is_primary && (
                <button
                  onClick={handleSetAsPrimary}
                  className="px-4 py-2 text-[var(--sidebar-text)] rounded-lg flex items-center text-sm hover:bg-[var(--accent-orange-hover)]"
                  style={{ backgroundColor: "var(--accent-orange)" }}
                  title="Set as Primary Image"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Set Primary
                </button>
              )}
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-[var(--sidebar-text)] rounded-lg flex items-center text-sm hover:bg-[var(--accent-blue-hover)]"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-[var(--sidebar-text)] rounded-lg flex items-center text-sm disabled:opacity-50 hover:bg-[var(--danger-hover)]"
                style={{ backgroundColor: "var(--danger-color)" }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Preview */}
          <div className="space-y-6">
            {/* Image Preview */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h2
                className="text-lg font-semibold mb-4 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <ImageIcon className="w-5 h-5 mr-2" />
                Image Preview
              </h2>

              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: "var(--card-secondary-bg)" }}
              >
                <div
                  className="aspect-square max-w-md mx-auto rounded-lg flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: "var(--input-bg)" }}
                >
                  <img
                    src={image.image_url}
                    alt={image.alt_text || image.product_display}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop";
                    }}
                  />
                </div>

                {/* Image Stats */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div
                    className="text-center p-3 rounded-lg"
                    style={{ backgroundColor: "var(--input-bg)" }}
                  >
                    <div
                      className="font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {imageDimensions
                        ? `${imageDimensions.width} × ${imageDimensions.height}`
                        : "Loading..."}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Dimensions
                    </div>
                  </div>
                  <div
                    className="text-center p-3 rounded-lg"
                    style={{ backgroundColor: "var(--input-bg)" }}
                  >
                    <div
                      className="font-medium"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {getFileSizeFromUrl(image.image_url)}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      File Size
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: "var(--sidebar-text)" }}
              >
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="p-3 rounded-lg flex flex-col items-center justify-center hover:bg-[var(--accent-green-light)]"
                  style={{
                    backgroundColor: "var(--accent-green-light)",
                    color: "var(--accent-green)",
                  }}
                >
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-sm">Download</span>
                </button>

                {!image.is_primary && (
                  <button
                    onClick={handleSetAsPrimary}
                    className="p-3 rounded-lg flex flex-col items-center justify-center hover:bg-[var(--accent-orange-light)]"
                    style={{
                      backgroundColor: "var(--accent-orange-light)",
                      color: "var(--accent-orange)",
                    }}
                  >
                    <Star className="w-5 h-5 mb-1" />
                    <span className="text-sm">Set Primary</span>
                  </button>
                )}

                <button
                  onClick={() => window.open(image.image_url, "_blank")}
                  className="p-3 rounded-lg flex flex-col items-center justify-center hover:bg-[var(--accent-blue-light)]"
                  style={{
                    backgroundColor: "var(--accent-blue-light)",
                    color: "var(--accent-blue)",
                  }}
                >
                  <Eye className="w-5 h-5 mb-1" />
                  <span className="text-sm">Open New Tab</span>
                </button>

                <button
                  onClick={() => navigate(`/products/view/${image.product}`)}
                  className="p-3 rounded-lg flex flex-col items-center justify-center hover:bg-[var(--accent-purple-light)]"
                  style={{
                    backgroundColor: "var(--accent-purple-light)",
                    color: "var(--accent-purple)",
                  }}
                >
                  <Package className="w-5 h-5 mb-1" />
                  <span className="text-sm">View Product</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Image Details */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: "var(--sidebar-text)" }}
              >
                Basic Information
              </h2>

              <div className="space-y-4">
                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Image ID:
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    #{image.id}
                  </span>
                </div>

                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>Product:</span>
                  <div className="text-right">
                    <div
                      className="font-medium"
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
                  </div>
                </div>

                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Alt Text:
                  </span>
                  <span
                    className="font-medium text-right"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {image.alt_text || "Not specified"}
                  </span>
                </div>

                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Display Order:
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {image.sort_order}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Primary Image:
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={
                      image.is_primary
                        ? {
                            backgroundColor: "var(--accent-green-light)",
                            color: "var(--accent-green)",
                          }
                        : {
                            backgroundColor: "var(--status-inactive-bg)",
                            color: "var(--status-inactive-text)",
                          }
                    }
                  >
                    {image.is_primary ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Product Information */}
            {image.product_data && (
              <div
                className="rounded-xl shadow-sm border p-6"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                }}
              >
                <h2
                  className="text-lg font-semibold mb-4 flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Package className="w-5 h-5 mr-2" />
                  Product Information
                </h2>

                <div className="space-y-3">
                  <div
                    className="flex items-center space-x-3 p-3 rounded-lg"
                    style={{ backgroundColor: "var(--card-secondary-bg)" }}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "var(--accent-blue-light)" }}
                    >
                      <Package
                        className="w-5 h-5"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {image.product_data.name}
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        SKU: {image.product_data.sku}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div
                      className="text-center p-3 rounded-lg"
                      style={{ backgroundColor: "var(--card-secondary-bg)" }}
                    >
                      <div
                        className="font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        ${formatCurrency(image.product_data.price)}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Price
                      </div>
                    </div>
                    <div
                      className="text-center p-3 rounded-lg"
                      style={{ backgroundColor: "var(--card-secondary-bg)" }}
                    >
                      <div
                        className={`font-semibold ${
                          image.product_data.quantity === 0
                            ? "text-[var(--danger-color)]"
                            : image.product_data.quantity <= 10
                              ? "text-[var(--accent-orange)]"
                              : "text-[var(--accent-green)]"
                        }`}
                      >
                        {image.product_data.quantity}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Stock
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/products/view/${image.product}`)}
                    className="w-full p-3 text-[var(--sidebar-text)] rounded-lg flex items-center justify-center text-sm hover:bg-[var(--accent-blue-hover)]"
                    style={{ backgroundColor: "var(--accent-blue)" }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Product Details
                  </button>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h2
                className="text-lg font-semibold mb-4 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Calendar className="w-5 h-5 mr-2" />
                Metadata
              </h2>

              <div className="space-y-3">
                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>Created:</span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(image.created_at)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Last Updated:
                  </span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(image.created_at)}{" "}
                    {/* Note: API might not have updated_at */}
                  </span>
                </div>
              </div>
            </div>

            {/* Image URL */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                Image URL
              </h3>
              <div className="flex">
                <input
                  type="text"
                  value={image.image_url}
                  readOnly
                  className="flex-1 p-2 border rounded-l-lg text-sm"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(image.image_url);
                    showInfo("Image URL copied to clipboard");
                  }}
                  className="px-4 text-[var(--sidebar-text)] rounded-r-lg hover:bg-[var(--accent-blue-hover)] text-sm"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImageView;
