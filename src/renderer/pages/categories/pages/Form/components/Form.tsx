// components/CategoryForm.tsx
import React, { useState, useEffect } from "react";
import {
  categoryAPI,
  CategoryData,
  CategoryForm as CategoryFormType,
} from "@/renderer/api/category";

interface CategoryFormProps {
  mode: "add" | "edit";
  initialData?: CategoryFormType;
  onSubmit: (formData: CategoryFormType) => void;
  onCancel: (formData: CategoryFormType) => void;
  submitting?: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}) => {
  const [formData, setFormData] = useState<CategoryFormType>({
    name: "",
    description: "",
    parent: null,
    color: "#3B82F6",
    is_active: true,
    image: null,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Prepopulate form when in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData(initialData);
    }
  }, [mode, initialData]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await categoryAPI.findAll();
      setCategories(response);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Category name is required";
    } else if (formData.name.length < 2) {
      errors.name = "Category name must be at least 2 characters long";
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = "Description must be less than 500 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setFormErrors((prev) => ({
          ...prev,
          image: "Please select a valid image file",
        }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors((prev) => ({
          ...prev,
          image: "Image size must be less than 5MB",
        }));
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

    // Create preview
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImagePreview(null);
    }

    // Clear image error
    if (formErrors.image) {
      setFormErrors((prev) => ({
        ...prev,
        image: "",
      }));
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
    }));
    setImagePreview(null);

    // Clear the file input
    const fileInput = document.getElementById("image") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const colorOptions = [
    { value: "#3B82F6", label: "Blue" },
    { value: "#10B981", label: "Green" },
    { value: "#F59E0B", label: "Orange" },
    { value: "#EF4444", label: "Red" },
    { value: "#8B5CF6", label: "Purple" },
    { value: "#06B6D4", label: "Cyan" },
    { value: "#EC4899", label: "Pink" },
    { value: "#6366F1", label: "Indigo" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-medium text-[var(--sidebar-text)] mb-1"
          >
            Category Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={initialData?.name}
            onChange={handleChange}
            required
            disabled={submitting}
            className={`w-full compact-input border rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] ${
              formErrors.name
                ? "border-red-500"
                : "border-[var(--border-color)]"
            } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder="Enter category name"
          />
          {formErrors.name && (
            <p className="mt-xs text-xs text-red-600">{formErrors.name}</p>
          )}
        </div>

        {/* Parent Category Field */}
        <div>
          <label
            htmlFor="parent"
            className="block text-xs font-medium text-[var(--sidebar-text)] mb-1"
          >
            Parent Category
          </label>
          <select
            id="parent"
            name="parent"
            value={formData.parent || ""}
            onChange={handleChange}
            disabled={submitting || loadingCategories}
            className={`w-full compact-input border rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] ${
              submitting || loadingCategories
                ? "opacity-50 cursor-not-allowed"
                : ""
            } border-[var(--border-color)]`}
          >
            <option value="">No Parent (Top Level)</option>
            {categories
              .filter((cat) =>
                mode === "edit"
                  ? cat.id !== parseInt((initialData as any)?.id)
                  : true,
              )
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          {loadingCategories && (
            <p className="mt-xs text-xs text-gray-500">Loading categories...</p>
          )}
        </div>
      </div>

      {/* Description Field */}
      <div>
        <label
          htmlFor="description"
          className="block text-xs font-medium text-[var(--sidebar-text)] mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          disabled={submitting}
          className={`w-full compact-input border rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] ${
            formErrors.description
              ? "border-red-500"
              : "border-[var(--border-color)]"
          } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          placeholder="Enter category description (optional)"
        />
        <div className="flex justify-between mt-xs">
          {formErrors.description && (
            <p className="text-xs text-red-600">{formErrors.description}</p>
          )}
          <p className="text-xs text-[var(--text-tertiary)] ml-auto">
            {formData.description?.length || 0}/500 characters
          </p>
        </div>
      </div>

      {/* Image Upload Field */}
      <div>
        <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
          Category Image
        </label>
        <div className="flex items-center gap-sm">
          <div className="flex-1">
            <input
              type="file"
              id="image"
              name="image"
              onChange={handleImageChange}
              accept="image/*"
              disabled={submitting}
              className={`w-full compact-input border rounded bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] ${
                formErrors.image
                  ? "border-red-500"
                  : "border-[var(--border-color)]"
              } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {formErrors.image && (
              <p className="mt-xs text-xs text-red-600">{formErrors.image}</p>
            )}
          </div>
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-md border border-[var(--border-color)]"
              />
              <button
                type="button"
                onClick={removeImage}
                disabled={submitting}
                className="absolute -top-1 -right-1 bg-[var(--danger-color)] text-[var(--sidebar-text)] rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                ×
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-xs">
          Supported formats: JPG, PNG, GIF. Max size: 5MB
        </p>
      </div>

      {/* Color Field */}
      <div>
        <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">
          Color
        </label>
        <div className="flex flex-wrap gap-1">
          {colorOptions.map((color) => (
            <label
              key={color.value}
              className={`flex items-center cursor-pointer transition-transform ${
                submitting ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
              }`}
            >
              <input
                type="radio"
                name="color"
                value={color.value}
                checked={formData.color === color.value}
                onChange={handleChange}
                disabled={submitting}
                className="sr-only"
              />
              <div
                className={`w-6 h-6 rounded-md border-2 transition-all ${
                  formData.color === color.value
                    ? "border-[var(--sidebar-text)] shadow-sm"
                    : "border-[var(--border-color)]"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Active Status Field */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          disabled={submitting}
          className="h-3 w-3 text-[var(--accent-blue)] rounded border-[var(--border-color)] focus:ring-[var(--accent-blue)] disabled:opacity-50"
        />
        <label
          htmlFor="is_active"
          className="ml-2 block text-xs text-[var(--sidebar-text)]"
        >
          Active Category
          <p className="text-xs text-[var(--text-tertiary)] mt-xs">
            {formData.is_active
              ? "Visible to customers and can contain products"
              : "Hidden from customers"}
          </p>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-sm pt-4 border-t border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => {
            onCancel(formData);
          }}
          disabled={submitting}
          className="compact-button border border-[var(--border-color)] rounded text-[var(--sidebar-text)] bg-[var(--card-bg)] hover:bg-[var(--card-secondary-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="compact-button bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {submitting && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          )}
          {mode === "add" ? "Create Category" : "Update Category"}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
