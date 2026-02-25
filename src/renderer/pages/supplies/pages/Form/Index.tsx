// pages/SupplierFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  showInfo,
  showError,
  showApiError,
} from "@/renderer/utils/notification";
import SupplierForm from "./components/Form";
import {
  supplierAPI,
  SupplierData,
  SupplierForm as SupplierFormType,
} from "@/renderer/api/supplier";

const SupplierFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode = id ? "edit" : "add";
  const isEditMode = mode === "edit";

  // Fetch supplier data for edit mode
  useEffect(() => {
    const fetchSupplier = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const supplierData = await supplierAPI.findById(Number(id));

        if (supplierData) {
          setSupplier(supplierData);
        } else {
          setError(`Supplier with ID "${id}" not found`);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load supplier data");
        console.error("Error fetching supplier:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id, isEditMode]);

  const handleSubmit = async (formData: SupplierFormType) => {
    try {
      setError(null);

      if (isEditMode && supplier) {
        // Update existing supplier
        await supplierAPI.update(supplier.id, formData);
        showInfo("Supplier updated successfully!");
      } else {
        // Create new supplier
        await supplierAPI.create(formData);
        showInfo("Supplier created successfully!");
      }

      navigate("/suppliers");
    } catch (err: any) {
      const errorMessage =
        err.message || `Failed to ${isEditMode ? "update" : "create"} supplier`;
      setError(errorMessage);
      showApiError(errorMessage);
      console.error("Error submitting form:", err);
    }
  };

  const handleCancel = () => {
    showInfo("Changes were cancelled");
    navigate("/suppliers");
  };

  // Convert API supplier data to form data
  const getInitialFormData = (): Partial<SupplierFormType> => {
    if (!supplier) return {};

    return {
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      tax_id: supplier.tax_id || "",
      notes: supplier.notes || "",
      is_active: supplier.is_active,
    };
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Loading supplier data...
          </h2>
        </div>
      </div>
    );
  }

  // Error state for supplier not found
  if (isEditMode && !supplier && !loading) {
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
            Supplier Not Found
          </h1>
          <p className="mb-6" style={{ color: "var(--sidebar-text)" }}>
            The supplier with ID "{id}" does not exist or you don't have access
            to it.
          </p>
          <button
            onClick={() => navigate("/suppliers")}
            className="px-6 py-2 text-[var(--sidebar-text)] rounded-lg transition-colors"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            Back to Suppliers
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
        {/* Page Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            {isEditMode ? "Edit Supplier" : "Add New Supplier"}
          </h1>
          <p style={{ color: "var(--sidebar-text)" }}>
            {isEditMode
              ? `Editing: ${supplier?.name}`
              : "Add a new supplier to your system"}
          </p>
          {supplier && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span
                className="px-2 py-1 rounded"
                style={{
                  backgroundColor: "var(--card-secondary-bg)",
                  color: "var(--sidebar-text)",
                }}
              >
                ID: {supplier.id}
              </span>
              <span
                className={`px-2 py-1 rounded ${
                  supplier.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {supplier.is_active ? "Active" : "Inactive"}
              </span>
              {supplier.purchase_count !== undefined && (
                <span
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor: "var(--accent-emerald-light)",
                    color: "var(--accent-emerald)",
                  }}
                >
                  {supplier.purchase_count} purchases
                </span>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-6 p-4 border rounded-lg"
            style={{
              backgroundColor: "var(--accent-red-light)",
              borderColor: "var(--accent-red)",
            }}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: "var(--accent-red)" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3
                  className="text-sm font-medium"
                  style={{ color: "var(--accent-red)" }}
                >
                  Error
                </h3>
                <div
                  className="mt-1 text-sm"
                  style={{ color: "var(--accent-red)" }}
                >
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Form */}
        <SupplierForm
          mode={mode}
          initialData={getInitialFormData()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default SupplierFormPage;
