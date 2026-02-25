// pages/ProductVariantViewPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Package,
  DollarSign,
  Hash,
  Box,
  Warehouse,
  Calendar,
  BarChart3,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Code,
} from "lucide-react";
import {
  productVariantAPI,
  ProductVariantData,
} from "@/renderer/api/productVariant";
import {
  showApiError,
  showError,
  showSuccess,
} from "@/renderer/utils/notification";
import { showConfirm } from "@/renderer/utils/dialogs";
import { formatCurrency } from "@/renderer/utils/formatters";

const ProductVariantViewPage: React.FC = () => {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();
  const [variant, setVariant] = useState<ProductVariantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const parsedVariantId = variantId ? parseInt(variantId, 10) : null;

  // Fetch variant data
  useEffect(() => {
    const fetchVariant = async () => {
      if (!parsedVariantId) {
        showError("Variant ID is required");
        navigate("/products/variants");
        return;
      }

      try {
        setLoading(true);
        const variantData = await productVariantAPI.findById(parsedVariantId);

        if (!variantData) {
          showError("Product variant not found");
          navigate("/products/variants");
          return;
        }

        setVariant(variantData);
      } catch (error: any) {
        console.error("Error fetching variant:", error);
        showApiError(error.message || "Failed to load variant data");
        navigate("/products/variants");
      } finally {
        setLoading(false);
      }
    };

    fetchVariant();
  }, [parsedVariantId, navigate]);

  const handleDelete = async () => {
    if (!variant) return;

    const confirmed = await showConfirm({
      title: "Delete Variant",
      message:
        "Are you sure you want to delete this variant? This action cannot be undone.",
      icon: "warning",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      setDeleting(true);
      await productVariantAPI.delete(variant.id);
      showSuccess("Variant deleted successfully!");
      navigate("/products/variants");
    } catch (error: any) {
      console.error("Error deleting variant:", error);
      showApiError(error.message || "Failed to delete variant");
    } finally {
      setDeleting(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!variant) return;

    const action = variant.is_deleted ? "restore" : "archive";
    const message = variant.is_deleted
      ? "Are you sure you want to restore this variant?"
      : "Are you sure you want to archive this variant? You can restore it later.";

    const confirmed = await showConfirm({
      title: variant.is_deleted ? "Restore Variant" : "Archive Variant",
      message,
      icon: variant.is_deleted ? "info" : "warning",
      confirmText: variant.is_deleted ? "Restore" : "Archive",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      if (variant.is_deleted) {
        await productVariantAPI.restore(variant.id);
        showSuccess("Variant restored successfully!");
      } else {
        await productVariantAPI.softDelete(variant.id);
        showSuccess("Variant archived successfully!");
      }

      // Refresh variant data
      const updatedVariant = await productVariantAPI.findById(variant.id);
      setVariant(updatedVariant);
    } catch (error: any) {
      console.error(`Error ${action}ing variant:`, error);
      showApiError(error.message || `Failed to ${action} variant`);
    }
  };

  const calculateProfit = () => {
    if (!variant) return 0;
    const price = parseFloat(variant.net_price) || 0;
    const cost = parseFloat(variant.cost_per_item || "0") || 0;
    return price - cost;
  };

  const calculateMargin = () => {
    if (!variant) return 0;
    const price = parseFloat(variant.net_price) || 0;
    const cost = parseFloat(variant.cost_per_item || "0") || 0;
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  const getTotalStock = () => {
    if (!variant) return 0;
    return (
      variant.stock_locations?.reduce((sum, loc) => sum + loc.quantity, 0) ||
      variant.quantity ||
      0
    );
  };

  const getStockStatus = () => {
    const totalStock = getTotalStock();
    if (totalStock === 0) return "out-of-stock";
    if (totalStock <= 10) return "low-stock";
    return "in-stock";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-stock":
        return "bg-[var(--accent-green-light)] text-[var(--accent-green)]";
      case "low-stock":
        return "bg-[var(--accent-orange-light)] text-[var(--accent-orange)]";
      case "out-of-stock":
        return "bg-[var(--accent-red-light)] text-[var(--accent-red)]";
      default:
        return "bg-[var(--status-inactive-bg)] text-[var(--status-inactive-text)]";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in-stock":
        return "In Stock";
      case "low-stock":
        return "Low Stock";
      case "out-of-stock":
        return "Out of Stock";
      default:
        return status;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
          <p className="mt-4 text-sm" style={{ color: "var(--sidebar-text)" }}>
            Loading variant data...
          </p>
        </div>
      </div>
    );
  }

  if (!variant) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-lg font-semibold mb-3"
            style={{ color: "var(--sidebar-text)" }}
          >
            Variant Not Found
          </h1>
          <p className="text-sm mb-4" style={{ color: "var(--sidebar-text)" }}>
            The product variant you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/products/variants")}
            className="px-4 py-2 text-[var(--sidebar-text)] rounded text-sm compact-button"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            Back to Variants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-4"
      style={{ backgroundColor: "var(--background-color)" }}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate("/products/variants")}
              className="flex items-center text-sm compact-button"
              style={{ color: "var(--accent-blue)" }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Variants
            </button>

            <div className="flex gap-2">
              {variant.is_deleted && (
                <button
                  onClick={handleSoftDelete}
                  className="flex items-center px-3 py-2 text-[var(--sidebar-text)] rounded text-xs compact-button"
                  style={{ backgroundColor: "var(--accent-green)" }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Restore
                </button>
              )}
              <button
                onClick={handleSoftDelete}
                disabled={deleting}
                className={`flex items-center px-3 py-2 rounded text-xs compact-button ${
                  variant.is_deleted
                    ? "bg-[var(--card-secondary-bg)] text-[var(--sidebar-text)]"
                    : "bg-[var(--accent-orange)] text-[var(--sidebar-text)]"
                }`}
              >
                {variant.is_deleted ? (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Keep Archived
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 mr-1" />
                    Archive
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center px-3 py-2 bg-[var(--accent-red)] text-[var(--sidebar-text)] rounded text-xs compact-button disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <Link
                to={`/products/variants/edit/${variant.id}`}
                className="flex items-center px-3 py-2 bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded text-xs compact-button"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit Variant
              </Link>
            </div>
          </div>

          <div
            className="compact-card"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1
                    className="text-lg font-semibold"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {variant.name}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(getStockStatus())}`}
                  >
                    {getStatusText(getStockStatus())}
                  </span>
                  {variant.is_deleted && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-red-light)] text-[var(--accent-red)]">
                      Archived
                    </span>
                  )}
                </div>
                <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                  Variant of{" "}
                  <Link
                    to={`/products/view/${variant.product}`}
                    className="text-[var(--accent-blue)] hover:underline"
                  >
                    {variant.product_display}
                  </Link>
                </p>
              </div>

              <div className="text-right">
                <p
                  className="text-lg font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formatCurrency(parseFloat(variant.net_price))}
                </p>
                <p className="text-xs" style={{ color: "var(--sidebar-text)" }}>
                  Variant ID: {variant.id}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Basic Information */}
          <div className="lg:col-span-2 space-y-4">
            {/* Stock Information Card */}
            <div
              className="compact-card"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div
                style={{ borderBottomColor: "var(--border-color)" }}
                className="px-4 py-3"
              >
                <h3
                  className="text-sm font-semibold flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Warehouse className="w-4 h-4 mr-2" />
                  Stock Information
                </h3>
              </div>
              <div className="p-4">
                {variant.stock_locations &&
                variant.stock_locations.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div
                        className="compact-stats rounded p-3"
                        style={{ backgroundColor: "var(--accent-blue-light)" }}
                      >
                        <div
                          className="text-lg font-semibold"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          {getTotalStock()}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          Total Stock
                        </div>
                      </div>
                      <div
                        className="compact-stats rounded p-3"
                        style={{ backgroundColor: "var(--accent-green-light)" }}
                      >
                        <div
                          className="text-lg font-semibold"
                          style={{ color: "var(--accent-green)" }}
                        >
                          {variant.stock_locations.length}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--accent-green)" }}
                        >
                          Warehouse Locations
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4
                        className="font-medium text-xs"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        Stock by Location
                      </h4>
                      {variant.stock_locations.map((location) => (
                        <div
                          key={location.id}
                          className="flex items-center justify-between p-2 border rounded text-xs"
                          style={{ borderColor: "var(--border-color)" }}
                        >
                          <div>
                            <div
                              className="font-medium"
                              style={{ color: "var(--sidebar-text)" }}
                            >
                              {location.warehouse_data?.name}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "var(--sidebar-text)" }}
                            >
                              Code: {location.warehouse_data?.type}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-semibold ${
                                location.quantity === 0
                                  ? "text-[var(--accent-red)]"
                                  : location.quantity <=
                                      location.low_stock_threshold
                                    ? "text-[var(--accent-orange)]"
                                    : "text-[var(--accent-green)]"
                              }`}
                            >
                              {location.quantity} units
                            </div>
                            {location.low_stock_threshold > 0 && (
                              <div
                                className="text-xs"
                                style={{ color: "var(--sidebar-text)" }}
                              >
                                Low stock alert at{" "}
                                {location.low_stock_threshold}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Box
                      className="w-8 h-8 mx-auto mb-2"
                      style={{ color: "var(--sidebar-text)" }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      No stock information available
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Stock locations will appear when inventory is added
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Information Card */}
            <div
              className="compact-card"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div
                style={{ borderBottomColor: "var(--border-color)" }}
                className="px-4 py-3"
              >
                <h3
                  className="text-sm font-semibold flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Pricing Information
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4
                      className="font-medium text-xs mb-2"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Cost & Price
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Selling Price:
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {formatCurrency(parseFloat(variant.net_price))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Cost per Item:
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {variant.cost_per_item
                            ? `${formatCurrency(parseFloat(variant.cost_per_item))}`
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4
                      className="font-medium text-xs mb-2"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Profit Analysis
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Profit per Unit:
                        </span>
                        <span
                          className={`font-semibold ${
                            calculateProfit() >= 0
                              ? "text-[var(--accent-green)]"
                              : "text-[var(--accent-red)]"
                          }`}
                        >
                          {formatCurrency(calculateProfit())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Profit Margin:
                        </span>
                        <span
                          className={`font-semibold ${
                            calculateMargin() >= 0
                              ? "text-[var(--accent-blue)]"
                              : "text-[var(--accent-red)]"
                          }`}
                        >
                          {calculateMargin().toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profit Summary */}
                {calculateProfit() > 0 && (
                  <div
                    className="mt-4 p-2 rounded border text-xs"
                    style={{
                      backgroundColor: "var(--accent-green-light)",
                      borderColor: "var(--accent-green)",
                    }}
                  >
                    <div className="flex items-center">
                      <CheckCircle
                        className="w-3 h-3 mr-1"
                        style={{ color: "var(--accent-green)" }}
                      />
                      <span style={{ color: "var(--accent-green)" }}>
                        This variant is profitable
                      </span>
                    </div>
                  </div>
                )}

                {calculateProfit() < 0 && (
                  <div
                    className="mt-4 p-2 rounded border text-xs"
                    style={{
                      backgroundColor: "var(--accent-red-light)",
                      borderColor: "var(--accent-red)",
                    }}
                  >
                    <div className="flex items-center">
                      <AlertTriangle
                        className="w-3 h-3 mr-1"
                        style={{ color: "var(--accent-red)" }}
                      />
                      <span style={{ color: "var(--accent-red)" }}>
                        This variant is selling below cost
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Additional Information */}
          <div className="space-y-4">
            {/* Basic Information Card */}
            <div
              className="compact-card"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div
                style={{ borderBottomColor: "var(--border-color)" }}
                className="px-4 py-3"
              >
                <h3
                  className="text-sm font-semibold flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Basic Information
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <Hash className="w-3 h-3 inline mr-1" />
                    SKU
                  </label>
                  <p
                    className="text-xs font-mono p-2 rounded border"
                    style={{
                      backgroundColor: "var(--card-secondary-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--sidebar-text)",
                    }}
                  >
                    {variant.sku || "Not set"}
                  </p>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <Code className="w-3 h-3 inline mr-1" />
                    Barcode
                  </label>
                  <p
                    className="text-xs font-mono p-2 rounded border"
                    style={{
                      backgroundColor: "var(--card-secondary-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--sidebar-text)",
                    }}
                  >
                    {variant.barcode || "Not set"}
                  </p>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Parent Product
                  </label>
                  <Link
                    to={`/products/view/${variant.product}`}
                    className="text-xs text-[var(--accent-blue)] hover:underline font-medium"
                  >
                    {variant.product_display}
                  </Link>
                </div>
              </div>
            </div>

            {/* System Information Card */}
            <div
              className="compact-card"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div
                style={{ borderBottomColor: "var(--border-color)" }}
                className="px-4 py-3"
              >
                <h3
                  className="text-sm font-semibold flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  System Information
                </h3>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: "var(--sidebar-text)" }}>Created:</span>
                  <span style={{ color: "var(--sidebar-text)" }}>
                    {formatDate(variant.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Variant ID:
                  </span>
                  <span
                    className="font-mono"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    #{variant.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--sidebar-text)" }}>
                    Product ID:
                  </span>
                  <span
                    className="font-mono"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    #{variant.product}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--sidebar-text)" }}>Status:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      variant.is_deleted
                        ? "bg-[var(--accent-red-light)] text-[var(--accent-red)]"
                        : "bg-[var(--accent-green-light)] text-[var(--accent-green)]"
                    }`}
                  >
                    {variant.is_deleted ? "Archived" : "Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div
              className="compact-card"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div
                style={{ borderBottomColor: "var(--border-color)" }}
                className="px-4 py-3"
              >
                <h3
                  className="text-sm font-semibold flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Quick Actions
                </h3>
              </div>
              <div className="p-4 space-y-2">
                <Link
                  to={`/products/variants/edit/${variant.id}`}
                  className="w-full flex items-center justify-center px-3 py-2 text-[var(--sidebar-text)] rounded text-xs compact-button"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Variant
                </Link>
                <Link
                  to={`/products/view/${variant.product}`}
                  className="w-full flex items-center justify-center px-3 py-2 rounded text-xs compact-button"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  <Package className="w-3 h-3 mr-1" />
                  View Product
                </Link>
                <Link
                  to={`/products/${variant.product}/variants/add`}
                  className="w-full flex items-center justify-center px-3 py-2 text-[var(--sidebar-text)] rounded text-xs compact-button"
                  style={{ backgroundColor: "var(--accent-green)" }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Another Variant
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductVariantViewPage;
