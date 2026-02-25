// components/SupplierForm.tsx
import React, { useState, useEffect } from "react";
import {
  Save,
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  Activity,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";
import { SupplierForm as SupplierFormType } from "@/renderer/api/supplier";

// Types
interface SupplierFormProps {
  mode: "add" | "edit";
  initialData?: Partial<SupplierFormType>;
  onSubmit: (data: SupplierFormType) => void;
  onCancel: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({
  mode = "add",
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<SupplierFormType>({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    notes: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof SupplierFormType, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Set<keyof SupplierFormType>>(
    new Set(),
  );

  // Initialize form with initialData when in edit mode or when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));
    }
  }, [initialData]);

  const handleInputChange = (field: keyof SupplierFormType, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Mark field as touched
    setTouched((prev) => new Set(prev).add(field));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleBlur = (field: keyof SupplierFormType) => {
    setTouched((prev) => new Set(prev).add(field));
    validateField(field, formData[field]);
  };

  const validateField = (field: keyof SupplierFormType, value: any): string => {
    switch (field) {
      case "name":
        if (!value || !value.trim()) return "Supplier name is required";
        if (value.length > 255)
          return "Supplier name cannot exceed 255 characters";
        return "";

      case "email":
        if (
          value &&
          value.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          return "Please enter a valid email address";
        }
        return "";

      case "phone":
        if (value && value.length > 50)
          return "Phone number cannot exceed 50 characters";
        return "";

      case "tax_id":
        if (value && value.length > 100)
          return "Tax ID cannot exceed 100 characters";
        return "";

      default:
        return "";
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SupplierFormType, string>> = {};

    // Required fields validation
    if (!formData.name.trim()) {
      newErrors.name = "Supplier name is required";
    }

    // Field-specific validations
    const fields: (keyof SupplierFormType)[] = [
      "name",
      "email",
      "phone",
      "tax_id",
    ];
    fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched for validation
    const allFields: (keyof SupplierFormType)[] = [
      "name",
      "contact_person",
      "email",
      "phone",
      "address",
      "tax_id",
      "notes",
    ];
    setTouched(new Set(allFields));

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasError = (field: keyof SupplierFormType): boolean => {
    return touched.has(field) && !!errors[field];
  };

  return (
    <div
      className="rounded-xl shadow-sm border overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Form Header */}
      <div
        className="border-b px-6 py-4"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Building
              className="w-6 h-6 mr-3"
              style={{ color: "var(--sidebar-text)" }}
            />
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--sidebar-text)" }}
            >
              {mode === "add" ? "Add New Supplier" : "Edit Supplier"}
            </h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: "var(--sidebar-text)",
                backgroundColor: "var(--card-bg)",
              }}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Information */}
          <div className="space-y-6">
            <h3
              className="text-lg font-medium border-b pb-2"
              style={{
                color: "var(--sidebar-text)",
                borderColor: "var(--border-color)",
              }}
            >
              Basic Information
            </h3>

            {/* Supplier Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Supplier Name *
              </label>
              <div className="relative">
                <Building
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 ${
                    hasError("name")
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                  }}
                  placeholder="Enter supplier company name"
                />
              </div>
              {hasError("name") && (
                <p
                  className="mt-1 text-sm flex items-center"
                  style={{ color: "var(--accent-red)" }}
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label
                htmlFor="contact_person"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Contact Person
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <input
                  id="contact_person"
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) =>
                    handleInputChange("contact_person", e.target.value)
                  }
                  onBlur={() => handleBlur("contact_person")}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                  placeholder="Primary contact person name"
                />
              </div>
            </div>

            {/* Tax ID */}
            <div>
              <label
                htmlFor="tax_id"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Tax ID / Business Number
              </label>
              <div className="relative">
                <FileText
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <input
                  id="tax_id"
                  type="text"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange("tax_id", e.target.value)}
                  onBlur={() => handleBlur("tax_id")}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 ${
                    hasError("tax_id")
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                  }}
                  placeholder="Tax identification number"
                />
              </div>
              {hasError("tax_id") && (
                <p
                  className="mt-1 text-sm flex items-center"
                  style={{ color: "var(--accent-red)" }}
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.tax_id}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Status
              </label>
              <div className="relative">
                <Activity
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <select
                  id="status"
                  value={formData.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    handleInputChange("is_active", e.target.value === "active")
                  }
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--sidebar-text)" }}
              >
                Active suppliers can be selected for purchase orders and
                transactions.
              </p>
            </div>
          </div>

          {/* Right Column - Contact Information */}
          <div className="space-y-6">
            <h3
              className="text-lg font-medium border-b pb-2"
              style={{
                color: "var(--sidebar-text)",
                borderColor: "var(--border-color)",
              }}
            >
              Contact Information
            </h3>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 ${
                    hasError("email")
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                  }}
                  placeholder="supplier@company.com"
                />
              </div>
              {hasError("email") && (
                <p
                  className="mt-1 text-sm flex items-center"
                  style={{ color: "var(--accent-red)" }}
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 ${
                    hasError("phone")
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                  }}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              {hasError("phone") && (
                <p
                  className="mt-1 text-sm flex items-center"
                  style={{ color: "var(--accent-red)" }}
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Business Address
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-3 top-3 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  onBlur={() => handleBlur("address")}
                  rows={4}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                  placeholder="Enter complete business address"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--sidebar-text)" }}
              >
                Notes & Additional Information
              </label>
              <div className="relative">
                <FileText
                  className="absolute left-3 top-3 w-4 h-4"
                  style={{ color: "var(--default-color)" }}
                />
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  onBlur={() => handleBlur("notes")}
                  rows={3}
                  className="w-full pl-10 pr-3 py-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    color: "var(--sidebar-text)",
                    borderColor: "var(--border-color)",
                  }}
                  placeholder="Any additional notes or information about this supplier..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div
          className="flex justify-end space-x-3 mt-8 pt-6 border-t"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border rounded-lg transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--border-color)",
              color: "var(--sidebar-text)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 text-[var(--sidebar-text)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting
              ? "Saving..."
              : mode === "add"
                ? "Create Supplier"
                : "Update Supplier"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;
