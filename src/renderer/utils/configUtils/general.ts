

// ============================================================================
// Pure utility functions for general settings
// ============================================================================

import type { GeneralSettings } from "../../api/core/system_config";
import { useSettings } from "../../contexts/SettingsContext";

/**
 * Format a store location string for display.
 */
export const formatStoreLocation = (location: string): string => {
  return location.trim();
};

/**
 * Get the current time in the store's timezone.
 * (Placeholder – implement with a library like moment-timezone if needed.)
 */
export const getStoreCurrentTime = (timezone: string): Date => {
  // For now, return local time
  return new Date();
};

// ============================================================================
// Custom hooks for general settings
// ============================================================================

export const useCompanyName = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "company_name", "My Company");
};

export const useStoreLocation = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "store_location", "");
};

export const useDefaultTimezone = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "default_timezone", "Asia/Manila");
};

// Alias for default_timezone (kept for compatibility)
export const useTimezone = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "timezone", "Asia/Manila");
};

export const useCurrency = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "currency", "PHP");
};

export const useLanguage = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "language", "en");
};

export const useReceiptFooterMessage = (): string => {
  const { getSetting } = useSettings();
  return getSetting<string>("general", "receipt_footer_message", "Thank you for your purchase!");
};

export const useAutoLogoutMinutes = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("general", "auto_logout_minutes", 30);
};

// Full general settings object
export const useGeneralSettings = (): Partial<GeneralSettings> => {
  const { getSetting } = useSettings();
  return {
    company_name: getSetting<string>("general", "company_name", "My Company"),
    store_location: getSetting<string>("general", "store_location", ""),
    default_timezone: getSetting<string>("general", "default_timezone", "Asia/Manila"),
    timezone: getSetting<string>("general", "timezone", "Asia/Manila"),
    currency: getSetting<string>("general", "currency", "PHP"),
    language: getSetting<string>("general", "language", "en"),
    receipt_footer_message: getSetting<string>("general", "receipt_footer_message", "Thank you for your purchase!"),
    auto_logout_minutes: getSetting<number>("general", "auto_logout_minutes", 30),
  };
};