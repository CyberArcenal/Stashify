// src/renderer/pages/settings/components/InventorySettingsTab.tsx
import React, { useState } from "react";
import { Package } from "lucide-react";
import type { InventorySettings } from "../../../api/core/system_config";

interface InventorySettingsTabProps {
  settings: InventorySettings;
  onSave: (data: Partial<InventorySettings>) => Promise<void>;
}

const InventorySettingsTab: React.FC<InventorySettingsTabProps> = ({
  settings,
  onSave,
}) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof InventorySettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <Package className="w-5 h-5 mr-2" />
        Inventory Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Default Reorder Level
            </label>
            <input
              type="number"
              value={form?.reorder_level_default || 0}
              onChange={(e) => handleChange("reorder_level_default", parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Low Stock Alert Threshold
            </label>
            <input
              type="number"
              value={form?.stock_alert_threshold || 0}
              onChange={(e) => handleChange("stock_alert_threshold", parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.auto_reorder_enabled || false}
              onChange={(e) => handleChange("auto_reorder_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Auto‑Reorder</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.allow_negative_stock || false}
              onChange={(e) => handleChange("allow_negative_stock", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Allow Negative Stock</span>
          </label>

          <div className="mt-4 p-3 bg-[var(--accent-blue-light)] rounded-lg">
            <h4 className="font-medium text-[var(--accent-blue)] text-sm mb-2">Auto‑Update Rules</h4>
            <label className="flex items-center text-xs mb-2">
              <input
                type="checkbox"
                checked={form?.auto_update_stock_on_return || false}
                onChange={(e) => handleChange("auto_update_stock_on_return", e.target.checked)}
                className="mr-2"
              />
              Update stock on return
            </label>
            <label className="flex items-center text-xs mb-2">
              <input
                type="checkbox"
                checked={form?.auto_update_stock_order_complete || false}
                onChange={(e) => handleChange("auto_update_stock_order_complete", e.target.checked)}
                className="mr-2"
              />
              Update stock on order complete
            </label>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={form?.auto_update_stock_purchase_received || false}
                onChange={(e) => handleChange("auto_update_stock_purchase_received", e.target.checked)}
                className="mr-2"
              />
              Update stock on purchase received
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Inventory Settings"}
        </button>
      </div>
    </form>
  );
};

export default InventorySettingsTab;