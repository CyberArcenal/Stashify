import React, { useState, useEffect } from "react";
import OrderFormCustomerSection from "./OrderFormCustomerSection";
import OrderFormItemsSection from "./OrderFormItemsSection";
import OrderFormActions from "./OrderFormActions";
import { OrderFormData, OrderFormProps } from "@/renderer/api/order";
import OrderFormHeader from "./OrderItemHeader";

const OrderForm: React.FC<OrderFormProps> = ({
  mode = "add",
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<OrderFormData>({
    customer: 0,
    items: [],
    status: "pending",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof OrderFormData, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with initialData when in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
        items: initialData.items || [],
      }));
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation and submission logic here
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
      </div>
    );
  }

  return (
    <div
      className="compact-card"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      <OrderFormHeader mode={mode} onCancel={onCancel} />

      <form onSubmit={handleSubmit} className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OrderFormCustomerSection
            formData={formData}
            errors={errors}
            onFormDataChange={setFormData}
            onErrorsChange={setErrors}
          />

          <OrderFormItemsSection
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            onFormDataChange={setFormData}
            onErrorsChange={setErrors}
          />
        </div>

        <OrderFormActions
          mode={mode}
          isSubmitting={isSubmitting}
          onCancel={onCancel}
        />
      </form>
    </div>
  );
};

export default OrderForm;
