// components/ProductForm.tsx
import React, { useState, useEffect } from "react";
import {
  Save,
  X,
  Package,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  Upload,
  Trash2,
  Percent,
} from "lucide-react";
import {
  ProductForm as ProductFormData,
  ProductData,
} from "@/renderer/api/product";
import { TaxSettings } from "@/renderer/api/systemSettings";
import { computePrices } from "@/renderer/utils/tax";
import { formatCurrency } from "@/renderer/utils/formatters";

interface ProductFormProps {
  mode: "add" | "edit";
  initialData?: Partial<ProductFormData>;
  categories: any[];
  taxSettings?: TaxSettings | null;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  mode = "add",
  initialData,
  categories,
  taxSettings,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    category: null,
    net_price: "",
    compare_price: null,
    cost_per_item: null,
    sku: "",
    barcode: "",
    image: null,
    weight: null,
    dimensions: null,
    is_published: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Example usage:
  const { netPrice, vatRate, vatAmount, grossPrice, displayPrice } =
    computePrices({
      formData: { net_price: formData.net_price ?? 0 },
      taxSettings: {
        vat_rate: taxSettings?.vat_rate ?? 12,
        display_prices: taxSettings?.prices_include_tax
          ? "incl_tax"
          : "excl_tax",
      },
    });

