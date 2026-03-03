// src/renderer/pages/settings/components/SalesSettingsTab.tsx
import React, { useState } from "react";
import { BarChart } from "lucide-react";
import type { SalesSettings } from "../../../api/core/system_config";

interface SalesSettingsTabProps {
  settings: SalesSettings;
  onSave: (data: Partial<SalesSettings>) => Promise<void>;
}

const SalesSettingsTab: React.FC<SalesSettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof SalesSettings, value: any) => {
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
        <BarChart className="w-5 h-5 mr-2" />
        Sales & Tax Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Max Discount Percent
            </label>
            <input
              type="number"
              value={form?.max_discount_percent || 0}
              onChange={(e) => handleChange("max_discount_percent", parseFloat(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Refund Window (days)
            </label>
            <input
              type="number"
              value={form?.refund_window_days || 0}
              onChange={(e) => handleChange("refund_window_days", parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Loyalty Points Rate (per currency)
            </label>
            <input
              type="number"
              value={form?.loyalty_points_rate || 0}
              onChange={(e) => handleChange("loyalty_points_rate", parseFloat(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.discount_enabled || false}
              onChange={(e) => handleChange("discount_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Discounts</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.allow_refunds || false}
              onChange={(e) => handleChange("allow_refunds", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Allow Refunds</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.loyalty_points_enabled || false}
              onChange={(e) => handleChange("loyalty_points_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Loyalty Points</span>
          </label>

        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Sales Settings"}
        </button>
      </div>
    </form>
  );
};

export default SalesSettingsTab;