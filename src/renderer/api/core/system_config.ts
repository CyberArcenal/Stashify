// systemConfigAPI.ts - Refactored with TaxSettings support

export interface PublicSystemSettings {
  general: {
    [key: string]: {
      value: string | number | boolean;
      description: string;
    };
  };
  system: {
    site_name: string;
    currency: string;
    cache_timestamp: string;
  };
}

export interface FrontendSystemInfo {
  site_name: string;
  logo: string;
  currency: string;
  admin_email: string;
  tax_enabled: boolean;
  tax_rate: number;
  shipping_threshold_enabled: boolean;
  system_version: string;
}

// 📊 Setting Types – matches backend enum exactly
export const SettingType = {
  EMAIL: "email",
  DEVICE: "device",
  INVENTORY_SYNC: "inventory_sync",
  GENERAL: "general",
  INVENTORY: "inventory",
  SALES: "sales",
  NOTIFICATIONS: "notifications",
  DATA_REPORTS: "data_reports",
  INTEGRATIONS: "integrations",
  AUDIT_SECURITY: "audit_security",
  SEO: "seo",
  TAX: "tax",
  SUPPLIER_TAX: "supplier_tax",
  SHIPPING: "shipping",
  CASHIER: "cashier",
} as const;

export type SettingType = (typeof SettingType)[keyof typeof SettingType];

export interface SystemSettingData {
  id: number;
  key: string;
  value: any;
  setting_type: SettingType;
  description?: string;
  isPublic: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GroupedSettingsData {
  settings: SystemSettingData[];
  grouped_settings: {
    general: GeneralSettings;
    inventory: InventorySettings;
    sales: SalesSettings;
    cashier: CashierSettings;
    notifications: NotificationsSettings;
    data_reports: DataReportsSettings;
    integrations: IntegrationsSettings;
    audit_security: AuditSecuritySettings;
  };
  system_info: SystemInfoData;
}

// 1. GENERAL SETTINGS
export interface GeneralSettings {
  company_name?: string;
  store_location?: string;
  default_timezone?: string;
  timezone?: string;                // kept for compatibility
  currency?: string;
  language?: string;
  receipt_footer_message?: string;
  auto_logout_minutes?: number;
}

// 2. INVENTORY SETTINGS (including stock auto‑update flags)
export interface InventorySettings {
  auto_reorder_enabled?: boolean;
  reorder_level_default?: number;
  reorder_qty_default?: number;
  stock_alert_threshold?: number;
  allow_negative_stock?: boolean;
  inventory_sync_enabled?: boolean;
  // Stock auto‑update on returns/orders/purchases
  auto_update_stock_on_return?: boolean;
  auto_reverse_stock_on_return_cancel?: boolean;
  auto_update_stock_order_confirm?: boolean;
  auto_update_stock_order_complete?: boolean;
  auto_reverse_stock_order_cancel?: boolean;
  auto_reverse_stock_order_refund?: boolean;
  auto_update_stock_purchase_received?: boolean;
  auto_reverse_stock_purchase_cancel?: boolean;
}

// 3. SALES SETTINGS (includes basic tax fields)
export interface SalesSettings {
  tax_rate?: number;
  discount_enabled?: boolean;
  max_discount_percent?: number;
  allow_refunds?: boolean;
  refund_window_days?: number;
  loyalty_points_enabled?: boolean;
  loyalty_points_rate?: number;      // points per currency unit
  loyalty_points_earn_on_confirm?: boolean;
  // Extended tax fields (if stored individually)
  vat_rate?: number;
  supplier_tax_rate?: number;
  tax_calculation?: "inclusive" | "exclusive";
  tax_enabled?: boolean;
  tax_flat_amount?: number;
  import_duty_rate?: number;
  excise_tax_rate?: number;
  digital_services_tax_rate?: number;
  round_tax_at_subtotal?: boolean;
  prices_include_tax?: boolean;
}

// 4. CASHIER SETTINGS
export interface CashierSettings {
  enable_cash_drawer?: boolean;
  drawer_open_code?: string;
  enable_receipt_printing?: boolean;
  receipt_printer_type?: string;     // thermal, dot-matrix
  enable_barcode_scanning?: boolean;
  enable_touchscreen_mode?: boolean;
  quick_sale_enabled?: boolean;
  cash_drawer_connection?: string;   // printer, usb, serial
  cash_drawer_device_path?: string;
}

// 5. NOTIFICATIONS SETTINGS (complete list from system.js)
export interface NotificationsSettings {
  // Core email/sms flags
  email_enabled?: boolean;
  sms_enabled?: boolean;
  sms_provider?: string;
  push_notifications_enabled?: boolean;
  low_stock_alert_enabled?: boolean;
  daily_sales_summary_enabled?: boolean;

