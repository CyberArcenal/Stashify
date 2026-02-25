// pages/ProductVariantFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  X,
  Package,
  DollarSign,
  Hash,
  Code,
} from "lucide-react";
import {
  showApiError,
  showError,
  showSuccess,
} from "@/renderer/utils/notification";
import {
  productVariantAPI,
  ProductVariantForm as ProductVariantFormData,
  ProductVariantData,
} from "@/renderer/api/productVariant";
import productAPI, { ProductData } from "@/renderer/api/product";
import { formatCurrency } from "@/renderer/utils/formatters";

interface ProductVariantFormPageProps {}

const ProductVariantFormPage: React.FC<ProductVariantFormPageProps> = () => {
  const { productId, variantId } = useParams<{
    productId: string;
    variantId: string;
  }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [variant, setVariant] = useState<ProductVariantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProductVariantFormData>({
    product: 0,
    name: "",
    sku: "",
    net_price: "",
    cost_per_item: "",
    barcode: "",
    low_stock_threshold: 0,
    warehouses: [],
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductVariantFormData, string>>
  >({});

  const mode = variantId ? "edit" : "add";
  const parsedProductId = productId ? parseInt(productId, 10) : null;
  const parsedVariantId = variantId ? parseInt(variantId, 10) : null;

  // Fetch product and variant data
  useEffect(() => {
    const fetchData = async () => {
      if (!parsedProductId) {
        showError("Product ID is required");
        navigate("/products");
        return;
      }

      try {
        setLoading(true);

        // Fetch product data
        const productData = await productAPI.findById(parsedProductId);
        if (!productData) {
          showError("Product not found");
          navigate("/products");
          return;
        }
        setProduct(productData);
        setFormData((prev) => ({ ...prev, product: parsedProductId }));

        // Fetch variant data if in edit mode
        if (mode === "edit" && parsedVariantId) {
          const variantData = await productVariantAPI.findById(parsedVariantId);
          if (!variantData) {
            showError("Product variant not found");
            navigate(`/products/view/${parsedProductId}`);
            return;
          }
          setVariant(variantData);

          // Pre-fill form with existing data
          setFormData({
            product: variantData.product_data.id,
            name: variantData.name || "",
            sku: variantData.sku || "",
            net_price: variantData.net_price || "",
            cost_per_item: variantData.cost_per_item || "",
            barcode: variantData.barcode || "",
            low_stock_threshold: variantData.low_stock_threshold || 0,
            warehouses:
              variantData.stock_locations?.map(
                (loc) => loc.warehouse_data.id,
              ) || [],
          });
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        showApiError(error.message || "Failed to load form data");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [parsedProductId, parsedVariantId, mode, navigate]);

  const handleInputChange = (
    field: keyof ProductVariantFormData,
    value: string | number | number[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductVariantFormData, string>> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = "Variant name is required";
    }

    if (!formData.product) {
      newErrors.product = "Product is required";
    }

    if (formData.low_stock_threshold && formData.low_stock_threshold < 0) {
      newErrors.low_stock_threshold = "Low stock threshold cannot be negative";
    }
    // Price validation
    if (formData.net_price && parseFloat(formData.net_price) < 0) {
      newErrors.net_price = "Price cannot be negative";
    }

    if (formData.cost_per_item && parseFloat(formData.cost_per_item) < 0) {
      newErrors.cost_per_item = "Cost cannot be negative";
    }

    if (formData.net_price && formData.cost_per_item) {
      const price = parseFloat(formData.net_price);
      const cost = parseFloat(formData.cost_per_item);
      if (price < cost) {
        newErrors.net_price = "Price cannot be less than cost";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Prepare submission data
      const submissionData: ProductVariantFormData = {
        ...formData,
        net_price: formData.net_price || "0.00",
        cost_per_item: formData.cost_per_item || undefined,
        sku: formData.sku || undefined,
        barcode: formData.barcode || undefined,
      };

      let result: ProductVariantData;

      if (mode === "add") {
        result = await productVariantAPI.create(submissionData);
        showSuccess("Product variant created successfully!");
      } else {
        if (!parsedVariantId) {
          throw new Error("Variant ID is required for editing");
        }
        result = await productVariantAPI.update(
          parsedVariantId,
          submissionData,
        );
        showSuccess("Product variant updated successfully!");
      }

      // Navigate back to product detail page
      navigate(`/products/view/${formData.product}`);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      showApiError(
        error.message ||
          `Failed to ${mode === "add" ? "create" : "update"} product variant`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (parsedProductId) {
      navigate(`/products/view/${parsedProductId}`);
    } else {
      navigate("/products");
    }
  };

  const calculateProfit = () => {
    const price = parseFloat(formData.net_price || "0") || 0;
    const cost = parseFloat(formData.cost_per_item || "0") || 0;
    return price - cost;
  };

  const calculateMargin = () => {
    const price = parseFloat(formData.net_price || "0") || 0;
    const cost = parseFloat(formData.cost_per_item || "0") || 0;
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-secondary)] text-sm">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--sidebar-text)] mb-2">
            Product Not Found
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            The product does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)] py-4">
      <div className="max-w-2xl mx-auto px-4 sm:px-4 lg:px-4">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] mb-2 text-sm"
          >
            <ArrowLeft className="icon-sm mr-xs" />
            Back to Product
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-[var(--sidebar-text)] mb-1">
                {mode === "add"
                  ? "Add Product Variant"
                  : "Edit Product Variant"}
              </h1>
              <p className="text-[var(--text-secondary)] text-sm">
                {mode === "add"
                  ? `Add a new variant to ${product.name}`
                  : `Edit variant for ${product.name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="compact-card rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden">
          <div className="border-b border-[var(--border-color)] compact-card">
            <div className="flex items-center">
              <Package className="icon-md text-[var(--text-secondary)] mr-sm" />
              <h2 className="text-base font-semibold text-[var(--sidebar-text)]">
                {mode === "add" ? "Add New Variant" : "Edit Variant"}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="compact-card">
            <div className="space-y-4">
              {/* Product Information (Read-only) */}
              <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-1">
                  Product Information
                </h3>
                <div className="flex items-center gap-sm">
                  {product.primary_image_url && (
                    <img
                      src={product.primary_image_url}
                      alt={product.name}
                      className="w-8 h-8 object-cover rounded-md"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[var(--sidebar-text)]">
                      {product.name}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      SKU: {product.sku} • ID: {product.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Variant Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                  Variant Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`w-full compact-input border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${
                    errors.name
                      ? "border-[var(--accent-red)] focus:border-[var(--accent-red)] focus:ring-[var(--accent-red)]"
                      : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                  }`}
                  placeholder="Enter variant name (e.g., Size: Large, Color: Red)"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-[var(--accent-red)]">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* SKU and Barcode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    <Hash className="icon-sm inline mr-xs" />
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange("sku", e.target.value)}
                    className="w-full compact-input border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                    placeholder="Variant SKU"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    <Code className="icon-sm inline mr-xs" />
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      handleInputChange("barcode", e.target.value)
                    }
                    className="w-full compact-input border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                    placeholder="Variant barcode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                    <Code className="icon-sm inline mr-xs" />
                    Low Stock Threshold
                  </label>
                  <input
                    type="text"
                    value={formData.low_stock_threshold}
                    onChange={(e) =>
                      handleInputChange("low_stock_threshold", e.target.value)
                    }
                    className="w-full compact-input border border-[var(--border-color)] rounded-md bg-[var(--input-bg)] text-[var(--input-text)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                    placeholder="Variant low stock threshold"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="bg-[var(--card-secondary-bg)] rounded-md compact-card">
                <h3 className="text-sm font-medium text-[var(--sidebar-text)] mb-2 flex items-center">
                  <DollarSign className="icon-sm mr-xs" />
                  Pricing Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  {/* Cost */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] text-sm">
                        ₱
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_per_item}
                        onChange={(e) =>
                          handleInputChange("cost_per_item", e.target.value)
                        }
                        className={`w-full compact-input pl-6 border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${
                          errors.cost_per_item
                            ? "border-[var(--accent-red)] focus:border-[var(--accent-red)] focus:ring-[var(--accent-red)]"
                            : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        }`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.cost_per_item && (
                      <p className="mt-1 text-xs text-[var(--accent-red)]">
                        {errors.cost_per_item}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
                      Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)] text-sm">
                        ₱
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.net_price}
                        onChange={(e) =>
                          handleInputChange("net_price", e.target.value)
                        }
                        className={`w-full compact-input pl-6 border rounded-md bg-[var(--input-bg)] text-[var(--input-text)] ${
                          errors.net_price
                            ? "border-[var(--accent-red)] focus:border-[var(--accent-red)] focus:ring-[var(--accent-red)]"
                            : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        }`}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    {errors.net_price && (
                      <p className="mt-1 text-xs text-[var(--accent-red)]">
                        {errors.net_price}
                      </p>
                    )}
                  </div>
                </div>

                {/* Profit Calculation */}
                {(formData.cost_per_item || formData.net_price) && (
                  <div className="mt-2 compact-card bg-[var(--input-bg)] rounded border border-[var(--border-color)]">
                    <div className="grid grid-cols-2 gap-sm text-xs">
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Profit:
                        </span>
                        <div
                          className={`font-semibold text-sm ${
                            calculateProfit() >= 0
                              ? "text-[var(--accent-green)]"
                              : "text-[var(--accent-red)]"
                          }`}
                        >
                          {formatCurrency(calculateProfit())}
                        </div>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)]">
                          Margin:
                        </span>
                        <div
                          className={`font-semibold text-sm ${
                            calculateMargin() >= 0
                              ? "text-[var(--accent-blue)]"
                              : "text-[var(--accent-red)]"
                          }`}
                        >
                          {calculateMargin().toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Note about warehouses */}
              <div className="bg-[var(--accent-blue-light)] border border-[var(--accent-blue)] rounded-md compact-card">
                <p className="text-xs text-[var(--accent-green)]">
                  <strong>Note:</strong> Warehouse stock allocation can be
                  managed after creating the variant.
                  {mode === "edit" &&
                    variant?.stock_locations &&
                    variant.stock_locations.length > 0 && (
                      <span className="block mt-xs">
                        Current stock:{" "}
                        {variant.stock_locations
                          .map(
                            (loc) =>
                              `${loc.warehouse_data.name}: ${loc.quantity}`,
                          )
                          .join(", ")}
                      </span>
                    )}
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-sm mt-6 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={handleCancel}
                className="compact-button border border-[var(--border-color)] rounded-md text-[var(--sidebar-text)] hover:bg-[var(--card-secondary-bg)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="compact-button bg-[var(--accent-blue)] text-[var(--sidebar-text)] rounded-md hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Save className="icon-sm mr-xs" />
                {submitting
                  ? mode === "add"
                    ? "Creating..."
                    : "Updating..."
                  : mode === "add"
                    ? "Create Variant"
                    : "Update Variant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductVariantFormPage;
