// src/renderer/pages/settings/components/DataReportsSettingsTab.tsx
import React, { useState } from "react";
import { FileText } from "lucide-react";
import type { DataReportsSettings } from "../../../api/core/system_config";

const EXPORT_FORMATS = ["CSV", "Excel", "PDF", "JSON"];
const BACKUP_SCHEDULES = [
  { value: "0 2 * * *", label: "Daily at 2 AM" },
  { value: "0 2 * * 0", label: "Weekly on Sunday at 2 AM" },
  { value: "0 2 1 * *", label: "Monthly on 1st at 2 AM" },
  { value: "custom", label: "Custom cron" },
];

interface DataReportsSettingsTabProps {
  settings: DataReportsSettings;
  onSave: (data: Partial<DataReportsSettings>) => Promise<void>;
}

const DataReportsSettingsTab: React.FC<DataReportsSettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [showCustomCron, setShowCustomCron] = useState(
    !BACKUP_SCHEDULES.some(s => s.value === form?.backup_schedule)
  );

  const handleChange = (field: keyof DataReportsSettings, value: any) => {
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

  const handleBackupScheduleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setShowCustomCron(true);
      // keep existing custom value if any
    } else {
      setShowCustomCron(false);
      handleChange("backup_schedule", val);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <FileText className="w-5 h-5 mr-2" />
        Data & Reports Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Export Formats
            </label>
            <div className="space-y-2">
              {EXPORT_FORMATS.map(format => (
                <label key={format} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={form?.export_formats?.includes(format) || false}
                    onChange={(e) => {
                      const current = form?.export_formats || [];
                      const newFormats = e.target.checked
                        ? [...current, format]
                        : current.filter(f => f !== format);
                      handleChange("export_formats", newFormats);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-[var(--sidebar-text)]">{format}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Default Export Format
            </label>
            <select
              value={form?.default_export_format || "CSV"}
              onChange={(e) => handleChange("default_export_format", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            >
              {EXPORT_FORMATS.map(format => <option key={format} value={format}>{format}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Backup Schedule
            </label>
            <select
              value={showCustomCron ? "custom" : (form?.backup_schedule || "0 2 * * *")}
              onChange={handleBackupScheduleSelect}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)] mb-2"
            >
              {BACKUP_SCHEDULES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {showCustomCron && (
              <input
                type="text"
                value={form?.backup_schedule || ""}
                onChange={(e) => handleChange("backup_schedule", e.target.value)}
                placeholder="Enter cron expression"
                className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Backup Location
            </label>
            <input
              type="text"
              value={form?.backup_location || ""}
              onChange={(e) => handleChange("backup_location", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="/path/to/backups"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Data Retention (days)
            </label>
            <input
              type="number"
              value={form?.data_retention_days || 0}
              onChange={(e) => handleChange("data_retention_days", parseInt(e.target.value) || 0)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
            />
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={form?.auto_backup_enabled || false}
              onChange={(e) => handleChange("auto_backup_enabled", e.target.checked)}
              className="rounded border-[var(--border-color)] text-[var(--accent-blue)]"
            />
            <span className="ml-2 text-sm text-[var(--sidebar-text)]">Enable Auto Backup</span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Data & Reports Settings"}
        </button>
      </div>
    </form>
  );
};

export default DataReportsSettingsTab;