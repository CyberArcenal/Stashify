// src/renderer/hooks/useSettings.ts
import { useState, useEffect, useCallback } from "react";
import systemConfigAPI, {
  type GroupedSettingsData,
  type SystemInfoData,
  type GeneralSettings,
  type InventorySettings,
  type SalesSettings,
  type CashierSettings,
  type NotificationsSettings,
  type DataReportsSettings,
  type IntegrationsSettings,
  type AuditSecuritySettings,
} from "../../../api/core/system_config";
import { dialogs } from "../../../utils/dialogs";

// ========== Default values for every category (matching system_config.ts interfaces) ==========
const DEFAULT_GENERAL: GeneralSettings = {
  company_name: "POS Management",
  store_location: "",
  default_timezone: "Asia/Manila",
  timezone: "Asia/Manila", // kept for compatibility
  currency: "USD",
  language: "en",
  receipt_footer_message: "Thank you for your purchase!",
  auto_logout_minutes: 30,
};

const DEFAULT_INVENTORY: InventorySettings = {
  auto_reorder_enabled: false,
  reorder_level_default: 10,
  reorder_qty_default: 20,
  stock_alert_threshold: 5,
  allow_negative_stock: false,
  inventory_sync_enabled: false,
  // Stock auto‑update flags
  auto_update_stock_on_return: false,
  auto_reverse_stock_on_return_cancel: false,
  auto_update_stock_order_confirm: false,
  auto_update_stock_order_complete: false,
  auto_reverse_stock_order_cancel: false,
  auto_reverse_stock_order_refund: false,
  auto_update_stock_purchase_received: false,
  auto_reverse_stock_purchase_cancel: false,
};

const DEFAULT_SALES: SalesSettings = {
  tax_rate: 12,
  discount_enabled: true,
  max_discount_percent: 50,
  allow_refunds: true,
  refund_window_days: 7,
  loyalty_points_enabled: false,
  loyalty_points_rate: 1,
  loyalty_points_earn_on_confirm: false,
  vat_rate: 0.12,
  supplier_tax_rate: 0,
  tax_calculation: "inclusive",
  tax_enabled: true,
  tax_flat_amount: 0,
  import_duty_rate: 0,
  excise_tax_rate: 0,
  digital_services_tax_rate: 0,
  round_tax_at_subtotal: false,
  prices_include_tax: true,
};

const DEFAULT_CASHIER: CashierSettings = {
  enable_cash_drawer: false,
  drawer_open_code: "",
  enable_receipt_printing: true,
  receipt_printer_type: "thermal",
  enable_barcode_scanning: true,
  enable_touchscreen_mode: false,
  quick_sale_enabled: false,
  cash_drawer_connection: "",
  cash_drawer_device_path: "",
};

const DEFAULT_NOTIFICATIONS: NotificationsSettings = {
  email_enabled: false,
  sms_enabled: false,
  sms_provider: "twilio",
  push_notifications_enabled: false,
  low_stock_alert_enabled: true,
  daily_sales_summary_enabled: false,
  enable_email_alerts: false,
  enable_sms_alerts: false,
  reminder_interval_hours: 24,
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_use_ssl: false,
  smtp_from_email: "",
  smtp_from_name: "",
  twilio_account_sid: "",
  twilio_auth_token: "",
  twilio_phone_number: "",
  twilio_messaging_service_sid: "",
  notify_supplier_with_sms: false,
  notify_supplier_with_email: false,
  notify_supplier_on_complete_email: false,
  notify_supplier_on_complete_sms: false,
  notify_supplier_on_cancel_email: false,
  notify_supplier_on_cancel_sms: false,
  notify_supplier_purchase_confirmed_email: false,
  notify_supplier_purchase_confirmed_sms: false,
  notify_supplier_purchase_received_email: false,
  notify_supplier_purchase_received_sms: false,
  notify_supplier_purchase_cancelled_email: false,
  notify_supplier_purchase_cancelled_sms: false,
  notify_customer_return_processed_email: false,
  notify_customer_return_processed_sms: false,
  notify_customer_return_cancelled_email: false,
  notify_customer_return_cancelled_sms: false,
  notify_customer_order_confirmed_email: false,
  notify_customer_order_confirmed_sms: false,
  notify_customer_order_completed_email: false,
  notify_customer_order_completed_sms: false,
  notify_customer_order_cancelled_email: false,
  notify_customer_order_cancelled_sms: false,
  notify_customer_order_refunded_email: false,
  notify_customer_order_refunded_sms: false,
};

