

// ============================================================================
// Pure utility functions for notifications
// ============================================================================

import type { NotificationsSettings } from "../../api/core/system_config";
import { useSettings } from "../../contexts/SettingsContext";

/**
 * Format a notification message by replacing placeholders like {customer}.
 * @param template - Message template with placeholders in curly braces
 * @param data - Object containing replacement values
 */
export const formatNotificationMessage = (
  template: string,
  data: Record<string, string | number>
): string => {
  return template.replace(/{(\w+)}/g, (_, key) => String(data[key] ?? `{${key}}`));
};

/**
 * Truncate a message to a certain length, appending ellipsis if needed.
 */
export const truncateMessage = (message: string, maxLength: number): string => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3) + "...";
};

// ============================================================================
// Custom hooks for notifications settings
// ============================================================================

// ----- Core flags -----
export const useEmailEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "email_enabled", false);
};

export const useSmsEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "sms_enabled", false);
};

export const useSmsProvider = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "sms_provider", "");
};

export const usePushNotificationsEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "push_notifications_enabled", false);
};

export const useLowStockAlertEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "low_stock_alert_enabled", false);
};

export const useDailySalesSummaryEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "daily_sales_summary_enabled", false);
};

// ----- Legacy alert flags -----
export const useEnableEmailAlerts = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "enable_email_alerts", false);
};

export const useEnableSmsAlerts = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "enable_sms_alerts", false);
};

export const useReminderIntervalHours = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("notifications", "reminder_interval_hours", 24);
};

// ----- SMTP settings -----
export const useSmtpHost = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "smtp_host", "");
};

export const useSmtpPort = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("notifications", "smtp_port", 587);
};

export const useSmtpUsername = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "smtp_username", "");
};

export const useSmtpPassword = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "smtp_password", "");
};

export const useSmtpUseSsl = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "smtp_use_ssl", true);
};

export const useSmtpFromEmail = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "smtp_from_email", "");
};

export const useSmtpFromName = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "smtp_from_name", "");
};

// ----- Twilio settings -----
export const useTwilioAccountSid = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "twilio_account_sid", "");
};

export const useTwilioAuthToken = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "twilio_auth_token", "");
};

export const useTwilioPhoneNumber = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "twilio_phone_number", "");
};

export const useTwilioMessagingServiceSid = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("notifications", "twilio_messaging_service_sid", "");
};

// ----- Supplier notifications -----
export const useNotifySupplierWithSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_with_sms", false);
};

export const useNotifySupplierWithEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_with_email", false);
};

export const useNotifySupplierOnCompleteEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_on_complete_email", false);
};

export const useNotifySupplierOnCompleteSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_on_complete_sms", false);
};

export const useNotifySupplierOnCancelEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_on_cancel_email", false);
};

export const useNotifySupplierOnCancelSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_on_cancel_sms", false);
};

export const useNotifySupplierPurchaseConfirmedEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_purchase_confirmed_email", false);
};

export const useNotifySupplierPurchaseConfirmedSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_purchase_confirmed_sms", false);
};

export const useNotifySupplierPurchaseReceivedEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_purchase_received_email", false);
};

export const useNotifySupplierPurchaseReceivedSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_purchase_received_sms", false);
};

export const useNotifySupplierPurchaseCancelledEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_purchase_cancelled_email", false);
};

export const useNotifySupplierPurchaseCancelledSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_supplier_purchase_cancelled_sms", false);
};

// ----- Customer notifications -----
export const useNotifyCustomerReturnProcessedEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_return_processed_email", false);
};

export const useNotifyCustomerReturnProcessedSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_return_processed_sms", false);
};

export const useNotifyCustomerReturnCancelledEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_return_cancelled_email", false);
};

export const useNotifyCustomerReturnCancelledSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_return_cancelled_sms", false);
};

export const useNotifyCustomerOrderConfirmedEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_confirmed_email", false);
};

export const useNotifyCustomerOrderConfirmedSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_confirmed_sms", false);
};

export const useNotifyCustomerOrderCompletedEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_completed_email", false);
};

export const useNotifyCustomerOrderCompletedSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_completed_sms", false);
};

export const useNotifyCustomerOrderCancelledEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_cancelled_email", false);
};

export const useNotifyCustomerOrderCancelledSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_cancelled_sms", false);
};

export const useNotifyCustomerOrderRefundedEmail = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_refunded_email", false);
};

export const useNotifyCustomerOrderRefundedSms = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("notifications", "notify_customer_order_refunded_sms", false);
};

