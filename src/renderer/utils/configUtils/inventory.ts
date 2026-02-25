
import type { InventorySettings } from "../../api/core/system_config";
import { useSettings } from "../../contexts/SettingsContext";

// ============================================================================
// Pure utility functions (no React dependencies)
// ============================================================================

/**
 * Determines the stock status based on current quantity and minimum threshold.
 * @param current Current stock quantity
 * @param min Minimum stock threshold (usually from settings)
 * @returns "out_of_stock", "low_stock", or "in_stock"
 */
export const getStockStatus = (current: number, min: number): string => {
  if (current === 0) return "out_of_stock";
  if (current <= min) return "low_stock";
  return "in_stock";
};

/**
 * Calculates the recommended reorder quantity based on average sales and lead time.
 * This is a simple example; you can adjust the formula as needed.
 * @param averageDailySales Average units sold per day
 * @param leadTimeDays Days it takes to receive new stock
 * @param safetyStock Optional safety stock buffer (default 0)
 * @returns Recommended reorder quantity
 */
export const calculateReorderQuantity = (
  averageDailySales: number,
  leadTimeDays: number,
  safetyStock: number = 0
): number => {
  return Math.ceil(averageDailySales * leadTimeDays + safetyStock);
};

/**
 * Checks if the current stock is below the reorder point.
 * @param currentStock Current quantity on hand
 * @param reorderPoint Threshold that triggers a reorder
 * @returns True if stock <= reorder point
 */
export const isBelowReorderPoint = (
  currentStock: number,
  reorderPoint: number
): boolean => {
  return currentStock <= reorderPoint;
};

/**
 * Calculates the total value of stock on hand.
 * @param quantity Current stock quantity
 * @param costPerUnit Cost price per unit
 * @returns Total inventory value (quantity * cost)
 */
export const calculateInventoryValue = (
  quantity: number,
  costPerUnit: number
): number => {
  return quantity * costPerUnit;
};

// ============================================================================
// Custom hooks for inventory settings (to be used inside React components)
// ============================================================================

/**
 * Hook to check if auto‑reorder is enabled.
 * Defaults to `false` if not set.
 */
export const useAutoReorderEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_reorder_enabled", false);
};

/**
 * Hook to get the default reorder level (minimum stock threshold).
 * Defaults to `10` if not set.
 */
export const useReorderLevelDefault = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("inventory", "reorder_level_default", 10);
};

/**
 * Hook to get the default reorder quantity.
 * Defaults to `0` if not set.
 */
export const useReorderQtyDefault = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("inventory", "reorder_qty_default", 0);
};

/**
 * Hook to get the stock alert threshold (low stock warning).
 * Defaults to `10` if not set.
 */
export const useStockAlertThreshold = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("inventory", "stock_alert_threshold", 10);
};

/**
 * Hook to check if negative stock is allowed.
 * Defaults to `false` if not set.
 */
export const useAllowNegativeStock = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "allow_negative_stock", false);
};

/**
 * Hook to check if inventory sync is enabled.
 * Defaults to `false` if not set.
 */
export const useInventorySyncEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "inventory_sync_enabled", false);
};

/**
 * Hook to check if stock should be automatically updated when a return is processed.
 * Defaults to `false` if not set.
 */
export const useAutoUpdateStockOnReturn = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_update_stock_on_return", false);
};

/**
 * Hook to check if stock should be automatically reversed when a return is cancelled.
 * Defaults to `false` if not set.
 */
export const useAutoReverseStockOnReturnCancel = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_reverse_stock_on_return_cancel", false);
};

/**
 * Hook to check if stock should be automatically updated when an order is confirmed.
 * Defaults to `false` if not set.
 */
export const useAutoUpdateStockOrderConfirm = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_update_stock_order_confirm", false);
};

/**
 * Hook to check if stock should be automatically updated when an order is completed.
 * Defaults to `false` if not set.
 */
export const useAutoUpdateStockOrderComplete = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_update_stock_order_complete", false);
};

/**
 * Hook to check if stock should be automatically reversed when an order is cancelled.
 * Defaults to `false` if not set.
 */
export const useAutoReverseStockOrderCancel = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_reverse_stock_order_cancel", false);
};

/**
 * Hook to check if stock should be automatically reversed when an order is refunded.
 * Defaults to `false` if not set.
 */
export const useAutoReverseStockOrderRefund = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_reverse_stock_order_refund", false);
};

/**
 * Hook to check if stock should be automatically updated when a purchase is received.
 * Defaults to `false` if not set.
 */
export const useAutoUpdateStockPurchaseReceived = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_update_stock_purchase_received", false);
};

/**
 * Hook to check if stock should be automatically reversed when a purchase is cancelled.
 * Defaults to `false` if not set.
 */
export const useAutoReverseStockPurchaseCancel = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("inventory", "auto_reverse_stock_purchase_cancel", false);
};

/**
 * Hook to get the complete inventory settings object.
 * Useful when you need multiple settings at once.
 */
export const useInventorySettings = (): Partial<InventorySettings> => {
  const { getSetting } = useSettings();
  return {
    auto_reorder_enabled: getSetting<boolean>("inventory", "auto_reorder_enabled", false),
    reorder_level_default: getSetting<number>("inventory", "reorder_level_default", 10),
    reorder_qty_default: getSetting<number>("inventory", "reorder_qty_default", 0),
    stock_alert_threshold: getSetting<number>("inventory", "stock_alert_threshold", 10),
    allow_negative_stock: getSetting<boolean>("inventory", "allow_negative_stock", false),
    inventory_sync_enabled: getSetting<boolean>("inventory", "inventory_sync_enabled", false),
    auto_update_stock_on_return: getSetting<boolean>("inventory", "auto_update_stock_on_return", false),
    auto_reverse_stock_on_return_cancel: getSetting<boolean>("inventory", "auto_reverse_stock_on_return_cancel", false),
    auto_update_stock_order_confirm: getSetting<boolean>("inventory", "auto_update_stock_order_confirm", false),
    auto_update_stock_order_complete: getSetting<boolean>("inventory", "auto_update_stock_order_complete", false),
    auto_reverse_stock_order_cancel: getSetting<boolean>("inventory", "auto_reverse_stock_order_cancel", false),
    auto_reverse_stock_order_refund: getSetting<boolean>("inventory", "auto_reverse_stock_order_refund", false),
    auto_update_stock_purchase_received: getSetting<boolean>("inventory", "auto_update_stock_purchase_received", false),
    auto_reverse_stock_purchase_cancel: getSetting<boolean>("inventory", "auto_reverse_stock_purchase_cancel", false),
  };
};