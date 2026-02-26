// src/renderer/pages/settings/components/NotificationsSettingsTab.tsx
import React, { useState } from "react";
import { Bell } from "lucide-react";
import type { NotificationsSettings } from "../../../api/core/system_config";

interface NotificationsSettingsTabProps {
  settings: NotificationsSettings;
  onSave: (data: Partial<NotificationsSettings>) => Promise<void>;
}

const NotificationsSettingsTab: React.FC<NotificationsSettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof NotificationsSettings, value: any) => {
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

  // Group fields for display
  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <Bell className="w-5 h-5 mr-2" />
        Notifications Settings
      </h2>

      <div className="space-y-6">
        {/* Core email/sms flags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center">
            <input type="checkbox" checked={form?.email_enabled || false} onChange={(e) => handleChange("email_enabled", e.target.checked)} className="mr-2" />
            <span className="text-sm text-[var(--sidebar-text)]">Enable Email</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={form?.sms_enabled || false} onChange={(e) => handleChange("sms_enabled", e.target.checked)} className="mr-2" />
            <span className="text-sm text-[var(--sidebar-text)]">Enable SMS</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={form?.push_notifications_enabled || false} onChange={(e) => handleChange("push_notifications_enabled", e.target.checked)} className="mr-2" />
            <span className="text-sm text-[var(--sidebar-text)]">Enable Push Notifications</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={form?.low_stock_alert_enabled || false} onChange={(e) => handleChange("low_stock_alert_enabled", e.target.checked)} className="mr-2" />
            <span className="text-sm text-[var(--sidebar-text)]">Low Stock Alerts</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={form?.daily_sales_summary_enabled || false} onChange={(e) => handleChange("daily_sales_summary_enabled", e.target.checked)} className="mr-2" />
            <span className="text-sm text-[var(--sidebar-text)]">Daily Sales Summary</span>
          </label>
        </div>

        {/* SMTP settings */}
        <div className="border-t border-[var(--border-color)] pt-4">
          <h3 className="text-md font-medium text-[var(--sidebar-text)] mb-3">SMTP Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">SMTP Host</label>
              <input type="text" value={form?.smtp_host || ""} onChange={(e) => handleChange("smtp_host", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">SMTP Port</label>
              <input type="number" value={form?.smtp_port || 587} onChange={(e) => handleChange("smtp_port", parseInt(e.target.value) || 587)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">SMTP Username</label>
              <input type="text" value={form?.smtp_username || ""} onChange={(e) => handleChange("smtp_username", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">SMTP Password</label>
              <input type="password" value={form?.smtp_password || ""} onChange={(e) => handleChange("smtp_password", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">From Email</label>
              <input type="email" value={form?.smtp_from_email || ""} onChange={(e) => handleChange("smtp_from_email", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">From Name</label>
              <input type="text" value={form?.smtp_from_name || ""} onChange={(e) => handleChange("smtp_from_name", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <label className="flex items-center col-span-2">
              <input type="checkbox" checked={form?.smtp_use_ssl || false} onChange={(e) => handleChange("smtp_use_ssl", e.target.checked)} className="mr-2" />
              <span className="text-sm text-[var(--sidebar-text)]">Use SSL</span>
            </label>
          </div>
        </div>

        {/* Supplier and customer notification toggles – you can add them similarly */}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Notifications Settings"}
        </button>
      </div>
    </form>
  );
};

export default NotificationsSettingsTab;