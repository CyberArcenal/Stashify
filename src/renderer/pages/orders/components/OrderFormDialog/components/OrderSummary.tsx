// src/renderer/pages/sales/components/SalesFormDialog/components/OrderSummary.tsx
import React from "react";
import { formatCurrency } from "../../../../../utils/formatters";

interface OrderSummaryProps {
  itemsCount: number;
  subtotal: number;
  tax_amount: number;
  totalBeforePoints: number;
  usePoints: boolean;
  pointsAmount: number;
  finalTotal: number;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  itemsCount,
  subtotal,
  tax_amount,
  totalBeforePoints,
  usePoints,
  pointsAmount,
  finalTotal,
}) => {
  if (itemsCount === 0) return null;

  return (
    <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md">
      <h3 className="text-sm font-medium mb-2" style={{ color: "var(--sidebar-text)" }}>
        Order Summary
      </h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Subtotal (excl. tax):</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Tax amount:</span>
          <span className="font-medium">{formatCurrency(tax_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-dashed pt-1">
          <span className="font-medium">Total before points:</span>
          <span className="font-bold">{formatCurrency(totalBeforePoints)}</span>
        </div>
        {usePoints && pointsAmount > 0 && (
          <div className="flex justify-between text-[var(--accent-green)]">
            <span>Points discount:</span>
            <span>-{formatCurrency(pointsAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1" style={{ borderColor: "var(--border-color)" }}>
          <span className="font-medium">Total:</span>
          <span className="font-bold text-[var(--accent-green)]">{formatCurrency(finalTotal)}</span>
        </div>
      </div>
    </div>
  );
};