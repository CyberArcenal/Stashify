// pages/OrderDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showApiError, showError } from "@/renderer/utils/notification";
import { orderAPI, OrderData } from "@/renderer/api/order";
import OrderDetailView from "./components/OrderDetailView";

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert to number
  const orderId = id ? parseInt(id, 10) : null;

  // Fetch order data from API
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        showError("Invalid order ID");
        navigate("/orders");
        return;
      }

      try {
        setLoading(true);
        const orderData = await orderAPI.findById(orderId);

        if (orderData) {
          setOrder(orderData);
        } else {
          showError("Order not found");
          navigate("/orders");
        }
      } catch (error: any) {
        console.error("Error fetching order:", error);
        showApiError(error.message || "Failed to load order details");
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-[#9ED9EC]">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  // If order not found
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#9ED9EC] mb-4">
            Order Not Found
          </h1>
          <p className="text-gray-600 dark:text-[#9ED9EC]">
            The order with ID "{id}" does not exist.
          </p>
          <button
            onClick={() => navigate("/orders")}
            className="mt-4 px-4 py-2 bg-blue-600 text-[var(--sidebar-text)] rounded-lg hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  // Render the OrderDetailView with the fetched order
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a2f3c] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <OrderDetailView order={order} />
      </div>
    </div>
  );
};

export default OrderDetailPage;
