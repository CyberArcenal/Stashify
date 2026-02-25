// components/SettingsPage.tsx
import React, { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import {
  SystemSettingsGroup,
  SystemInfo,
  SystemHealth,
  systemSettingsAPI,
  GeneralSettings,
  EmailSettings,
  TaxSettings,
} from "@/renderer/api/systemSettings";
import GeneralSettingsTab from "./components/GeneralSettingsTab";
import EmailSettingsTab from "./components/EmailSettingsTab";
import TaxSettingsTab from "./components/TaxSettingsTab";
import AlertBanner from "./components/AlertBanner";
import LoadingSpinner from "./components/LoadingSpinner";
import SettingsTabs from "./components/SettingsTab";
import StickySaveButton from "./components/StickySaveButton";
import SupplierTaxSettingsTab from "./components/SupplierTaxSettingsTab";
import ShippingSettingsTab from "./components/ShippingSettingsTab";
import CustomSettingsTab from "./components/CustomSettingsTab";
import { useSystemInfo } from "@/renderer/contexts/SystemInfoContext";
import { dialogs } from "@/renderer/utils/dialogs";

// Mock package.json version - in real app, import from actual package.json
const APP_VERSION = "1.0.0";

// Updated state structure without payment
interface SettingsState {
  general: GeneralSettings;
  email: EmailSettings;
  tax: TaxSettings;
  supplier_tax: {
    enabled: boolean;
    rate: number;
  };
  shipping: {
    threshold_activate: boolean;
  };
  // Custom settings na wala sa system model
  custom: {
    inventory: {
      reorderLevel: number;
      requireReason: boolean;
      allowNegative: boolean;
      lowStockThreshold: number;
    };
    purchases: {
      supplierTerms: string;
      autoCompleteDays: number;
      poPrefix: string;
      defaultCategory: string;
    };
    supplier: {
      autoApprove: boolean;
      requireVerification: boolean;
      allowDirectOrders: boolean;
      commissionRate: number;
      paymentTerms: string;
      minOrderAmount: number;
      maxCreditDays: number;
    };
    reports: {
      defaultPeriod: string;
      exportCSV: boolean;
      exportPDF: boolean;
      dashboardWidgets: boolean;
      autoGenerate: boolean;
    };
    users: {
      roles: string[];
      passwordMinLength: number;
      requireSpecialChars: boolean;
      auditLog: boolean;
    };
    system: {
      theme: "light" | "dark" | "auto";
      language: string;
    };
  };
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "general" | "email" | "tax" | "supplier_tax" | "shipping" | "custom"
  >("general");
  const [settings, setSettings] = useState<SettingsState>({
    general: {
      site_name: "Inventory Pro Inc.",
      currency: "PHP",
      admin_email: "admin@example.com",
      cache_timeout: 3600,
    },
    email: {
      server: "",
      port: 587,
      username: "",
      password: "",
      use_ssl: false,
      use_tls: false,
    },
    tax: {
      tax_rate: 12,
      vat_rate: 12,
      import_duty_rate: 0,
      excise_tax_rate: 0,
      digital_services_tax_rate: 0,
      tax_flat_amount: 0,
      tax_calculation: "exclusive",
      display_prices: "excl_tax",
      round_tax_at_subtotal: true,
      prices_include_tax: false,
      enabled: false,
    },
    supplier_tax: {
      enabled: false,
      rate: 12,
    },
    shipping: {
      threshold_activate: false,
    },
    custom: {
      inventory: {
        reorderLevel: 10,
        requireReason: true,
        allowNegative: false,
        lowStockThreshold: 5,
      },
      purchases: {
        supplierTerms: "Net 45",
        autoCompleteDays: 7,
        poPrefix: "PO-",
        defaultCategory: "General",
      },
      supplier: {
        autoApprove: false,
        requireVerification: true,
        allowDirectOrders: true,
        commissionRate: 5,
        paymentTerms: "Net 30",
        minOrderAmount: 1000,
        maxCreditDays: 60,
      },
      reports: {
        defaultPeriod: "monthly",
        exportCSV: true,
        exportPDF: true,
        dashboardWidgets: true,
        autoGenerate: false,
      },
      users: {
        roles: ["Admin", "Manager", "Staff", "Viewer"],
        passwordMinLength: 8,
        requireSpecialChars: true,
        auditLog: true,
      },
      system: {
        theme: "dark",
        language: "en",
      },
    },
  });

  const [logoPreview, setLogoPreview] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const { clearCache } = useSystemInfo();

  // Fetch system configuration and info
  const fetchSystemData = async () => {
    try {
      setLoading(true);
      setError(null);

      const systemConfig = await systemSettingsAPI.getSystemConfig();

      if (systemConfig && systemConfig.grouped_settings) {
        const grouped = systemConfig.grouped_settings;

        setSettings((prev) => ({
          ...prev,
          general: {
            site_name: grouped.general?.site_name || prev.general.site_name,
            currency: grouped.general?.currency || prev.general.currency,
            admin_email:
              grouped.general?.admin_email || prev.general.admin_email,
            cache_timeout:
              grouped.general?.cache_timeout ?? prev.general.cache_timeout,
          },
          email: {
            server: grouped.email?.server || prev.email.server,
            port: grouped.email?.port ?? prev.email.port,
            username: grouped.email?.username || prev.email.username,
            password: grouped.email?.password || prev.email.password,
            use_ssl: grouped.email?.use_ssl ?? prev.email.use_ssl,
            use_tls: grouped.email?.use_tls ?? prev.email.use_tls,
          },
          tax: {
            tax_rate: grouped.tax?.tax_rate ?? prev.tax.tax_rate,
            vat_rate: grouped.tax?.vat_rate ?? prev.tax.vat_rate,
            import_duty_rate:
              grouped.tax?.import_duty_rate ?? prev.tax.import_duty_rate,
            excise_tax_rate:
              grouped.tax?.excise_tax_rate ?? prev.tax.excise_tax_rate,
            digital_services_tax_rate:
              grouped.tax?.digital_services_tax_rate ??
              prev.tax.digital_services_tax_rate,
            tax_flat_amount:
              grouped.tax?.tax_flat_amount ?? prev.tax.tax_flat_amount,
            tax_calculation:
              grouped.tax?.tax_calculation === "exclusive" ||
              grouped.tax?.tax_calculation === "inclusive"
                ? grouped.tax.tax_calculation
                : prev.tax.tax_calculation,
            display_prices:
              grouped.tax?.display_prices === "excl_tax" ||
              grouped.tax?.display_prices === "incl_tax"
                ? grouped.tax.display_prices
                : prev.tax.display_prices,
            round_tax_at_subtotal:
              grouped.tax?.round_tax_at_subtotal ??
              prev.tax.round_tax_at_subtotal,
            prices_include_tax:
              grouped.tax?.prices_include_tax ?? prev.tax.prices_include_tax,
            enabled: grouped.tax?.enabled ?? prev.tax.enabled,
          },
          supplier_tax: {
            enabled: grouped.supplier_tax?.enabled ?? prev.supplier_tax.enabled,
            rate: grouped.supplier_tax?.rate ?? prev.supplier_tax.rate,
          },
          shipping: {
            threshold_activate:
              grouped.shipping?.threshold_activate ??
              prev.shipping.threshold_activate,
          },
          custom: {
            inventory: {
              reorderLevel: grouped.inventory?.reorderLevel ?? 0,
              requireReason: grouped.inventory?.requireReason ?? false,
              allowNegative: grouped.inventory?.allowNegative ?? false,
              lowStockThreshold: grouped.inventory?.lowStockThreshold ?? 10,
            },
            purchases: {
              supplierTerms: "Net 45",
              autoCompleteDays: 7,
              poPrefix: "PO-",
              defaultCategory: "General",
            },
            supplier: {
              autoApprove: false,
              requireVerification: true,
              allowDirectOrders: true,
              commissionRate: 5,
              paymentTerms: "Net 30",
              minOrderAmount: 1000,
              maxCreditDays: 60,
            },
            reports: {
              defaultPeriod: "monthly",
              exportCSV: true,
              exportPDF: true,
              dashboardWidgets: true,
              autoGenerate: false,
            },
            users: {
              roles: ["Admin", "Manager", "Staff", "Viewer"],
              passwordMinLength: 8,
              requireSpecialChars: true,
              auditLog: true,
            },
            system: {
              theme: "dark",
              language: "en",
            },
          },
        }));
      }

      // Fetch system info
      const info = await systemSettingsAPI.getSystemInfo();
      setSystemInfo(info);

      // Fetch system health
      const health = await systemSettingsAPI.getSystemHealth();
      setSystemHealth(health);
    } catch (err: any) {
      setError(err.message || "Failed to fetch system configuration");
      console.error("Error fetching system data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Prepare system configuration data using new structure
      const configData: Partial<SystemSettingsGroup> = {
        general: settings.general,
        email: settings.email,
        tax: settings.tax,
        supplier_tax: settings.supplier_tax,
        shipping: settings.shipping,
        inventory: settings.custom.inventory,
      };

      // Update system configuration using new API
      await systemSettingsAPI.updateSystemConfig(configData);

      setSuccess("Settings saved successfully!");
      clearCache();
      // Refresh system data
      await fetchSystemData();
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  // Handle clear cache
  const handleClearWebCache = async () => {
    const confirm = await dialogs.confirm({
      message: "Are you sure do you want to clear your browser cache?",
      icon: "info",
      title: "Clear Cache",
    });
    if (!confirm) return;
    try {
      setLoading(true);
      clearCache();
      setSuccess("Clear web cache success");
    } catch (err: any) {
      setError(err.message || "Failed to clear cache");
    } finally {
      setLoading(false);
    }
  };
  const handleClearCache = async () => {
    const confirm = await dialogs.confirm({
      message: "Are you sure do you want to clear system cache?",
      icon: "warning",
      title: "Clear System Cache",
    });
    if (!confirm) return;
    try {
      setLoading(true);
      const result = await systemSettingsAPI.clearSettingsCache();
      clearCache();
      setSuccess(result.message);
    } catch (err: any) {
      setError(err.message || "Failed to clear cache");
    } finally {
      setLoading(false);
    }
  };

  // Handle reset to defaults
  const handleResetToDefaults = async () => {
    const confirm = await dialogs.confirm({
      message:
        "Are you sure you want to reset all settings to defaults? This action cannot be undone.",
      icon: "danger",
      title: "Reset System To Default",
    });
    if (!confirm) return;

    try {
      setLoading(true);
      await systemSettingsAPI.initializeDefaultSettings();
      setSuccess("Settings reset to defaults successfully!");
      await fetchSystemData();
    } catch (err: any) {
      setError(err.message || "Failed to reset settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = <T extends keyof SettingsState>(
    category: T,
    field: keyof SettingsState[T],
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleCustomSettingChange = <T extends keyof SettingsState["custom"]>(
    category: T,
    field: keyof SettingsState["custom"][T],
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      custom: {
        ...prev.custom,
        [category]: {
          ...prev.custom[category],
          [field]: value,
        },
      },
    }));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        // Store logo in custom settings since it's not in system model
        handleCustomSettingChange("system", "theme", result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fetch system data on component mount
  useEffect(() => {
    fetchSystemData();
  }, []);
  // console.log(settings)
  const renderActiveTab = () => {
    switch (activeTab) {
      case "general":
        return (
          <GeneralSettingsTab
            settings={settings.general}
            onChange={(field: keyof GeneralSettings, value: any) =>
              handleSettingChange("general", field, value)
            }
          />
        );
      case "email":
        return (
          <EmailSettingsTab
            settings={settings.email}
            onChange={(field: keyof EmailSettings, value: any) =>
              handleSettingChange("email", field, value)
            }
          />
        );
      case "tax":
        return (
          <TaxSettingsTab
            settings={settings.tax}
            onChange={(field: keyof TaxSettings, value: any) =>
              handleSettingChange("tax", field, value)
            }
          />
        );
      case "supplier_tax":
        return (
          <SupplierTaxSettingsTab
            settings={settings.supplier_tax}
            onChange={(field: "enabled" | "rate", value: any) =>
              handleSettingChange("supplier_tax", field, value)
            }
          />
        );
      case "shipping":
        return (
          <ShippingSettingsTab
            settings={settings.shipping}
            onChange={(field: "threshold_activate", value: any) =>
              handleSettingChange("shipping", field, value)
            }
          />
        );
      case "custom":
        return (
          <CustomSettingsTab
            settings={settings.custom}
            systemHealth={systemHealth}
            onChange={handleCustomSettingChange}
            onClearCache={handleClearCache}
            onClearWebCache={handleClearWebCache}
            onResetDefaults={handleResetToDefaults}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)] pb-24">
      <div className="compact-card bg-[var(--card-bg)] border-b border-[var(--border-color)]">
        <div className="app-container px-6 py-4">
          <h1 className="text-xl font-semibold text-[var(--sidebar-text)]">
            System Settings
          </h1>
          <p className="text-[var(--sidebar-text)] mt-1">
            Configure your application preferences and system configuration
          </p>
        </div>
      </div>

      {/* Alert Messages */}
      <AlertBanner error={error} success={success} />

      <div className="app-container px-6 py-6">
        {loading ? (
          <LoadingSpinner message="Loading system configuration..." />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Tab Navigation */}
            <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            <div className="flex-1">{renderActiveTab()}</div>
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      <StickySaveButton
        version={systemInfo?.version || APP_VERSION}
        saving={saving}
        loading={loading}
        disabled={false}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default SettingsPage;