  // Legacy alert flags
  enable_email_alerts?: boolean;
  enable_sms_alerts?: boolean;
  reminder_interval_hours?: number;

  // SMTP settings
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_use_ssl?: boolean;
  smtp_from_email?: string;
  smtp_from_name?: string;

  // Twilio settings
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  twilio_messaging_service_sid?: string;

  // Supplier notifications (purchase orders)
  notify_supplier_with_sms?: boolean;
  notify_supplier_with_email?: boolean;
  notify_supplier_on_complete_email?: boolean;
  notify_supplier_on_complete_sms?: boolean;
  notify_supplier_on_cancel_email?: boolean;
  notify_supplier_on_cancel_sms?: boolean;
  notify_supplier_purchase_confirmed_email?: boolean;
  notify_supplier_purchase_confirmed_sms?: boolean;
  notify_supplier_purchase_received_email?: boolean;
  notify_supplier_purchase_received_sms?: boolean;
  notify_supplier_purchase_cancelled_email?: boolean;
  notify_supplier_purchase_cancelled_sms?: boolean;

  // Customer notifications (orders & returns)
  notify_customer_return_processed_email?: boolean;
  notify_customer_return_processed_sms?: boolean;
  notify_customer_return_cancelled_email?: boolean;
  notify_customer_return_cancelled_sms?: boolean;
  notify_customer_order_confirmed_email?: boolean;
  notify_customer_order_confirmed_sms?: boolean;
  notify_customer_order_completed_email?: boolean;
  notify_customer_order_completed_sms?: boolean;
  notify_customer_order_cancelled_email?: boolean;
  notify_customer_order_cancelled_sms?: boolean;
  notify_customer_order_refunded_email?: boolean;
  notify_customer_order_refunded_sms?: boolean;
}

// 6. DATA & REPORTS SETTINGS
export interface DataReportsSettings {
  export_formats?: string[];         // CSV, Excel, PDF
  default_export_format?: string;
  auto_backup_enabled?: boolean;
  backup_schedule?: string;          // daily, weekly, etc.
  backup_location?: string;
  data_retention_days?: number;
}

// 7. INTEGRATIONS SETTINGS
export interface IntegrationsSettings {
  accounting_integration_enabled?: boolean;
  accounting_api_url?: string;
  accounting_api_key?: string;
  payment_gateway_enabled?: boolean;
  payment_gateway_provider?: string;
  payment_gateway_api_key?: string;
  webhooks_enabled?: boolean;
  webhooks?: WebhookSetting[];
}

export interface WebhookSetting {
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
}

// 8. AUDIT & SECURITY SETTINGS
export interface AuditSecuritySettings {
  audit_log_enabled?: boolean;
  log_retention_days?: number;
  log_events?: string[];
  force_https?: boolean;
  session_encryption_enabled?: boolean;
  gdpr_compliance_enabled?: boolean;
}

export interface SystemInfoData {
  version: string;
  name: string;
  environment: string;
  debug_mode: boolean;
  timezone: string;
  current_time: string;
  setting_types: string[];
}

// 📌 TAX SETTINGS – dedicated interface para sa component
export interface TaxSettings {
  vat_rate: number;
  tax_rate: number;
  tax_calculation: "inclusive" | "exclusive";
  display_prices: "incl_tax" | "excl_tax";
  enabled: boolean;
  tax_flat_amount: number;
  import_duty_rate: number;
  excise_tax_rate: number;
  digital_services_tax_rate: number;
  round_tax_at_subtotal: boolean;
  prices_include_tax: boolean;
}

// 📊 API Responses
export interface SystemConfigResponse {
  status: boolean;
  message: string;
  data: GroupedSettingsData | null;
}

export interface SystemInfoResponse {
  status: boolean;
  message: string;
  data: SystemInfoData | null;
}

export interface SettingsListResponse {
  status: boolean;
  message: string;
  data: SystemSettingData[];
}

export interface SettingResponse {
  status: boolean;
  message: string;
  data: SystemSettingData | null;
}

export interface OperationResponse {
  status: boolean;
  message: string;
  data: {
    id?: number;
    key?: string;
    count?: number;
    [key: string]: any;
  } | null;
}

export interface SettingsStatsResponse {
  status: boolean;
  message: string;
  data: {
    total: number;
    by_type: Record<string, number>;
    public_count: number;
    private_count: number;
    timestamp: string;
  };
}

export interface BulkOperationResponse {
  status: boolean;
  message: string;
  data: Array<{
    success: boolean;
    id?: number;
    key?: string;
    error?: string;
    action?: string;
  }>;
}

// 📝 Request Payloads
export interface CreateSettingData {
  key: string;
  value: any;
  setting_type: SettingType;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateSettingData {
  id: number;
  key?: string;
  value?: any;
  setting_type?: SettingType;
  description?: string;
  isPublic?: boolean;
}

export interface SetValueByKeyData {
  key: string;
  value: any;
  setting_type?: SettingType;
  description?: string;
  isPublic?: boolean;
}

export interface BulkUpdateData {
  settingsData: Array<{
    id?: number;
    key: string;
    value: any;
    setting_type: SettingType;
    description?: string;
    isPublic?: boolean;
  }>;
}

export interface UpdateCategorySettingsData {
  [category: string]: Record<string, any>;
}

// 🛠️ API Class
class SystemConfigAPI {
  // 🔧 Core Methods
  async getGroupedConfig(): Promise<SystemConfigResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getGroupedConfig",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to fetch system configuration",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch system configuration");
    }
  }

