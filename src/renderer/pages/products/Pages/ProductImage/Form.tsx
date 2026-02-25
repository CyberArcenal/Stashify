// pages/ProductImageFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  X,
  Upload,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import {
  showError,
  showSuccess,
  showInfo,
  showApiError,
} from "@/renderer/utils/notification";
import {
  productImageAPI,
  ProductImageForm,
  ProductImageData,
} from "@/renderer/api/productImage";

import { auditLogAPI } from "@/renderer/api/auditLog";
import productAPI, { ProductData } from "@/renderer/api/product";

const ProductImageFormPage: React.FC = () => {
  const { productId, imageId } = useParams<{
    productId: string;
    imageId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [image, setImage] = useState<ProductImageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    image: File | null;
    alt_text: string;
    is_primary: boolean;
    sort_order: number;
  }>({
    image: null,
    alt_text: "",
    is_primary: false,
    sort_order: 0,
  });

  const [imagePreview, setImagePreview] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mode = imageId ? "edit" : "add";
  const parsedProductId = productId ? parseInt(productId, 10) : null;
  const parsedImageId = imageId ? parseInt(imageId, 10) : null;

  // Fetch product and image data
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

        // Fetch image data if in edit mode
        if (mode === "edit" && parsedImageId) {
          const imageData = await productImageAPI.findById(parsedImageId);
          if (!imageData) {
            showError("Product image not found");
            navigate(`/products/view/${parsedProductId}`);
            return;
          }
          setImage(imageData);

          // Pre-fill form with existing data
          setFormData({
            image: null, // Don't pre-fill image file
            alt_text: imageData.alt_text || "",
            is_primary: imageData.is_primary,
            sort_order: imageData.sort_order,
          });

          // Set image preview
          if (imageData.image_url) {
            setImagePreview(imageData.image_url);
          }
        } else {
          // For add mode, set default sort_order
          const productImages =
            await productImageAPI.getByProduct(parsedProductId);
          setFormData((prev) => ({
            ...prev,
            sort_order: productImages.length,
          }));
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
  }, [parsedProductId, parsedImageId, mode, navigate]);

  const handleInputChange = (
    field: string,
    value: string | boolean | number,
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        image: "Please select an image file (JPEG, PNG, GIF, etc.)",
      }));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be less than 10MB" }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

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
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
    }));
    setImagePreview("");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // In add mode, image is required
    if (mode === "add" && !formData.image && !imagePreview) {
      newErrors.image = "Image is required";
    }

    // Validate sort_order is not negative
    if (formData.sort_order < 0) {
      newErrors.sort_order = "Order cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!parsedProductId) {
      showError("Product ID is required");
      return;
    }

    try {
      setSubmitting(true);

      const submissionData: ProductImageForm = {
        product: parsedProductId,
        image: formData.image!, // We've validated this exists in add mode
        alt_text: formData.alt_text || undefined,
        is_primary: formData.is_primary,
        sort_order: formData.sort_order,
      };

      let result: ProductImageData;
      let auditAction: string;

      if (mode === "add") {
        result = await productImageAPI.create(submissionData);
        auditAction = "created_image";
        showSuccess("Product image added successfully!");
      } else {
        if (!parsedImageId) {
          throw new Error("Image ID is required for editing");
        }

        // For edit mode, we need to handle the update differently since the API might not accept image file in PATCH
        if (formData.image) {
          // If a new image is provided, update with the new image
          result = await productImageAPI.update(parsedImageId, {
            ...submissionData,
            image: formData.image,
          });
        } else {
          // If no new image, update only the other fields
          result = await productImageAPI.update(parsedImageId, {
            alt_text: submissionData.alt_text,
            is_primary: submissionData.is_primary,
            sort_order: submissionData.sort_order,
          });
        }
        auditAction = "updated_image";
        showSuccess("Product image updated successfully!");
      }

      // Log action in audit log
      try {
        if (mode === "add") {
          await auditLogAPI.logCreateAction(
            1, // Current user ID
            "ProductImage",
            result.id.toString(),
            {
              action: "created_image",
              product_id: parsedProductId,
              image_data: result,
            },
            undefined, // IP address - you might get this from your auth context
          );
        } else {
          await auditLogAPI.logUpdateAction(
            1, // Current user ID
            "ProductImage",
            result.id.toString(),
            {
              action: "updated_image",
              product_id: parsedProductId,
              previous_data: image,
              new_data: result,
            },
            undefined, // IP address
          );
        }
      } catch (auditError) {
        console.warn("Failed to log audit trail:", auditError);
      }

      // Navigate back to product detail page
      navigate(`/products/view/${parsedProductId}`);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      showApiError(
        error.message ||
          `Failed to ${mode === "add" ? "add" : "update"} product image`,
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
          <p className="mt-4 text-sm" style={{ color: "var(--sidebar-text)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <h1
            className="text-xl font-bold mb-4"
            style={{ color: "var(--sidebar-text)" }}
          >
            Product Not Found
          </h1>
          <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            The product does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-4"
      style={{ backgroundColor: "var(--background-color)" }}
    >
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center mb-3 transition-colors duration-200 text-sm font-medium compact-button"
            style={{ color: "var(--accent-blue)" }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Product
          </button>

          <div
            className="compact-card"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {mode === "add" ? "Add Product Image" : "Edit Product Image"}
                </h1>
                <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                  {mode === "add"
                    ? `Add a new image to "${product.name}"`
                    : `Edit image for "${product.name}"`}
                </p>
              </div>
              <div
                className="rounded p-2"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                <div className="flex items-center space-x-2">
                  {product.primary_image_url && (
                    <img
                      src={product.primary_image_url}
                      alt={product.name}
                      className="w-8 h-8 object-cover rounded border"
                      style={{ borderColor: "var(--border-color)" }}
                    />
                  )}
                  <div className="min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {product.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      SKU: {product.sku}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
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
            <div className="flex items-center">
              <ImageIcon
                className="w-4 h-4 mr-2"
                style={{ color: "var(--sidebar-text)" }}
              />
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--sidebar-text)" }}
              >
                {mode === "add" ? "Upload New Image" : "Edit Image Details"}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              {/* Image Upload Section */}
              <div
                className="compact-stats rounded p-3"
                style={{ backgroundColor: "var(--card-secondary-bg)" }}
              >
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Product Image{" "}
                  {mode === "add" && (
                    <span style={{ color: "var(--danger-color)" }}>*</span>
                  )}
                </label>

                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="max-w-xs h-48 object-contain rounded border"
                        style={{
                          borderColor: "var(--border-color)",
                          backgroundColor: "var(--input-bg)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 text-[var(--sidebar-text)] rounded-full p-1 transition-colors duration-200"
                        style={{ backgroundColor: "var(--danger-color)" }}
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Image preview. Click the trash icon to remove and upload a
                      different image.
                    </p>
                  </div>
                ) : (
                  <div
                    className="border border-dashed rounded p-4 text-center transition-colors duration-200"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="product-image"
                    />
                    <label
                      htmlFor="product-image"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <div
                        className="rounded p-2 mb-2"
                        style={{ backgroundColor: "var(--accent-blue-light)" }}
                      >
                        <Upload
                          className="w-4 h-4"
                          style={{ color: "var(--accent-blue)" }}
                        />
                      </div>
                      <div className="space-y-1">
                        <span
                          className="block text-xs font-medium"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          Click to upload product image
                        </span>
                        <span
                          className="block text-xs"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          PNG, JPG, JPEG, GIF up to 10MB
                        </span>
                      </div>
                      <div className="mt-2">
                        <span
                          className="inline-flex items-center px-3 py-1 border rounded text-xs font-medium transition-colors duration-200"
                          style={{
                            backgroundColor: "var(--card-bg)",
                            borderColor: "var(--border-color)",
                            color: "var(--sidebar-text)",
                          }}
                        >
                          Choose File
                        </span>
                      </div>
                    </label>
                  </div>
                )}
                {errors.image && (
                  <div
                    className="mt-2 p-2 rounded border text-xs"
                    style={{
                      backgroundColor: "var(--accent-red-light)",
                      borderColor: "var(--danger-color)",
                    }}
                  >
                    <p style={{ color: "var(--danger-color)" }}>
                      {errors.image}
                    </p>
                  </div>
                )}
                {mode === "edit" && !formData.image && (
                  <div
                    className="mt-2 p-2 rounded border text-xs"
                    style={{
                      backgroundColor: "var(--accent-blue-light)",
                      borderColor: "var(--accent-blue)",
                    }}
                  >
                    <p style={{ color: "var(--accent-blue)" }}>
                      Leave empty to keep the current image
                    </p>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Alt Text */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Alt Text
                  </label>
                  <div>
                    <input
                      type="text"
                      value={formData.alt_text}
                      onChange={(e) =>
                        handleInputChange("alt_text", e.target.value)
                      }
                      className="w-full p-2 text-sm border rounded compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                      style={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--input-text)",
                        borderColor: "var(--border-color)",
                      }}
                      placeholder="Enter descriptive alt text..."
                    />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Descriptive text for screen readers and SEO optimization
                    </p>
                  </div>
                </div>

                {/* Display Order */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Display Order
                  </label>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={formData.sort_order}
                      onChange={(e) =>
                        handleInputChange(
                          "sort_order",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className={`w-full p-2 text-sm border rounded compact-input ${
                        errors.sort_order
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                          : "border-[var(--border-color)] focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                      }`}
                      style={{
                        backgroundColor: "var(--input-bg)",
                        color: "var(--input-text)",
                      }}
                    />
                    {errors.sort_order && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.sort_order}
                      </p>
                    )}
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Lower numbers appear first in image galleries
                    </p>
                  </div>
                </div>
              </div>

              {/* Is Primary Checkbox */}
              <div
                className="compact-stats rounded p-3"
                style={{ backgroundColor: "var(--card-secondary-bg)" }}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex items-center h-4 mt-0.5">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={formData.is_primary}
                      onChange={(e) =>
                        handleInputChange("is_primary", e.target.checked)
                      }
                      className="w-3 h-3 rounded"
                      style={{
                        color: "var(--accent-blue)",
                        borderColor: "var(--border-color)",
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="is_primary"
                      className="block text-xs font-medium mb-1"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      Set as primary image
                    </label>
                    <p
                      className="text-xs"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      The primary image will be used as the main product
                      thumbnail across the website, in search results, and as
                      the default image for product listings.
                    </p>
                    {formData.is_primary && (
                      <div
                        className="mt-2 p-2 rounded border text-xs"
                        style={{
                          backgroundColor: "var(--accent-orange-light)",
                          borderColor: "var(--accent-orange)",
                        }}
                      >
                        <p style={{ color: "var(--accent-orange)" }}>
                          <strong>Note:</strong> Setting this as primary will
                          replace the current primary image for this product.
                        </p>
                      </div>
                    )}
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
                onClick={handleCancel}
                className="px-4 py-2 border rounded text-sm compact-button hover:bg-[var(--cancel-button-hover)]"
                style={{
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-[var(--sidebar-text)] rounded text-sm compact-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-[var(--submit-button-hover)]"
                style={{ backgroundColor: "var(--accent-blue)" }}
              >
                <Save className="w-3 h-3 mr-1" />
                {submitting
                  ? mode === "add"
                    ? "Adding..."
                    : "Updating..."
                  : mode === "add"
                    ? "Add Image"
                    : "Update Image"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div
          className="mt-4 rounded border p-3 text-xs"
          style={{
            backgroundColor: "var(--accent-blue-light)",
            borderColor: "var(--accent-blue)",
          }}
        >
          <div className="flex items-start space-x-2">
            <ImageIcon
              className="w-3 h-3 mt-0.5"
              style={{ color: "var(--accent-blue)" }}
            />
            <div>
              <h3
                className="font-semibold mb-1"
                style={{ color: "var(--accent-blue)" }}
              >
                Image Guidelines
              </h3>
              <ul
                className="space-y-0.5"
                style={{ color: "var(--accent-blue)" }}
              >
                <li>• Use high-quality images with good lighting</li>
                <li>• Recommended size: 800x800 pixels or larger</li>
                <li>• Supported formats: PNG, JPG, JPEG, GIF</li>
                <li>• Maximum file size: 10MB</li>
                <li>• For best results, use square aspect ratio images</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImageFormPage;
