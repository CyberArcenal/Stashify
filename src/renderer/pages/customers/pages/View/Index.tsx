// pages/CustomerDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerDetailView from "./components/View";
import { userAPI, UserData } from "@/renderer/api/user";

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const customerId = parseInt(id);

        // Try to fetch by ID first
        const userData = await userAPI.findById(customerId);

        if (userData) {
          setCustomer(userData);
        } else {
          setError("Customer not found");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch customer");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            Loading customer details...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-4">
            Customer Not Found
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC] mb-6">
            {error ||
              `The customer with ID "${id}" does not exist or cannot be found.`}
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-2">
            Customer Details
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            Viewing customer information for {customer.full_name}
          </p>
        </div>

        {/* Customer Detail View Component */}
        <CustomerDetailView customer={customer} />
      </div>
    </div>
  );
};

export default CustomerDetailPage;
