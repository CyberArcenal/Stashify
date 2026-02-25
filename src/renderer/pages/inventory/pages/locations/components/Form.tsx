// components/LocationForm.tsx
import React, { useState, useEffect } from "react";
import { WarehouseForm } from "@/renderer/api/warehouse";

interface LocationFormProps {
  mode: "add" | "edit";
  initialData?: WarehouseForm;
  onSubmit: (formData: WarehouseForm) => void;
  onCancel: () => void;
  loading?: boolean;
}

// Type options for the dropdown
const TYPE_OPTIONS = [
  { value: "warehouse", label: "Warehouse" },
  { value: "store", label: "Store" },
  { value: "online", label: "Online Store" },
];

const LocationForm: React.FC<LocationFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<WarehouseForm>({
    name: "",
    type: "warehouse", // Default type
    location: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Prepopulate form when in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData(initialData);
    } else if (mode === "add") {
      // Reset form for add mode
      setFormData({
        name: "",
        type: "warehouse",
        location: "",
        is_active: true,
      });
    }
  }, [mode, initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Mark field as touched
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const validateForm = (): boolean => {
    const validationErrors = [];

    if (!formData.name.trim()) {
      validationErrors.push("Warehouse name is required");
    } else if (formData.name.length > 100) {
      validationErrors.push("Warehouse name cannot exceed 100 characters");
    }

    if (!formData.type) {
      validationErrors.push("Location type is required");
    }

    if (!formData.location.trim()) {
      validationErrors.push("Location is required");
    } else if (formData.location.length > 200) {
      validationErrors.push("Location cannot exceed 200 characters");
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const getFieldError = (field: string): string | null => {
    if (!touched[field]) return null;

    if (field === "name") {
      if (!formData.name.trim()) return "Warehouse name is required";
      if (formData.name.length > 100)
        return "Name cannot exceed 100 characters";
    }

    if (field === "type") {
      if (!formData.type) return "Location type is required";
    }

    if (field === "location") {
      if (!formData.location.trim()) return "Location is required";
      if (formData.location.length > 200)
        return "Location cannot exceed 200 characters";
    }

    return null;
  };

  const isFieldInvalid = (field: string): boolean => {
    return touched[field] && !!getFieldError(field);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Global Form Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-[var(--accent-red-light)] border border-[var(--danger-color)] rounded-lg">
          <h3 className="text-sm font-medium text-[var(--danger-color)] mb-2">
            Please fix the following errors:
          </h3>
          <ul className="list-disc list-inside text-sm text-[var(--danger-color)] space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Name Field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[var(--sidebar-text)] mb-1"
          >
            Warehouse Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => handleBlur("name")}
            required
            disabled={loading}
            className={`w-full p-2 border rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)] ${
              isFieldInvalid("name")
                ? "border-[var(--danger-color)]"
                : "border-[var(--border-color)]"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder="Enter warehouse name"
          />
          {isFieldInvalid("name") && (
            <p className="mt-1 text-sm text-[var(--danger-color)]">
              {getFieldError("name")}
            </p>
          )}
          <p className="text-xs text-[var(--sidebar-text)] mt-1">
            {formData.name.length}/100 characters
          </p>
        </div>

        {/* Type Field */}
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-[var(--sidebar-text)] mb-1"
          >
            Location Type *
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            onBlur={() => handleBlur("type")}
            required
            disabled={loading}
            className={`w-full p-2 border rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)] ${
              isFieldInvalid("type")
                ? "border-[var(--danger-color)]"
                : "border-[var(--border-color)]"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isFieldInvalid("type") && (
            <p className="mt-1 text-sm text-[var(--danger-color)]">
              {getFieldError("type")}
            </p>
          )}
          <p className="text-xs text-[var(--sidebar-text)] mt-1">
            Select the type of location
          </p>
        </div>

        {/* Location Field */}
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-[var(--sidebar-text)] mb-1"
          >
            Location *
          </label>
          <textarea
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            onBlur={() => handleBlur("location")}
            required
            disabled={loading}
            rows={3}
            className={`w-full p-2 border rounded-md bg-[var(--card-bg)] text-[var(--sidebar-text)] focus:ring-[var(--focus-ring-color)] focus:border-[var(--focus-ring-color)] ${
              isFieldInvalid("location")
                ? "border-[var(--danger-color)]"
                : "border-[var(--border-color)]"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder="Enter warehouse location address"
          />
          {isFieldInvalid("location") && (
            <p className="mt-1 text-sm text-[var(--danger-color)]">
              {getFieldError("location")}
            </p>
          )}
          <p className="text-xs text-[var(--sidebar-text)] mt-1">
            {formData.location.length}/200 characters
          </p>
        </div>

        {/* Status Field */}
        <div className="flex items-center space-x-3 p-4 bg-[var(--card-secondary-bg)] rounded-lg">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              disabled={loading}
              className="w-4 h-4 text-[var(--checkbox-checked)] bg-[var(--card-bg)] border-[var(--checkbox-border)] rounded focus:ring-[var(--focus-ring-color)] focus:ring-2"
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-[var(--sidebar-text)]"
            >
              Active Location
            </label>
            <p className="text-xs text-[var(--sidebar-text)] mt-1">
              {formData.is_active
                ? "This location is active and can receive inventory"
                : "This location is inactive and cannot process inventory"}
            </p>
          </div>
        </div>

        {/* Form Help Text */}
        <div className="p-4 bg-[var(--accent-blue-light)] border border-[var(--accent-blue)] rounded-lg">
          <h4 className="text-sm font-medium text-[var(--accent-emerald)] mb-1">
            About Warehouse Locations
          </h4>
          <p className="text-xs text-[var(--accent-blue)]">
            Warehouses are physical locations where inventory is stored. Each
            warehouse can contain multiple stock items and track their
            quantities separately.
            <br />
            <br />
            <strong>Types:</strong>
            <br />• <strong>Warehouse:</strong> Large storage facilities for
            bulk inventory
            <br />• <strong>Store:</strong> Retail locations with
            customer-facing inventory
            <br />• <strong>Online Store:</strong> Virtual locations for
            e-commerce operations
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-[var(--border-color)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-[var(--border-color)] rounded-md text-[var(--sidebar-text)] bg-[var(--card-bg)] hover:bg-[var(--cancel-button-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-[var(--accent-blue)] hover:bg-[var(--submit-button-hover)] text-[var(--sidebar-text)] rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-[var(--sidebar-text)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {mode === "add" ? "Create Warehouse" : "Update Warehouse"}
        </button>
      </div>
    </form>
  );
};

export default LocationForm;