  async updateGroupedConfig(
    configData: UpdateCategorySettingsData,
  ): Promise<SystemConfigResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "updateGroupedConfig",
        params: { configData },
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to update system configuration",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to update system configuration");
    }
  }

  async getSystemInfo(): Promise<SystemInfoResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getSystemInfo",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch system information");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch system information");
    }
  }

  async getAllSettings(): Promise<SettingsListResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getAllSettings",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch all settings");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch all settings");
    }
  }

  async getPublicSettings(): Promise<SettingsListResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getPublicSettings",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch public settings");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch public settings");
    }
  }

  async getSettingByKey(
    key: string,
    settingType?: SettingType,
  ): Promise<SettingResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getSettingByKey",
        params: { key, settingType },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch setting");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch setting");
    }
  }

  async createSetting(
    settingData: CreateSettingData,
  ): Promise<SettingResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "createSetting",
        params: { settingData },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to create setting");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create setting");
    }
  }

  async updateSetting(
    id: number,
    settingData: UpdateSettingData,
  ): Promise<SettingResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "updateSetting",
        params: { id, settingData },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update setting");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update setting");
    }
  }

  async deleteSetting(id: number): Promise<OperationResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "deleteSetting",
        params: { id },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to delete setting");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete setting");
    }
  }

  async getByType(settingType: SettingType): Promise<SettingsListResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getByType",
        params: { settingType },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to fetch settings by type");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch settings by type");
    }
  }

  async getValueByKey(
    key: string,
    defaultValue?: any,
  ): Promise<SettingResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getValueByKey",
        params: { key, defaultValue },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get value by key");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get value by key");
    }
  }

  async setValueByKey(
    key: string,
    value: any,
    options?: Partial<SetValueByKeyData>,
  ): Promise<SettingResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "setValueByKey",
        params: { key, value, options },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to set value by key");
    } catch (error: any) {
      throw new Error(error.message || "Failed to set value by key");
    }
  }

  async bulkUpdate(
    settingsData: BulkUpdateData["settingsData"],
  ): Promise<BulkOperationResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "bulkUpdate",
        params: { settingsData },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk update settings");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk update settings");
    }
  }

  async bulkDelete(ids: number[]): Promise<BulkOperationResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "bulkDelete",
        params: { ids },
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk delete settings");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk delete settings");
    }
  }

  async getSettingsStats(): Promise<SettingsStatsResponse> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.systemConfig({
        method: "getSettingsStats",
        params: {},
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get settings statistics");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get settings statistics");
    }
  }

  // 🎯 Category‑Specific Methods
  async getGeneralSettings(): Promise<GeneralSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.general || {};
    } catch (error) {
      console.error("Error getting general settings:", error);
      return {};
    }
  }

  async getInventorySettings(): Promise<InventorySettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.inventory || {};
    } catch (error) {
      console.error("Error getting inventory settings:", error);
      return {};
    }
  }

  async getSalesSettings(): Promise<SalesSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.sales || {};
    } catch (error) {
      console.error("Error getting sales settings:", error);
      return {};
    }
  }

  async getCashierSettings(): Promise<CashierSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.cashier || {};
    } catch (error) {
      console.error("Error getting cashier settings:", error);
      return {};
    }
  }

  async getNotificationsSettings(): Promise<NotificationsSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.notifications || {};
    } catch (error) {
      console.error("Error getting notifications settings:", error);
      return {};
    }
  }

  async getDataReportsSettings(): Promise<DataReportsSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.data_reports || {};
    } catch (error) {
      console.error("Error getting data & reports settings:", error);
      return {};
    }
  }

  async getIntegrationsSettings(): Promise<IntegrationsSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.integrations || {};
    } catch (error) {
      console.error("Error getting integrations settings:", error);
      return {};
    }
  }

  async getAuditSecuritySettings(): Promise<AuditSecuritySettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.audit_security || {};
    } catch (error) {
      console.error("Error getting audit & security settings:", error);
      return {};
    }
  }

  // 📌 TAX SETTINGS – dedicated method para sa component
  async getTaxSettings(): Promise<TaxSettings> {
    try {
      // Subukang kunin ang individual tax settings mula sa database
      // Kung wala, gagamit ng default values
      const [
        vat_rate,
        tax_rate,
        tax_calculation,
        enabled,
        tax_flat_amount,
        import_duty_rate,
        excise_tax_rate,
        digital_services_tax_rate,
        round_tax_at_subtotal,
        prices_include_tax,
      ] = await Promise.all([
        this.getNumberSetting("sales", "vat_rate", 0.12),
        this.getNumberSetting("sales", "tax_rate", 12),
        this.getStringSetting("sales", "tax_calculation", "inclusive"),
        this.getBooleanSetting("sales", "tax_enabled", true),
        this.getNumberSetting("sales", "tax_flat_amount", 0),
        this.getNumberSetting("sales", "import_duty_rate", 0),
        this.getNumberSetting("sales", "excise_tax_rate", 0),
        this.getNumberSetting("sales", "digital_services_tax_rate", 0),
        this.getBooleanSetting("sales", "round_tax_at_subtotal", false),
        this.getBooleanSetting("sales", "prices_include_tax", true),
      ]);

      return {
        vat_rate,
        tax_rate,
        tax_calculation: tax_calculation as "inclusive" | "exclusive",
        display_prices: "incl_tax", // fixed or可从设置中读取
        enabled,
        tax_flat_amount,
        import_duty_rate,
        excise_tax_rate,
        digital_services_tax_rate,
        round_tax_at_subtotal,
        prices_include_tax,
      };
    } catch (error) {
      console.warn("Error fetching tax settings, using defaults");
      return {
        vat_rate: 0.12,
        tax_rate: 12,
        tax_calculation: "inclusive",
        display_prices: "incl_tax",
        enabled: true,
        tax_flat_amount: 0,
        import_duty_rate: 0,
        excise_tax_rate: 0,
        digital_services_tax_rate: 0,
        round_tax_at_subtotal: false,
        prices_include_tax: true,
      };
    }
  }

  async updateGeneralSettings(
    settings: Partial<GeneralSettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("general", settings);
  }

  async updateInventorySettings(
    settings: Partial<InventorySettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("inventory", settings);
  }

  async updateSalesSettings(
    settings: Partial<SalesSettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("sales", settings);
  }

  async updateCashierSettings(
    settings: Partial<CashierSettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("cashier", settings);
  }

  async updateNotificationsSettings(
    settings: Partial<NotificationsSettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("notifications", settings);
  }

  async updateDataReportsSettings(
    settings: Partial<DataReportsSettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("data_reports", settings);
  }

  async updateIntegrationsSettings(
    settings: Partial<IntegrationsSettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("integrations", settings);
  }

  async updateAuditSecuritySettings(
    settings: Partial<AuditSecuritySettings>,
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("audit_security", settings);
  }

  async updateCategorySettings(
    category: string,
    settings: Record<string, any>,
  ): Promise<SystemConfigResponse> {
    const configData = { [category]: settings };
    return this.updateGroupedConfig(configData);
  }

  // 🔧 Utility Methods
  async getAllSettingsAsObject(): Promise<Record<string, any>> {
    try {
      const settings = await this.getAllSettings();
      const result: Record<string, any> = {};
      if (settings.data) {
        settings.data.forEach((setting) => {
          result[`${setting.setting_type}.${setting.key}`] = setting.value;
        });
      }
      return result;
    } catch (error) {
      console.error("Error getting all settings as object:", error);
      return {};
    }
  }

  async getSetting(
    category: string,
    key: string,
    defaultValue?: any,
  ): Promise<any> {
    try {
      const fullKey = `${category}.${key}`;
      const settings = await this.getAllSettingsAsObject();
      return settings[fullKey] ?? defaultValue;
    } catch (error) {
      console.error(`Error getting setting ${category}.${key}:`, error);
      return defaultValue;
    }
  }

  async setSetting(
    category: string,
    key: string,
    value: any,
    description?: string,
  ): Promise<SettingResponse> {
    const options = {
      setting_type: category as SettingType,
      description: description || `Setting for ${category}.${key}`,
      isPublic: false,
    };
    return this.setValueByKey(key, value, options);
  }

  async settingExists(
    key: string,
    settingType?: SettingType,
  ): Promise<boolean> {
    try {
      const response = await this.getSettingByKey(key, settingType);
      return response.status && response.data !== null;
    } catch {
      return false;
    }
  }

  async getBooleanSetting(
    category: string,
    key: string,
    defaultValue: boolean = false,
  ): Promise<boolean> {
    const value = await this.getSetting(category, key, defaultValue);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (["true", "1", "yes", "on", "enabled"].includes(lower)) return true;
      if (["false", "0", "no", "off", "disabled"].includes(lower)) return false;
    }
    if (typeof value === "number") return value !== 0;
    return defaultValue;
  }

  async getNumberSetting(
    category: string,
    key: string,
    defaultValue: number = 0,
  ): Promise<number> {
    const value = await this.getSetting(category, key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  async getStringSetting(
    category: string,
    key: string,
    defaultValue: string = "",
  ): Promise<string> {
    const value = await this.getSetting(category, key, defaultValue);
    return String(value ?? defaultValue);
  }

  async getArraySetting(
    category: string,
    key: string,
    defaultValue: any[] = [],
  ): Promise<any[]> {
    const value = await this.getSetting(category, key, defaultValue);
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  async getObjectSetting(
    category: string,
    key: string,
    defaultValue: object = {},
  ): Promise<object> {
    const value = await this.getSetting(category, key, defaultValue);
    if (typeof value === "object" && value !== null && !Array.isArray(value))
      return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
          return parsed;
      } catch {}
    }
    return defaultValue;
  }

  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings = [
      {
        key: "company_name",
        value: "Inventory Management",
        setting_type: SettingType.GENERAL,
        description: "Company name",
      },
      {
        key: "default_timezone",
        value: "Asia/Manila",
        setting_type: SettingType.GENERAL,
        description: "Default timezone",
      },
      // Add more defaults as needed
    ];
    for (const setting of defaultSettings) {
      const exists = await this.settingExists(setting.key, setting.setting_type);
      if (!exists) {
        await this.createSetting({
          key: setting.key,
          value: setting.value,
          setting_type: setting.setting_type,
          description: setting.description,
          isPublic: false,
        });
      }
    }
  }

  async exportSettingsToFile(): Promise<string> {
    const config = await this.getGroupedConfig();
    return JSON.stringify(config.data, null, 2);
  }

  async importSettingsFromFile(jsonData: string): Promise<SystemConfigResponse> {
    const configData = JSON.parse(jsonData);
    return this.updateGroupedConfig(configData);
  }

  async resetToDefaults(): Promise<SystemConfigResponse> {
    const allSettings = await this.getAllSettings();
    const ids = allSettings.data?.map((s) => s.id) || [];
    if (ids.length > 0) {
      await this.bulkDelete(ids);
    }
    await this.initializeDefaultSettings();
    return this.getGroupedConfig();
  }

  async getSystemHealth(): Promise<{
    settings_count: number;
    last_updated: string;
    has_errors: boolean;
    categories: string[];
  }> {
    try {
      const stats = await this.getSettingsStats();
      const config = await this.getGroupedConfig();
      return {
        settings_count: stats.data?.total || 0,
        last_updated: config.data?.system_info?.current_time || new Date().toISOString(),
        has_errors: false,
        categories: config.data?.system_info?.setting_types || [],
      };
    } catch (error) {
      return {
        settings_count: 0,
        last_updated: new Date().toISOString(),
        has_errors: true,
        categories: [],
      };
    }
  }

  async validateSettings(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const config = await this.getGroupedConfig();
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!config.data) {
      errors.push("No configuration data found");
      return { valid: false, errors, warnings };
    }
    const settings = config.data.settings || [];

    // Check required settings
    const requiredSettings = [
      { category: "general", key: "company_name" },
      { category: "general", key: "default_timezone" },
    ];
    for (const req of requiredSettings) {
      const exists = settings.some(
        (s) => s.setting_type === req.category && s.key === req.key && !s.is_deleted,
      );
      if (!exists) warnings.push(`Missing setting: ${req.category}.${req.key}`);
    }

    // Validate email if enabled
    const emailEnabled = await this.getBooleanSetting("notifications", "email_enabled");
    if (emailEnabled) {
      const requiredEmail = ["smtp_host", "smtp_port", "smtp_from_email"];
      for (const key of requiredEmail) {
        const val = await this.getStringSetting("notifications", key);
        if (!val) warnings.push(`Email setting ${key} is empty but email is enabled`);
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  async getPublicSystemSettings(): Promise<PublicSystemSettings> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }
      const response = await window.backendAPI.systemConfig({
        method: "getPublicSystemSettings",
        params: {},
      });
      if (response.status) return response.data;
      throw new Error(response.message || "Failed to fetch public settings");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch public settings");
    }
  }

  async getSystemInfoForFrontend(): Promise<{
    system_info: FrontendSystemInfo;
    public_settings: any;
    cache_timestamp: string;
  }> {
    try {
      if (!window.backendAPI || !window.backendAPI.systemConfig) {
        throw new Error("Electron API not available");
      }
      const response = await window.backendAPI.systemConfig({
        method: "getSystemInfoForFrontend",
        params: {},
      });
      if (response.status) return response.data;
      throw new Error(response.message || "Failed to fetch system info");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch system info");
    }
  }
}

const systemConfigAPI = new SystemConfigAPI();
export default systemConfigAPI;