const DEFAULT_DATA_REPORTS: DataReportsSettings = {
  export_formats: ["CSV", "Excel", "PDF"],
  default_export_format: "CSV",
  auto_backup_enabled: false,
  backup_schedule: "0 2 * * *",
  backup_location: "./backups",
  data_retention_days: 365,
};

const DEFAULT_INTEGRATIONS: IntegrationsSettings = {
  accounting_integration_enabled: false,
  accounting_api_url: "",
  accounting_api_key: "",
  payment_gateway_enabled: false,
  payment_gateway_provider: "",
  payment_gateway_api_key: "",
  webhooks_enabled: false,
  webhooks: [],
};

const DEFAULT_AUDIT_SECURITY: AuditSecuritySettings = {
  audit_log_enabled: true,
  log_retention_days: 30,
  log_events: ["login", "logout", "create", "update", "delete"],
  force_https: false,
  session_encryption_enabled: true,
  gdpr_compliance_enabled: false,
};

const DEFAULTS = {
  general: DEFAULT_GENERAL,
  inventory: DEFAULT_INVENTORY,
  sales: DEFAULT_SALES,
  cashier: DEFAULT_CASHIER,
  notifications: DEFAULT_NOTIFICATIONS,
  data_reports: DEFAULT_DATA_REPORTS,
  integrations: DEFAULT_INTEGRATIONS,
  audit_security: DEFAULT_AUDIT_SECURITY,
};

// Allowed keys per category – derived directly from the interfaces
const ALLOWED_KEYS: Record<keyof typeof DEFAULTS, string[]> = {
  general: [
    "company_name",
    "store_location",
    "default_timezone",
    "timezone",
    "currency",
    "language",
    "receipt_footer_message",
    "auto_logout_minutes",
  ],
  inventory: [
    "auto_reorder_enabled",
    "reorder_level_default",
    "reorder_qty_default",
    "stock_alert_threshold",
    "allow_negative_stock",
    "inventory_sync_enabled",
    "auto_update_stock_on_return",
    "auto_reverse_stock_on_return_cancel",
    "auto_update_stock_order_confirm",
    "auto_update_stock_order_complete",
    "auto_reverse_stock_order_cancel",
    "auto_reverse_stock_order_refund",
    "auto_update_stock_purchase_received",
    "auto_reverse_stock_purchase_cancel",
  ],
  sales: [
    "tax_rate",
    "discount_enabled",
    "max_discount_percent",
    "allow_refunds",
    "refund_window_days",
    "loyalty_points_enabled",
    "loyalty_points_rate",
    "loyalty_points_earn_on_confirm",
    "vat_rate",
    "supplier_tax_rate",
    "tax_calculation",
    "tax_enabled",
    "tax_flat_amount",
    "import_duty_rate",
    "excise_tax_rate",
    "digital_services_tax_rate",
    "round_tax_at_subtotal",
    "prices_include_tax",
  ],
  cashier: [
    "enable_cash_drawer",
    "drawer_open_code",
    "enable_receipt_printing",
    "receipt_printer_type",
    "enable_barcode_scanning",
    "enable_touchscreen_mode",
    "quick_sale_enabled",
    "cash_drawer_connection",
    "cash_drawer_device_path",
  ],
  notifications: [
    "email_enabled",
    "sms_enabled",
    "sms_provider",
    "push_notifications_enabled",
    "low_stock_alert_enabled",
    "daily_sales_summary_enabled",
    "enable_email_alerts",
    "enable_sms_alerts",
    "reminder_interval_hours",
    "smtp_host",
    "smtp_port",
    "smtp_username",
    "smtp_password",
    "smtp_use_ssl",
    "smtp_from_email",
    "smtp_from_name",
    "twilio_account_sid",
    "twilio_auth_token",
    "twilio_phone_number",
    "twilio_messaging_service_sid",
    "notify_supplier_with_sms",
    "notify_supplier_with_email",
    "notify_supplier_on_complete_email",
    "notify_supplier_on_complete_sms",
    "notify_supplier_on_cancel_email",
    "notify_supplier_on_cancel_sms",
    "notify_supplier_purchase_confirmed_email",
    "notify_supplier_purchase_confirmed_sms",
    "notify_supplier_purchase_received_email",
    "notify_supplier_purchase_received_sms",
    "notify_supplier_purchase_cancelled_email",
    "notify_supplier_purchase_cancelled_sms",
    "notify_customer_return_processed_email",
    "notify_customer_return_processed_sms",
    "notify_customer_return_cancelled_email",
    "notify_customer_return_cancelled_sms",
    "notify_customer_order_confirmed_email",
    "notify_customer_order_confirmed_sms",
    "notify_customer_order_completed_email",
    "notify_customer_order_completed_sms",
    "notify_customer_order_cancelled_email",
    "notify_customer_order_cancelled_sms",
    "notify_customer_order_refunded_email",
    "notify_customer_order_refunded_sms",
  ],
  data_reports: [
    "export_formats",
    "default_export_format",
    "auto_backup_enabled",
    "backup_schedule",
    "backup_location",
    "data_retention_days",
  ],
  integrations: [
    "accounting_integration_enabled",
    "accounting_api_url",
    "accounting_api_key",
    "payment_gateway_enabled",
    "payment_gateway_provider",
    "payment_gateway_api_key",
    "webhooks_enabled",
    "webhooks",
  ],
  audit_security: [
    "audit_log_enabled",
    "log_retention_days",
    "log_events",
    "force_https",
    "session_encryption_enabled",
    "gdpr_compliance_enabled",
  ],
};

