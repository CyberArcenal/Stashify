// src/renderer/pages/sales/components/SalesFormDialog/components/CustomerSection.tsx
import React from "react";
import CustomerSelect from "../../../../../components/Selects/Customer";
import Button from "../../../../../components/UI/Button";
import { Award } from "lucide-react";

interface CustomerSectionProps {
  mode: string;
  customerId: number | null;
  onCustomerChange: (id: number | null) => void;
  customerBalance: number;
  usePoints: boolean;
  pointsAmount: number;
  totalBeforePoints: number;
  pointsError: string;
  loyaltyPointsEnabled: boolean | undefined;
  onUsePointsChange: (checked: boolean) => void;
  onPointsAmountChange: (amount: number) => void;
  onUseAllPoints: () => void;
}

export const CustomerSection: React.FC<CustomerSectionProps> = ({
  mode,
  customerId,
  onCustomerChange,
  customerBalance,
  usePoints,
  pointsAmount,
  totalBeforePoints,
  pointsError,
  loyaltyPointsEnabled,
  onUsePointsChange,
  onPointsAmountChange,
  onUseAllPoints,
}) => {
  return (
    <>
      <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md space-y-3">
        <h3
          className="text-sm font-medium"
          style={{ color: "var(--sidebar-text)" }}
        >
          Customer Information
        </h3>
        <CustomerSelect
          disabled={mode === "edit"}
          value={customerId}
          onChange={onCustomerChange}
          placeholder="Select customer (optional)"
        />
        {customerId && (
          <div className="text-xs flex items-center gap-1 text-[var(--text-secondary)]">
            <Award className="w-3 h-3" />
            Loyalty points:{" "}
            <span className="font-medium">{customerBalance}</span>
          </div>
        )}
      </div>

      {customerId && customerBalance > 0 && loyaltyPointsEnabled && (
        <div className="bg-[var(--card-secondary-bg)] p-3 rounded-md space-y-2">
          <label
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--sidebar-text)" }}
          >
            <input
              type="checkbox"
              checked={usePoints}
              onChange={(e) => onUsePointsChange(e.target.checked)}
              className="h-4 w-4"
            />
            Use loyalty points
          </label>
          {usePoints && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={Math.min(customerBalance, totalBeforePoints)}
                  value={pointsAmount}
                  onChange={(e) =>
                    onPointsAmountChange(
                      Math.min(
                        Number(e.target.value),
                        customerBalance,
                        totalBeforePoints,
                      ),
                    )
                  }
                  className="compact-input flex-1 border rounded-md"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--sidebar-text)",
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onUseAllPoints}
                >
                  Use All
                </Button>
              </div>
              {pointsError && (
                <p className="text-xs text-red-500">{pointsError}</p>
              )}
              <div className="text-xs text-[var(--text-secondary)]">
                Available: {customerBalance} pts | Max use:{" "}
                {totalBeforePoints.toFixed(0)} pts
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
