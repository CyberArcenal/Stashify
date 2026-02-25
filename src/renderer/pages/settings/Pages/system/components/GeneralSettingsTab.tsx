// components/tabs/GeneralSettingsTab.tsx
import React, { useEffect, useState } from "react";
import { Building } from "lucide-react";
import {
  FrontendSystemInfo,
  GeneralSettings,
  systemSettingsAPI,
} from "@/renderer/api/systemSettings";
import { dialogs } from "@/renderer/utils/dialogs";
import { showSuccess } from "@/renderer/utils/notification";
import { useSidebarSettings } from "@/renderer/hooks/useSystemSettings";
import { useSystemInfo } from "@/renderer/contexts/SystemInfoContext";

interface GeneralSettingsTabProps {
  settings: GeneralSettings;
  onChange: (field: keyof GeneralSettings, value: any) => void;
}

const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  settings,
  onChange,
}) => {
  const { clearCache } = useSystemInfo();
  const currencies = [
    { value: "PHP", label: "Philippine Peso (₱)" },
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
  ];

  const [systemInfo, setSystemInfo] = useState<FrontendSystemInfo>();

  async function loadSystemInfo() {
    try {
      const info = await systemSettingsAPI.getSystemInfoForFrontend();
      console.log("Loaded system info:", info);
      const systemInfoData =
        (info as any).system_info || (info as unknown as FrontendSystemInfo);
      setSystemInfo(systemInfoData);
    } catch (error) {
      console.error("Failed to load system info:", error);
    }
  }

  useEffect(() => {
    loadSystemInfo();
  }, []);

  async function onLogoChange(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      // 2MB limit
      dialogs.alert({ message: "Logo file is too large. Max size is 2MB." });
      return;
    }
    const confirm = await dialogs.confirm({
      message: "Are you sure do you want to change the system logo?",
      icon: "info",
      title: "Change Logo?",
    });
    if (!confirm) return;

    try {
      const response = await systemSettingsAPI.setSystemLogo(file);
      if (response.status) {
        showSuccess("System logo changed successfully.");
        clearCache();
        loadSystemInfo(); // refresh preview
      }
    } catch (error) {
      console.error("Failed to upload logo:", error);
      dialogs.alert({ message: "Failed to upload logo. Please try again." });
    }
  }

  // Gumawa ng safe na logo URL
  const getLogoUrl = () => {
    if (!systemInfo?.logo) return null;
    return systemInfo?.logo;
  };

  const logoUrl = getLogoUrl();
  return (
    <div className="bg-[var(--card-bg)] rounded-xl shadow-sm border border-[var(--border-color)] p-6">
      <h2 className="text-lg font-semibold text-[var(--sidebar-text)] mb-6 flex items-center">
        <Building className="w-5 h-5 mr-2" />
        General Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="site_logo"
              className="block text-sm font-medium text-[var(--sidebar-text)] mb-1"
            >
              Site Logo
            </label>

            <div className="flex items-center space-x-4">
              {/* Preview */}
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Site Logo Preview"
                  className="h-16 w-16 object-contain rounded border border-[var(--border-color)]"
                  onError={(e) => {
                    // Fallback kung hindi ma-load ang image
                    console.error("Failed to load logo image");
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              {/* Upload box */}
              <label
                htmlFor="site_logo"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[var(--border-color)] rounded-lg cursor-pointer bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)]"
              >
                <span className="text-sm text-[var(--sidebar-text)]">
                  {logoUrl ? "Change logo" : "Click to upload or drag & drop"}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] mt-1">
                  PNG, JPG up to 2MB
                </span>
                <input
                  id="site_logo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    onLogoChange(file);
                    // I-reset ang input para makapag-upload ng parehong file ulit
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Current logo info */}
            {!logoUrl && (
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                No logo uploaded
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Site Name *
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => onChange("site_name", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="Enter site name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Admin Email
            </label>
            <input
              type="email"
              value={settings.admin_email}
              onChange={(e) => onChange("admin_email", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              placeholder="admin@example.com"
            />
          </div>
        </div>

        <div className="space-y-4 hidden">
          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => onChange("currency", e.target.value)}
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
            >
              {currencies.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sidebar-text)] mb-1">
              Cache Timeout (seconds)
            </label>
            <input
              type="number"
              value={settings.cache_timeout}
              onChange={(e) =>
                onChange("cache_timeout", parseInt(e.target.value) || 0)
              }
              className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--input-bg)] text-[var(--sidebar-text)]"
              min="0"
              placeholder="3600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsTab;