// ----- Full notifications settings object -----
export const useNotificationsSettings = (): Partial<NotificationsSettings> => {
  const { getSetting } = useSettings();
  return {
    email_enabled: getSetting<boolean>("notifications", "email_enabled", false),
    sms_enabled: getSetting<boolean>("notifications", "sms_enabled", false),
    sms_provider: getSetting<string>("notifications", "sms_provider", ""),
    push_notifications_enabled: getSetting<boolean>("notifications", "push_notifications_enabled", false),
    low_stock_alert_enabled: getSetting<boolean>("notifications", "low_stock_alert_enabled", false),
    daily_sales_summary_enabled: getSetting<boolean>("notifications", "daily_sales_summary_enabled", false),
    enable_email_alerts: getSetting<boolean>("notifications", "enable_email_alerts", false),
    enable_sms_alerts: getSetting<boolean>("notifications", "enable_sms_alerts", false),
    reminder_interval_hours: getSetting<number>("notifications", "reminder_interval_hours", 24),
    smtp_host: getSetting<string>("notifications", "smtp_host", ""),
    smtp_port: getSetting<number>("notifications", "smtp_port", 587),
    smtp_username: getSetting<string>("notifications", "smtp_username", ""),
    smtp_password: getSetting<string>("notifications", "smtp_password", ""),
    smtp_use_ssl: getSetting<boolean>("notifications", "smtp_use_ssl", true),
    smtp_from_email: getSetting<string>("notifications", "smtp_from_email", ""),
    smtp_from_name: getSetting<string>("notifications", "smtp_from_name", ""),
    twilio_account_sid: getSetting<string>("notifications", "twilio_account_sid", ""),
    twilio_auth_token: getSetting<string>("notifications", "twilio_auth_token", ""),
    twilio_phone_number: getSetting<string>("notifications", "twilio_phone_number", ""),
    twilio_messaging_service_sid: getSetting<string>("notifications", "twilio_messaging_service_sid", ""),
    notify_supplier_with_sms: getSetting<boolean>("notifications", "notify_supplier_with_sms", false),
    notify_supplier_with_email: getSetting<boolean>("notifications", "notify_supplier_with_email", false),
    notify_supplier_on_complete_email: getSetting<boolean>("notifications", "notify_supplier_on_complete_email", false),
    notify_supplier_on_complete_sms: getSetting<boolean>("notifications", "notify_supplier_on_complete_sms", false),
    notify_supplier_on_cancel_email: getSetting<boolean>("notifications", "notify_supplier_on_cancel_email", false),
    notify_supplier_on_cancel_sms: getSetting<boolean>("notifications", "notify_supplier_on_cancel_sms", false),
    notify_supplier_purchase_confirmed_email: getSetting<boolean>("notifications", "notify_supplier_purchase_confirmed_email", false),
    notify_supplier_purchase_confirmed_sms: getSetting<boolean>("notifications", "notify_supplier_purchase_confirmed_sms", false),
    notify_supplier_purchase_received_email: getSetting<boolean>("notifications", "notify_supplier_purchase_received_email", false),
    notify_supplier_purchase_received_sms: getSetting<boolean>("notifications", "notify_supplier_purchase_received_sms", false),
    notify_supplier_purchase_cancelled_email: getSetting<boolean>("notifications", "notify_supplier_purchase_cancelled_email", false),
    notify_supplier_purchase_cancelled_sms: getSetting<boolean>("notifications", "notify_supplier_purchase_cancelled_sms", false),
    notify_customer_return_processed_email: getSetting<boolean>("notifications", "notify_customer_return_processed_email", false),
    notify_customer_return_processed_sms: getSetting<boolean>("notifications", "notify_customer_return_processed_sms", false),
    notify_customer_return_cancelled_email: getSetting<boolean>("notifications", "notify_customer_return_cancelled_email", false),
    notify_customer_return_cancelled_sms: getSetting<boolean>("notifications", "notify_customer_return_cancelled_sms", false),
    notify_customer_order_confirmed_email: getSetting<boolean>("notifications", "notify_customer_order_confirmed_email", false),
    notify_customer_order_confirmed_sms: getSetting<boolean>("notifications", "notify_customer_order_confirmed_sms", false),
    notify_customer_order_completed_email: getSetting<boolean>("notifications", "notify_customer_order_completed_email", false),
    notify_customer_order_completed_sms: getSetting<boolean>("notifications", "notify_customer_order_completed_sms", false),
    notify_customer_order_cancelled_email: getSetting<boolean>("notifications", "notify_customer_order_cancelled_email", false),
    notify_customer_order_cancelled_sms: getSetting<boolean>("notifications", "notify_customer_order_cancelled_sms", false),
    notify_customer_order_refunded_email: getSetting<boolean>("notifications", "notify_customer_order_refunded_email", false),
    notify_customer_order_refunded_sms: getSetting<boolean>("notifications", "notify_customer_order_refunded_sms", false),
  };
};