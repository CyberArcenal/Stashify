// components/order/OrderDetailView.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  showInfo,
  showError,
  showSuccess,
  showApiError,
} from "@/renderer/utils/notification";
import { orderAPI, OrderData } from "@/renderer/api/order";
import OverviewTab from "./OverviewTab";
import OrderItemsTab from "./OrderItemTab";
import CustomerTab from "./CustomerTab";
import ActivityTab from "./ActivityTab";
import OrderHeader from "./OrderHeader";
import OrderTabs from "./OrderTabs";

interface OrderDetailViewProps {
  order: OrderData;
}

const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order }) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "items" | "customer" | "audit"
  >("overview");
  const [processing, setProcessing] = useState<number | null>(null);
  const navigate = useNavigate();

  // Action handlers
  const handleEditOrder = () => {
    navigate(`/orders/form/${order.id}`);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setProcessing(order.id);

      const STATUS_TRANSITIONS: { [key: string]: string[] } = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled"],
        completed: ["refunded"],
        cancelled: [],
        refunded: [],
      };

      const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        showError(`Invalid status transition: ${order.status} → ${newStatus}`);
        return;
      }

      const statusLabel = orderAPI.getStatusLabel(newStatus);

      await orderAPI.updateOrderStatus(order.id, newStatus as any);
      showSuccess(`Order status updated to "${statusLabel}"`);

      // Refresh the page
      window.location.reload();
    } catch (err: any) {
      showApiError(err.message || "Failed to update order status");
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessInventory = async () => {
    try {
      setProcessing(order.id);

      if (order.status !== "confirmed") {
        showError(
          'Inventory can only be processed for orders with "confirmed" status.',
        );
        return;
      }

      await orderAPI.markAsProcessed(order.id);
      showSuccess("Inventory processed successfully");

      // Refresh the page
      window.location.reload();
    } catch (err: any) {
      showApiError(err.message || "Failed to process inventory");
    } finally {
      setProcessing(null);
    }
  };

  const handlePrintInvoice = () => {
    showInfo("Print invoice feature coming soon");
  };

  const handleExportOrder = () => {
    try {
      const csvContent = orderAPI.exportOrdersToCSV([order]);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-${order.order_number}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSuccess("Order exported successfully");
    } catch (err: any) {
      showError("Failed to export order");
    }
  };

  const handleSendConfirmation = () => {
    showInfo("Send confirmation email feature coming soon");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            order={order}
            processing={processing}
            onStatusUpdate={handleStatusUpdate}
            onProcessInventory={handleProcessInventory}
          />
        );
      case "items":
        return <OrderItemsTab order={order} />;
      case "customer":
        return <CustomerTab order={order} />;
      case "audit":
        return <ActivityTab orderId={order.id} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)]">
      <OrderHeader
        order={order}
        onPrintInvoice={handlePrintInvoice}
        onExportOrder={handleExportOrder}
        onSendConfirmation={handleSendConfirmation}
        onEditOrder={handleEditOrder}
      />

      <OrderTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="p-6">{renderTabContent()}</div>
    </div>
  );
};

export default OrderDetailView;
