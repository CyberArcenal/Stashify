// src/renderer/pages/settings/components/AuditSecuritySettingsTab.tsx
import React, { useState } from "react";
import { Shield } from "lucide-react";
import type { AuditSecuritySettings } from "../../../api/core/system_config";

interface AuditSecuritySettingsTabProps {
  settings: AuditSecuritySettings;
  onSave: (data: Partial<AuditSecuritySettings>) => Promise<void>;
}

const AuditSecuritySettingsTab: React.FC<AuditSecuritySettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof AuditSecuritySettings, value: any) => {
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
        <Shield className="w-5 h-5 mr-2" />
        Audit & Security Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Log Retention (days)
            </label>
            <input
              type="number"
              value={form?.log_retention_days || 0}
              onChange={(e) => handleChange("log_retention_days", parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Log Events (comma separated)
            </label>
            <input
              type="text"
              value={form?.log_events?.join(", ") || ""}
              onChange={(e) => handleChange("log_events", e.target.value.split(",").map(s => s.trim()))}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="CREATE, UPDATE, DELETE"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.audit_log_enabled || false}
              onChange={(e) => handleChange("audit_log_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Audit Log</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.force_https || false}
              onChange={(e) => handleChange("force_https", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Force HTTPS</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.session_encryption_enabled || false}
              onChange={(e) => handleChange("session_encryption_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Session Encryption</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.gdpr_compliance_enabled || false}
              onChange={(e) => handleChange("gdpr_compliance_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">GDPR Compliance Mode</span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Audit & Security Settings"}
        </button>
      </div>
    </form>
  );
};

export default AuditSecuritySettingsTab;