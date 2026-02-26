// src/renderer/pages/settings/components/NotificationsSettingsTab.tsx
import React, { useState } from "react";
import { Bell } from "lucide-react";
import type { NotificationsSettings } from "../../../api/core/system_config";

const SMS_PROVIDERS = ["twilio", "other"];

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

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <Bell className="w-5 h-5 mr-2" />
        Notifications Settings
      </h2>

      <div className="space-y-6">
        {/* General Notification Flags */}
        <div className="border-b border-[var(--border-color)] pb-4">
          <h3 className="text-md font-medium text-[var(--sidebar-text)] mb-3">General</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <label className="flex items-center">
              <input type="checkbox" checked={form?.enable_email_alerts || false} onChange={(e) => handleChange("enable_email_alerts", e.target.checked)} className="mr-2" />
              <span className="text-sm text-[var(--sidebar-text)]">Enable Email Alerts (legacy)</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" checked={form?.enable_sms_alerts || false} onChange={(e) => handleChange("enable_sms_alerts", e.target.checked)} className="mr-2" />
              <span className="text-sm text-[var(--sidebar-text)]">Enable SMS Alerts (legacy)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">Reminder Interval (hours)</label>
              <input
                type="number"
                value={form?.reminder_interval_hours || 24}
                onChange={(e) => handleChange("reminder_interval_hours", parseInt(e.target.value) || 24)}
                className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">SMS Provider</label>
              <select
                value={form?.sms_provider || "twilio"}
                onChange={(e) => handleChange("sms_provider", e.target.value)}
                className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              >
                {SMS_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* SMTP Settings */}
        <div className="border-b border-[var(--border-color)] pb-4">
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

        {/* Twilio Settings */}
        <div className="border-b border-[var(--border-color)] pb-4">
          <h3 className="text-md font-medium text-[var(--sidebar-text)] mb-3">Twilio (SMS) Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">Account SID</label>
              <input type="text" value={form?.twilio_account_sid || ""} onChange={(e) => handleChange("twilio_account_sid", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">Auth Token</label>
              <input type="password" value={form?.twilio_auth_token || ""} onChange={(e) => handleChange("twilio_auth_token", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">Phone Number</label>
              <input type="text" value={form?.twilio_phone_number || ""} onChange={(e) => handleChange("twilio_phone_number", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--sidebar-text)] mb-1">Messaging Service SID</label>
              <input type="text" value={form?.twilio_messaging_service_sid || ""} onChange={(e) => handleChange("twilio_messaging_service_sid", e.target.value)} className="w-full p-2 border border-[var(--border-color)] rounded bg-[var(--input-bg)] text-[var(--sidebar-text)]" />
            </div>
          </div>
        </div>

        {/* Supplier Notifications */}
        <div className="border-b border-[var(--border-color)] pb-4">
          <h3 className="text-md font-medium text-[var(--sidebar-text)] mb-3">Supplier Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_with_sms || false} onChange={(e) => handleChange("notify_supplier_with_sms", e.target.checked)} className="mr-2" /> SMS (general)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_with_email || false} onChange={(e) => handleChange("notify_supplier_with_email", e.target.checked)} className="mr-2" /> Email (general)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_on_complete_email || false} onChange={(e) => handleChange("notify_supplier_on_complete_email", e.target.checked)} className="mr-2" /> On complete (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_on_complete_sms || false} onChange={(e) => handleChange("notify_supplier_on_complete_sms", e.target.checked)} className="mr-2" /> On complete (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_on_cancel_email || false} onChange={(e) => handleChange("notify_supplier_on_cancel_email", e.target.checked)} className="mr-2" /> On cancel (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_on_cancel_sms || false} onChange={(e) => handleChange("notify_supplier_on_cancel_sms", e.target.checked)} className="mr-2" /> On cancel (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_purchase_confirmed_email || false} onChange={(e) => handleChange("notify_supplier_purchase_confirmed_email", e.target.checked)} className="mr-2" /> Purchase confirmed (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_purchase_confirmed_sms || false} onChange={(e) => handleChange("notify_supplier_purchase_confirmed_sms", e.target.checked)} className="mr-2" /> Purchase confirmed (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_purchase_received_email || false} onChange={(e) => handleChange("notify_supplier_purchase_received_email", e.target.checked)} className="mr-2" /> Purchase received (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_purchase_received_sms || false} onChange={(e) => handleChange("notify_supplier_purchase_received_sms", e.target.checked)} className="mr-2" /> Purchase received (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_purchase_cancelled_email || false} onChange={(e) => handleChange("notify_supplier_purchase_cancelled_email", e.target.checked)} className="mr-2" /> Purchase cancelled (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_supplier_purchase_cancelled_sms || false} onChange={(e) => handleChange("notify_supplier_purchase_cancelled_sms", e.target.checked)} className="mr-2" /> Purchase cancelled (SMS)
            </label>
          </div>
        </div>

        {/* Customer Notifications */}
        <div className="border-b border-[var(--border-color)] pb-4">
          <h3 className="text-md font-medium text-[var(--sidebar-text)] mb-3">Customer Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_return_processed_email || false} onChange={(e) => handleChange("notify_customer_return_processed_email", e.target.checked)} className="mr-2" /> Return processed (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_return_processed_sms || false} onChange={(e) => handleChange("notify_customer_return_processed_sms", e.target.checked)} className="mr-2" /> Return processed (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_return_cancelled_email || false} onChange={(e) => handleChange("notify_customer_return_cancelled_email", e.target.checked)} className="mr-2" /> Return cancelled (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_return_cancelled_sms || false} onChange={(e) => handleChange("notify_customer_return_cancelled_sms", e.target.checked)} className="mr-2" /> Return cancelled (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_confirmed_email || false} onChange={(e) => handleChange("notify_customer_order_confirmed_email", e.target.checked)} className="mr-2" /> Order confirmed (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_confirmed_sms || false} onChange={(e) => handleChange("notify_customer_order_confirmed_sms", e.target.checked)} className="mr-2" /> Order confirmed (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_completed_email || false} onChange={(e) => handleChange("notify_customer_order_completed_email", e.target.checked)} className="mr-2" /> Order completed (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_completed_sms || false} onChange={(e) => handleChange("notify_customer_order_completed_sms", e.target.checked)} className="mr-2" /> Order completed (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_cancelled_email || false} onChange={(e) => handleChange("notify_customer_order_cancelled_email", e.target.checked)} className="mr-2" /> Order cancelled (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_cancelled_sms || false} onChange={(e) => handleChange("notify_customer_order_cancelled_sms", e.target.checked)} className="mr-2" /> Order cancelled (SMS)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_refunded_email || false} onChange={(e) => handleChange("notify_customer_order_refunded_email", e.target.checked)} className="mr-2" /> Order refunded (email)
            </label>
            <label className="flex items-center text-xs">
              <input type="checkbox" checked={form?.notify_customer_order_refunded_sms || false} onChange={(e) => handleChange("notify_customer_order_refunded_sms", e.target.checked)} className="mr-2" /> Order refunded (SMS)
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
          {saving ? "Saving..." : "Save Notifications Settings"}
        </button>
      </div>
    </form>
  );
};

export default NotificationsSettingsTab;