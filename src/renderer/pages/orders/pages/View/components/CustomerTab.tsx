// components/order/CustomerTab.tsx
import React from "react";
import { User, History } from "lucide-react";
import { OrderData } from "@/renderer/api/order";

interface CustomerTabProps {
  order: OrderData;
}

const CustomerTab: React.FC<CustomerTabProps> = ({ order }) => {
  const getCustomerDisplayName = (): string => {
    return (
      order.customer_display ||
      order.customer_data?.full_name ||
      order.customer_data?.username ||
      "Unknown Customer"
    );
  };

  const getCustomerEmail = (): string => {
    return order.customer_data?.email || "No email";
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-[var(--sidebar-text)]">
        Customer Information
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-6 border border-[var(--border-color)]">
          <h4 className="text-sm font-medium text-[var(--sidebar-text)] mb-4 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Customer Details
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Full Name
              </label>
              <p className="text-sm text-[var(--sidebar-text)]">
                {getCustomerDisplayName()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Email
              </label>
              <p className="text-sm text-[var(--sidebar-text)]">
                {getCustomerEmail()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Customer ID
              </label>
              <p className="text-sm text-[var(--sidebar-text)]">
                {order.customer || "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-secondary-bg)] rounded-lg p-6 border border-[var(--border-color)]">
          <h4 className="text-sm font-medium text-[var(--sidebar-text)] mb-4 flex items-center">
            <History className="w-4 h-4 mr-2" />
            Customer Actions
          </h4>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] text-[var(--sidebar-text)] rounded-lg text-sm">
              View Customer Profile
            </button>
            <button className="w-full px-4 py-2 bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-[var(--sidebar-text)] rounded-lg text-sm">
              View Order History
            </button>
            <button className="w-full px-4 py-2 border border-[var(--border-color)] text-[var(--sidebar-text)] rounded-lg text-sm hover:bg-[var(--card-secondary-bg)]">
              Send Customer Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerTab;