// Helper: sanitize object to only allowed keys
function sanitizeSettings<T extends Record<string, any>>(
  obj: T | undefined | null,
  allowedKeys: string[],
): Partial<T> {
  const result: Partial<T> = {};
  if (!obj || typeof obj !== "object") return result;
  for (const key of allowedKeys) {
    if (key in obj) {
      result[key as keyof T] = obj[key];
    }
  }
  return result;
}

export const useSettings = () => {
  const [groupedConfig, setGroupedConfig] = useState(DEFAULTS);
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const configRes = await systemConfigAPI.getGroupedConfig();
      if (configRes.status && configRes.data) {
        const apiSettings = configRes.data.grouped_settings;
        setGroupedConfig((prev) => ({
          general:
            apiSettings.general !== undefined
              ? { ...DEFAULTS.general, ...apiSettings.general }
              : prev.general,
          inventory:
            apiSettings.inventory !== undefined
              ? { ...DEFAULTS.inventory, ...apiSettings.inventory }
              : prev.inventory,
          sales:
            apiSettings.sales !== undefined
              ? { ...DEFAULTS.sales, ...apiSettings.sales }
              : prev.sales,
          cashier:
            apiSettings.cashier !== undefined
              ? { ...DEFAULTS.cashier, ...apiSettings.cashier }
              : prev.cashier,
          notifications:
            apiSettings.notifications !== undefined
              ? { ...DEFAULTS.notifications, ...apiSettings.notifications }
              : prev.notifications,
          data_reports:
            apiSettings.data_reports !== undefined
              ? { ...DEFAULTS.data_reports, ...apiSettings.data_reports }
              : prev.data_reports,
          integrations:
            apiSettings.integrations !== undefined
              ? { ...DEFAULTS.integrations, ...apiSettings.integrations }
              : prev.integrations,
          audit_security:
            apiSettings.audit_security !== undefined
              ? { ...DEFAULTS.audit_security, ...apiSettings.audit_security }
              : prev.audit_security,
        }));
      }
      const infoRes = await systemConfigAPI.getSystemInfo();
      if (infoRes.status && infoRes.data) {
        setSystemInfo(infoRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a single field
  const updateCategoryField = useCallback(
    <C extends keyof typeof DEFAULTS>(
      category: C,
      field: keyof (typeof DEFAULTS)[C],
      value: any,
    ) => {
      setGroupedConfig((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: value,
        },
      }));
    },
    [],
  );

  // Set multiple fields at once
  const setCategoryData = useCallback(
    <C extends keyof typeof DEFAULTS>(
      category: C,
      data: Partial<(typeof DEFAULTS)[C]>,
    ) => {
      setGroupedConfig((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          ...data,
        },
      }));
    },
    [],
  );

  // Save only one category (if there are changes)
  const saveCategory = useCallback(
    async (category: keyof typeof DEFAULTS) => {
      const dataToSend = sanitizeSettings(
        groupedConfig[category],
        ALLOWED_KEYS[category],
      );
      if (Object.keys(dataToSend).length === 0) {
        // No changes to save
        return;
      }
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await systemConfigAPI.updateGroupedConfig({
          [category]: dataToSend,
        });
        if (!response.status) {
          throw new Error(
            response.message || `Failed to save ${category} settings`,
          );
        }
        setSuccessMessage(`${category} settings saved successfully`);
        await fetchSettings(); // refresh to get latest timestamps
      } catch (err: any) {
        setError(err.message || `Failed to save ${category} settings`);
      } finally {
        setSaving(false);
      }
    },
    [groupedConfig, fetchSettings],
  );

  // Save all categories (used for "Save All")
  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const categories = Object.keys(groupedConfig) as Array<
      keyof typeof DEFAULTS
    >;
    const results = await Promise.allSettled(
      categories.map(async (category) => {
        const dataToSend = sanitizeSettings(
          groupedConfig[category],
          ALLOWED_KEYS[category],
        );
        if (Object.keys(dataToSend).length === 0) return; // skip empty
        return systemConfigAPI.updateGroupedConfig({
          [category]: dataToSend,
        });
      }),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      const errors = failed.map(
        (f) => (f as PromiseRejectedResult).reason?.message || "Unknown error",
      );
      setError(
        `Failed to save ${failed.length} category(s): ${errors.join("; ")}`,
      );
    } else {
      setSuccessMessage("All settings saved successfully");
      await fetchSettings();
    }
    setSaving(false);
  };

  const resetToDefaults = async () => {
    if (
      !(await dialogs.confirm({
        message:
          "Are you sure you want to reset all settings to default values? This cannot be undone.",
        title: "Reset Settings",
      }))
    )
      return;
    setLoading(true);
    try {
      await systemConfigAPI.resetToDefaults();
      setSuccessMessage("Settings reset to defaults");
      await fetchSettings();
    } catch (err: any) {
      setError(err.message || "Failed to reset settings");
    } finally {
      setLoading(false);
    }
  };

  const exportSettings = async () => {
    try {
      const jsonStr = await systemConfigAPI.exportSettingsToFile();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMessage("Settings exported successfully");
    } catch (err: any) {
      setError(err.message || "Failed to export settings");
    }
  };

  const importSettings = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await systemConfigAPI.importSettingsFromFile(content);
        setSuccessMessage("Settings imported successfully");
        await fetchSettings();
      } catch (err: any) {
        setError(err.message || "Failed to import settings");
      }
    };
    reader.readAsText(file);
  };

  const testSmtpConnection = async () => {
    try {
      if (!window.backendAPI?.systemConfig)
        throw new Error("Electron API not available");
      const response = await window.backendAPI.systemConfig({
        method: "testSmtpConnection",
        params: { settings: groupedConfig.notifications },
      });
      if (response.status) setSuccessMessage("SMTP connection successful");
      else setError(response.message || "SMTP connection failed");
    } catch (err: any) {
      setError(err.message || "Failed to test SMTP connection");
    }
  };

  const testSmsConnection = async () => {
    try {
      if (!window.backendAPI?.systemConfig)
        throw new Error("Electron API not available");
      const response = await window.backendAPI.systemConfig({
        method: "testSmsConnection",
        params: { settings: groupedConfig.notifications },
      });
      if (response.status)
        setSuccessMessage("SMS (Twilio) connection successful");
      else setError(response.message || "SMS connection failed");
    } catch (err: any) {
      setError(err.message || "Failed to test SMS connection");
    }
  };

  return {
    groupedConfig,
    systemInfo,
    loading,
    saving,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    updateGeneral: (field: keyof GeneralSettings, value: any) =>
      updateCategoryField("general", field, value),
    updateInventory: (field: keyof InventorySettings, value: any) =>
      updateCategoryField("inventory", field, value),
    updateSales: (field: keyof SalesSettings, value: any) =>
      updateCategoryField("sales", field, value),
    updateCashier: (field: keyof CashierSettings, value: any) =>
      updateCategoryField("cashier", field, value),
    updateNotifications: (field: keyof NotificationsSettings, value: any) =>
      updateCategoryField("notifications", field, value),
    updateDataReports: (field: keyof DataReportsSettings, value: any) =>
      updateCategoryField("data_reports", field, value),
    updateIntegrations: (field: keyof IntegrationsSettings, value: any) =>
      updateCategoryField("integrations", field, value),
    updateAuditSecurity: (field: keyof AuditSecuritySettings, value: any) =>
      updateCategoryField("audit_security", field, value),
    setCategoryData,
    saveCategory,
    saveSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    refetch: fetchSettings,
    testSmtpConnection,
    testSmsConnection,
  };
};
