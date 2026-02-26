// src/renderer/pages/settings/components/IntegrationsSettingsTab.tsx
import React, { useState } from "react";
import { Link } from "lucide-react";
import type { IntegrationsSettings } from "../../../api/core/system_config";

interface IntegrationsSettingsTabProps {
  settings: IntegrationsSettings;
  onSave: (data: Partial<IntegrationsSettings>) => Promise<void>;
}

const IntegrationsSettingsTab: React.FC<IntegrationsSettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof IntegrationsSettings, value: any) => {
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
        <Link className="w-5 h-5 mr-2" />
        Integrations Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Accounting API URL
            </label>
            <input
              type="text"
              value={form?.accounting_api_url || ""}
              onChange={(e) => handleChange("accounting_api_url", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Accounting API Key
            </label>
            <input
              type="password"
              value={form?.accounting_api_key || ""}
              onChange={(e) => handleChange("accounting_api_key", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Payment Gateway Provider
            </label>
            <input
              type="text"
              value={form?.payment_gateway_provider || ""}
              onChange={(e) => handleChange("payment_gateway_provider", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Payment Gateway API Key
            </label>
            <input
              type="password"
              value={form?.payment_gateway_api_key || ""}
              onChange={(e) => handleChange("payment_gateway_api_key", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.accounting_integration_enabled || false}
              onChange={(e) => handleChange("accounting_integration_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Accounting Integration</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.payment_gateway_enabled || false}
              onChange={(e) => handleChange("payment_gateway_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Payment Gateway</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.webhooks_enabled || false}
              onChange={(e) => handleChange("webhooks_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Webhooks</span>
          </label>
        </div>
      </div>

      {/* Webhooks – you could add a simple array editor if needed */}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Integrations Settings"}
        </button>
      </div>
    </form>
  );
};

export default IntegrationsSettingsTab;