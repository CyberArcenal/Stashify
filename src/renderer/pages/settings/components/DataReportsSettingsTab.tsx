// src/renderer/pages/settings/components/DataReportsSettingsTab.tsx
import React, { useState } from "react";
import { FileText } from "lucide-react";
import type { DataReportsSettings } from "../../../api/core/system_config";

interface DataReportsSettingsTabProps {
  settings: DataReportsSettings;
  onSave: (data: Partial<DataReportsSettings>) => Promise<void>;
}

const DataReportsSettingsTab: React.FC<DataReportsSettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

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
              Export Formats (comma separated)
            </label>
            <input
              type="text"
              value={form?.export_formats?.join(", ") || ""}
              onChange={(e) => handleChange("export_formats", e.target.value.split(",").map(s => s.trim()))}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="CSV, Excel, PDF"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Default Export Format
            </label>
            <input
              type="text"
              value={form?.default_export_format || ""}
              onChange={(e) => handleChange("default_export_format", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="CSV"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Backup Schedule
            </label>
            <input
              type="text"
              value={form?.backup_schedule || ""}
              onChange={(e) => handleChange("backup_schedule", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="daily, weekly"
            />
          </div>

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
        </div>

        <div className="space-y-4">
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