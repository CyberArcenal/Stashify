// pages/OrderFormPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import OrderForm from './components/Form';
import { orderAPI, OrderData, OrderWithItemsForm } from "@/renderer/api/order";
import { dialogs, showAlert } from "@/renderer/utils/dialogs";
import {
  hideLoading,
  showApiError,
  showError,
  showLoading,
} from "@/renderer/utils/notification";
import OrderForm from "./components/OrderForm";
// import OrderForm from './components/Form';

const OrderFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  const mode = id ? "edit" : "add";

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);

      if (mode === "edit" && id) {
        try {
          // console.log('Fetching order data for ID:', id);
          const orderData = await orderAPI.findById(parseInt(id));
          // console.log('Fetched order data:', orderData);

          if (orderData) {
            setOrder(orderData);

            // Gamitin ang existing items_data kung available, kung hindi, mag-fetch separately
            let orderItems = orderData.items_data || [];

            // Kung wala sa order data, mag-fetch ng separate
            if (!orderItems || orderItems.length === 0) {
              // console.log('No items data in order, fetching separately...');
              const { orderItemAPI } = await import("@/renderer/api/orderItem");
              const fetchedItems = await orderItemAPI.getByOrder(parseInt(id));
              // console.log('Fetched separate items:', fetchedItems);
              orderItems = fetchedItems.map((item) => ({
                id: item.id,
                product: item.product_data?.id || 0,
                variant: item.variant_data?.id || null,
                quantity: item.quantity,
                price: parseFloat(item.price).toString(),
                total: parseFloat(item.total).toString(),
                product_name: item.product_data?.name || "N/A",
                variant_name: item.variant_data?.name || "N/A",
              }));
            }

            // console.log('Final order items:', orderItems);

            setInitialFormData({
              customer: orderData.customer_data?.id || 0,
              status: orderData.status,
              notes: orderData.notes,
              subtotal: parseFloat(orderData.subtotal),
              total: parseFloat(orderData.total),
              items: orderItems.map((item) => ({
                id: item.id,
                productId: item.product,
                productName: item.product_name || "Unknown Product",
                variantId: item.variant,
                variantName: item.variant_name || "",
                quantity: item.quantity,
                unitPrice: parseFloat(item.price),
                total: parseFloat(item.total),
              })),
            });
          }
        } catch (error) {
          console.error("Error fetching order:", error);
          showError("Failed to load order data");
        }
      } else {
        // Add mode - set empty initial data
        // console.log('Add mode - setting empty initial data');
        setInitialFormData({
          customer: 0,
          status: "pending",
          items: [],
          subtotal: 0,
          total: 0,
          notes: "",
        });
      }

      setLoading(false);
    };

    fetchOrder();
  }, [id, mode]);

  const [initialFormData, setInitialFormData] = useState<any>(null);

  const handleSubmit = async (formData: any) => {
    const confirm = await dialogs.confirm({
      message:
        mode === "edit"
          ? "Are you sure you want to update this order?"
          : "Are you sure you want to create this order?",
      title: mode === "edit" ? "Confirm Update" : "Confirm Creation",
    });
    if (!confirm) return;
    try {
      // console.log('handleSubmit called with formData:', formData);
      showLoading("Submitting orders..");

      // Prepare order items data with warehouse and variant information
      const orderItems = formData.items.map((item: any) => {
        const orderItem = {
          product: item.productId,
          variant: item.variantId || null, // Include variant ID
          quantity: item.quantity,
          warehouse: item.warehouseId || null, // Include warehouse ID
        };
        // console.log('Order item prepared:', orderItem);
        return orderItem;
      });

      // Prepare order with items data
      const orderWithItems: OrderWithItemsForm = {
        customer: formData.customer,
        notes: formData.notes,
        items: orderItems,
      };

      // console.log('Submitting order with items:', orderWithItems);

      if (mode === "add") {
        const result = await orderAPI.createWithItems(orderWithItems);
        // console.log('Order created successfully');
        showAlert({
          title: "Success",
          message: "Order created successfully",
          buttonText: "Okay",
          icon: "success",
        });
        navigate("/orders");
      } else if (mode === "edit" && id) {
        const result = await orderAPI.updateWithItems(
          parseInt(id),
          orderWithItems,
        );
        // console.log('Order updated successfully:', result);
        showAlert({
          title: "Success",
          message: "Order updated successfully",
          buttonText: "Okay",
          icon: "success",
        });
        navigate("/orders");
      }
    } catch (error: any) {
      console.error("Error saving order:", error);

      // Check if it's a stock-related error
      if (
        error.message?.includes("stock") ||
        error.message?.includes("inventory")
      ) {
        showError(
          "Insufficient stock in selected warehouse. Please adjust quantities or select a different warehouse.",
        );
      } else {
        showApiError(error.message || "Failed to save order");
      }
    } finally {
      hideLoading();
    }
  };

  const handleCancel = () => {
    // console.log('Order creation/editing cancelled');
    navigate("/orders");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (mode === "edit" && !order) {
    return (
      <div className="bg-white dark:bg-[#253F4E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#9ED9EC] mb-2">
            Order Not Found
          </h2>
          <p className="text-gray-500 dark:text-[#9ED9EC] mb-6">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/orders")}
            className="bg-blue-600 hover:bg-blue-700 text-[var(--sidebar-text)] px-6 py-3 rounded-lg"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  // console.log('Rendering OrderForm with initialData:', initialFormData);

  return (
    <div className="container mx-auto px-4 py-6">
      <OrderForm
        mode={mode}
        initialData={initialFormData}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default OrderFormPage;