  // Initialize form with initialData
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        category: initialData.category || null,
        net_price: initialData.net_price || "",
        compare_price: initialData.compare_price || null,
        cost_per_item: initialData.cost_per_item || null,
      }));

      // Set image preview if image exists
      if (initialData.image) {
        // For existing images, you might have a URL
        if (typeof initialData.image === "string") {
          setImagePreview(initialData.image);
        }
      }
    }
  }, [initialData]);

  const handleInputChange = (
    field: keyof ProductFormData,
    value: string | boolean | number | null,
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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Please select an image file (JPEG, PNG, etc.)",
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be less than 5MB" }));
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Clear any previous errors
    if (errors.image) {
      setErrors((prev) => ({ ...prev, image: "" }));
    }

    // Set image file in form data
    setFormData((prev) => ({
      ...prev,
      image: file,
    }));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({
      ...prev,
      image: null,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

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

    setIsSubmitting(true);

    try {
      // Prepare data for submission
      const submissionData: ProductFormData = {
        ...formData,
        net_price: formData.net_price || "0.00",
        compare_price: formData.compare_price || null,
        cost_per_item: formData.cost_per_item || null,
        category: formData.category || null,
      };

      if (onSubmit) {
        await onSubmit(submissionData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProfit = () => {
    const price = parseFloat(formData.net_price) || 0;
    const cost = parseFloat(formData.cost_per_item || "0") || 0;
    return price - cost;
  };

  const calculateMargin = () => {
    const price = parseFloat(formData.net_price) || 0;
    const cost = parseFloat(formData.cost_per_item || "0") || 0;
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  return (
    <div
      className="compact-card"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Form Header */}
      <div
        style={{ borderBottomColor: "var(--border-color)" }}
        className="px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package
              className="w-5 h-5 mr-2"
              style={{ color: "var(--sidebar-text)" }}
            />
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--sidebar-text)" }}
            >
              {mode === "add" ? "Add New Product" : "Edit Product"}
            </h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 rounded hover:bg-[var(--card-secondary-bg)]"
              style={{ color: "var(--sidebar-text)" }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Basic Information */}
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full p-2 text-sm border rounded-md compact-input ${
                  errors.name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                }`}
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                }}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full p-2 text-sm border rounded-md compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--border-color)",
                }}
                placeholder="Enter product description"
              />
            </div>

            {/* Category */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Category
              </label>
              <select
                value={formData.category || ""}
                onChange={(e) =>
                  handleInputChange(
                    "category",
                    e.target.value ? parseInt(e.target.value) : null,
                  )
                }
                className="w-full p-2 text-sm border rounded-md compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--border-color)",
                }}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                SKU
              </label>
              <input
                type="text"
                value={formData.sku || ""}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                className="w-full p-2 text-sm border rounded-md compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--border-color)",
                }}
                placeholder="Enter SKU"
              />
            </div>

            {/* Barcode */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Barcode
              </label>
              <input
                type="text"
                value={formData.barcode || ""}
                onChange={(e) => handleInputChange("barcode", e.target.value)}
                className="w-full p-2 text-sm border rounded-md compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                style={{
                  backgroundColor: "var(--input-bg)",
                  color: "var(--input-text)",
                  borderColor: "var(--border-color)",
                }}
                placeholder="Enter barcode"
              />
            </div>

            {/* Status */}
            <div>
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                Status
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() =>
                    handleInputChange("is_published", !formData.is_published)
                  }
                  className="relative inline-flex items-center cursor-pointer"
                >
                  {formData.is_published ? (
                    <ToggleRight className="w-10 h-10 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
                <span
                  className="ml-2 text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {formData.is_published ? "Published" : "Unpublished"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Pricing & Additional Information */}
          <div className="space-y-4">
            {/* Pricing Section */}
            <div
              className="compact-stats rounded-md p-3"
              style={{ backgroundColor: "var(--card-secondary-bg)" }}
            >
              <h3
                className="text-xs font-medium mb-2 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Pricing Information
              </h3>

              <div className="space-y-2">
                {/* Cost */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Cost
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_per_item || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "cost_per_item",
                          e.target.value || null,
                        )
                      }
                      className={`w-full pl-6 pr-2 py-2 text-sm border rounded-md compact-input ${
                        errors.cost_per_item
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                      }`}
                      style={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--input-text)",
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.cost_per_item && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.cost_per_item}
                    </p>
                  )}
                </div>

                {/* Net Price */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Net Price (Before VAT) *
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
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
                      className={`w-full pl-6 pr-2 py-2 text-sm border rounded-md compact-input ${
                        errors.net_price
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                      }`}
                      style={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--input-text)",
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.net_price && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.net_price}
                    </p>
                  )}
                </div>

                {/* Computed Price Details */}
                {formData.net_price && (
                  <div
                    className="mt-3 p-3 rounded border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <h4
                      className="text-xs font-medium mb-2"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Computed Price Details
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span style={{ color: "var(--sidebar-text)" }}>
                          VAT Amount ({vatRate}%):
                        </span>
                        <span
                          className="font-medium"
                          style={{ color: "var(--accent-blue)" }}
                        >
                          {formatCurrency(vatAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Gross Price:
                        </span>
                        <span
                          className="font-medium"
                          style={{ color: "var(--accent-green)" }}
                        >
                          {formatCurrency(grossPrice)}
                        </span>
                      </div>
                      <div
                        className="flex justify-between items-center pt-2 border-t"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <span
                          className="font-medium"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Display Price:
                        </span>
                        <span
                          className="font-bold text-lg"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {formatCurrency(displayPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* VAT Display */}
                {taxSettings?.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label
                          className="block text-xs font-medium mb-1 flex items-center"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          <Percent className="w-3 h-3 mr-1" />
                          VAT ({(vatRate * 100).toFixed(0)}%)
                        </label>
                        <div
                          className="p-2 rounded border font-medium"
                          style={{
                            backgroundColor: "var(--accent-blue-light)",
                            borderColor: "var(--accent-blue)",
                            color: "var(--accent-emerald)",
                          }}
                        >
                          {formatCurrency(vatAmount)}
                        </div>
                      </div>
                      <div>
                        <label
                          className="block text-xs font-medium mb-1"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Gross Price
                        </label>
                        <div
                          className="p-2 rounded border font-medium"
                          style={{
                            backgroundColor: "var(--accent-green-light)",
                            borderColor: "var(--accent-green)",
                            color: "var(--accent-green)",
                          }}
                        >
                          {formatCurrency(grossPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Display Price Info */}
                    <div
                      className="p-2 rounded border"
                      style={{
                        backgroundColor: "var(--accent-orange-light)",
                        borderColor: "var(--accent-orange)",
                      }}
                    >
                      <div
                        className="text-xs"
                        style={{ color: "var(--accent-orange)" }}
                      >
                        <div className="font-medium">Display Price:</div>
                        <div className="flex justify-between items-center mt-1">
                          <span>Customer will see:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(displayPrice)}
                          </span>
                        </div>
                        <div className="text-xs mt-1">
                          (
                          {taxSettings?.prices_include_tax
                            ? "Including"
                            : "Excluding"}{" "}
                          VAT)
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Profit Calculation */}
                {(formData.cost_per_item || formData.net_price) && (
                  <div
                    className="mt-2 p-2 rounded border"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Profit:
                        </span>
                        <div
                          className={`font-semibold text-sm ${
                            calculateProfit() >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(calculateProfit())}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: "var(--sidebar-text)" }}>
                          Margin:
                        </span>
                        <div
                          className={`font-semibold text-sm ${
                            calculateMargin() >= 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          {calculateMargin().toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Product Image
              </label>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-full h-32 object-cover rounded-md border"
                    style={{ borderColor: "var(--border-color)" }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 text-[var(--sidebar-text)] rounded-full p-1 hover:bg-red-600"
                    style={{ backgroundColor: "var(--danger-color)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                      <div className="text-[var(--sidebar-text)] text-xs">
                        Uploading...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="border border-dashed rounded-md p-4"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="product-image"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="product-image"
                    className={`cursor-pointer flex flex-col items-center justify-center text-center ${
                      isUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Upload
                      className="w-6 h-6 mb-1"
                      style={{ color: "var(--sidebar-text)" }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {isUploading
                        ? "Uploading..."
                        : "Click to upload product image"}
                    </span>
                    <span
                      className="text-xs mt-1"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      PNG, JPG, JPEG up to 5MB
                    </span>
                  </label>
                </div>
              )}
              {errors.image && (
                <p className="mt-1 text-xs text-red-600">{errors.image}</p>
              )}
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-2 gap-2">
              {/* Weight */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Weight
                </label>
                <input
                  type="text"
                  value={formData.weight || ""}
                  onChange={(e) =>
                    handleInputChange("weight", e.target.value || null)
                  }
                  className="w-full p-2 text-sm border rounded-md compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    color: "var(--input-text)",
                    borderColor: "var(--border-color)",
                  }}
                  placeholder="e.g., 0.5kg"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Dimensions
                </label>
                <input
                  type="text"
                  value={formData.dimensions || ""}
                  onChange={(e) =>
                    handleInputChange("dimensions", e.target.value || null)
                  }
                  className="w-full p-2 text-sm border rounded-md compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    color: "var(--input-text)",
                    borderColor: "var(--border-color)",
                  }}
                  placeholder="e.g., 10x5x2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div
          className="flex justify-end space-x-2 mt-6 pt-4 border-t"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-md text-sm compact-button hover:bg-[var(--cancel-button-hover)]"
            style={{
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-4 py-2 text-[var(--sidebar-text)] rounded-md hover:bg-[var(--submit-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm compact-button"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            <Save className="w-3 h-3 mr-1" />
            {isSubmitting
              ? "Saving..."
              : mode === "add"
                ? "Add Product"
                : "Update Product"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
