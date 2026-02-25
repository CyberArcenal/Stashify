// components/OrderForm/OrderFormCustomerSection.tsx
import React from "react";
import CustomerSelect from "@/renderer/components/Selects/User/CustomerSelect";
import { OrderFormSectionProps } from "@/renderer/api/order";
import { formatCurrency } from "@/renderer/utils/formatters";

const OrderFormCustomerSection: React.FC<OrderFormSectionProps> = ({
  formData,
  errors,
  onFormDataChange,
}) => {
  const handleCustomerSelect = (customer: number) => {
    onFormDataChange({
      ...formData,
      customer: customer,
    });
  };

  const handleNotesChange = (notes: string) => {
    onFormDataChange({
      ...formData,
      notes,
    });
  };

  return (
    <div className="space-y-4">
      <CustomerSelect
        value={formData.customer}
        onChange={(userId, userName, userEmail) => {
          handleCustomerSelect(userId);
        }}
      />

      {/* Financial Summary */}
      {formData.items.length > 0 && (
        <div
          className="compact-stats rounded p-3"
          style={{ backgroundColor: "var(--card-secondary-bg)" }}
        >
          <h3
            className="text-xs font-medium mb-2"
            style={{ color: "var(--sidebar-text)" }}
          >
            Order Summary
          </h3>
          <div className="flex justify-between text-xs">
            <span style={{ color: "var(--sidebar-text)" }}>Subtotal:</span>
            <span className="font-medium">
              ${formatCurrency(formData.subtotal) || "0.00"}
            </span>
          </div>
          <div
            className="flex justify-between text-xs border-t pt-2"
            style={{ borderColor: "var(--border-color)" }}
          >
            <span
              className="font-medium"
              style={{ color: "var(--sidebar-text)" }}
            >
              Total:
            </span>
            <span className="font-bold" style={{ color: "var(--accent-blue)" }}>
              ${formatCurrency(formData.total) || "0.00"}
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--sidebar-text)" }}
        >
          Order Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          className="w-full p-2 text-sm border rounded compact-input focus:border-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
          style={{
            backgroundColor: "var(--input-bg)",
            color: "var(--input-text)",
            borderColor: "var(--border-color)",
          }}
          placeholder="Enter order notes or special instructions"
        />
      </div>
    </div>
  );
};

export default OrderFormCustomerSection;
