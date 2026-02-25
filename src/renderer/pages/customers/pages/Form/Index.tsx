// pages/CustomerFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showInfo, showApiError } from "@/renderer/utils/notification";
import CustomerForm from "./components/Form";
import { userAPI, UserData, UserForm } from "@/renderer/api/user";

const CustomerFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode = id ? "edit" : "add";

  // Fetch customer data for edit mode
  useEffect(() => {
    if (mode === "edit" && id) {
      const fetchCustomer = async () => {
        try {
          setLoading(true);
          setError(null);
          const customerData = await userAPI.findById(parseInt(id));

          if (customerData && customerData.user_type === "customer") {
            setCustomer(customerData);
          } else {
            setError("Customer not found or is not a customer user");
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch customer";
          setError(errorMessage);
          console.error("Error fetching customer:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchCustomer();
    }
  }, [id, mode]);

  const handleSubmit = async (formData: any) => {
    try {
      setLoading(true);

      const userFormData: UserForm = {
        username: formData.email.split("@")[0], // Generate username from email
        email: formData.email,
        first_name: formData.name.split(" ")[0] || "",
        last_name: formData.name.split(" ").slice(1).join(" ") || "",
        phone_number: formData.phone,
        user_type: "customer",
        address: formData.address,
        status: formData.status,
      };

      if (mode === "add") {
        await userAPI.createCustomer(userFormData);
        showInfo("Customer added successfully!");
      } else if (mode === "edit" && id) {
        await userAPI.update(parseInt(id), userFormData);
        showInfo("Customer updated successfully!");
      }

      navigate("/customers");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to ${mode} customer`;
      showApiError(errorMessage);
      console.error(`Error ${mode} customer:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    showInfo("Changes were cancelled");
    navigate("/customers");
  };

  // Show loading state
  if (loading && mode === "edit") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            Loading customer data...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && mode === "edit") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-4">
            Error Loading Customer
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC] mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-[var(--sidebar-text)] rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/customers")}
              className="px-6 py-2 bg-gray-600 text-[var(--sidebar-text)] rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If edit mode and customer not found after loading
  if (mode === "edit" && !customer && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-4">
            Customer Not Found
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC] mb-6">
            The customer with ID "{id}" does not exist.
          </p>
          <button
            onClick={() => navigate("/customers")}
            className="px-6 py-2 bg-blue-600 text-[var(--sidebar-text)] rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  // Convert customer data for form
  const initialFormData = customer
    ? {
        name:
          customer.full_name ||
          `${customer.first_name} ${customer.last_name}`.trim(),
        email: customer.email,
        phone: customer.phone_number || "",
        address:
          customer.addresses_data && customer.addresses_data.length > 0
            ? `${customer.addresses_data[0].street_address}, ${customer.addresses_data[0].city}, ${customer.addresses_data[0].state}, ${customer.addresses_data[0].country} ${customer.addresses_data[0].postal_code}, ${customer.addresses_data[0].description}`
            : "",
        status: customer.status as "active" | "inactive",
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-2">
            {mode === "add" ? "Add New Customer" : "Edit Customer"}
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            {mode === "add"
              ? "Add a new customer to your system"
              : `Editing: ${customer?.full_name || customer?.email}`}
          </p>
        </div>

        {/* Customer Form */}
        <CustomerForm
          mode={mode}
          initialData={initialFormData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default CustomerFormPage;
