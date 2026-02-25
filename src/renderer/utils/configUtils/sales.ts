
import type { SalesSettings, TaxSettings } from "../../api/core/system_config";
import { useSettings } from "../../contexts/SettingsContext";

// ============================================================================
// Pure utility functions for sales / tax calculations
// ============================================================================

/**
 * Calculate tax amount based on settings.
 * @param subtotal - Subtotal before tax
 * @param taxRate - Tax rate in percent (e.g., 12 for 12%)
 * @param calculation - "inclusive" or "exclusive"
 * @param pricesIncludeTax - Whether prices already include tax
 * @returns Tax amount
 */
export const calculateTax = (
  subtotal: number,
  taxRate: number,
  calculation: "inclusive" | "exclusive" = "inclusive",
  pricesIncludeTax: boolean = true
): number => {
  if (taxRate <= 0) return 0;
  if (calculation === "exclusive") {
    return subtotal * (taxRate / 100);
  } else {
    // inclusive
    if (pricesIncludeTax) {
      return subtotal - subtotal / (1 + taxRate / 100);
    } else {
      return subtotal * (taxRate / 100);
    }
  }
};

/**
 * Calculate discount amount.
 * @param subtotal - Amount before discount
 * @param discountPercent - Discount percentage (0-100)
 * @param maxDiscountPercent - Maximum allowed discount percent (from settings)
 * @returns Discount amount (capped if needed)
 */
export const calculateDiscount = (
  subtotal: number,
  discountPercent: number,
  maxDiscountPercent: number = 100
): number => {
  const validPercent = Math.min(Math.max(discountPercent, 0), maxDiscountPercent);
  return subtotal * (validPercent / 100);
};

/**
 * Calculate loyalty points earned.
 * @param amountSpent - Total amount spent
 * @param pointsRate - Points per currency unit (from settings)
 * @returns Points earned (rounded down)
 */
export const calculateLoyaltyPoints = (amountSpent: number, pointsRate: number): number => {
  if (pointsRate <= 0) return 0;
  return Math.floor(amountSpent * pointsRate);
};

/**
 * Check if a transaction is still refundable based on refund window.
 * @param createdAt - Transaction creation date
 * @param refundWindowDays - Allowed refund window in days
 * @returns True if within window
 */
export const isRefundable = (createdAt: string | Date, refundWindowDays: number): boolean => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  return diffDays <= refundWindowDays;
};

// ============================================================================
// Custom hooks for sales & tax settings
// ============================================================================

// ----- Sales settings -----

export const useTaxRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "tax_rate", 12);
};

export const useVatRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "vat_rate", 0.12);
};

export const useTaxCalculation = (): "inclusive" | "exclusive" => {
  const { getSetting } = useSettings();
  return getSetting<"inclusive" | "exclusive">("sales", "tax_calculation", "inclusive");
};

export const useTaxEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "tax_enabled", true);
};

export const usePricesIncludeTax = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "prices_include_tax", true);
};

export const useRoundTaxAtSubtotal = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "round_tax_at_subtotal", false);
};

export const useTaxFlatAmount = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "tax_flat_amount", 0);
};

export const useImportDutyRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "import_duty_rate", 0);
};

export const useExciseTaxRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "excise_tax_rate", 0);
};

export const useDigitalServicesTaxRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "digital_services_tax_rate", 0);
};

export const useDiscountEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "discount_enabled", true);
};

export const useMaxDiscountPercent = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "max_discount_percent", 100);
};

export const useAllowRefunds = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "allow_refunds", true);
};

export const useRefundWindowDays = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "refund_window_days", 7);
};

export const useLoyaltyPointsEnabled = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "loyalty_points_enabled", false);
};

export const useLoyaltyPointsRate = (): number => {
  const { getSetting } = useSettings();
  return getSetting<number>("sales", "loyalty_points_rate", 0);
};

export const useLoyaltyPointsEarnOnConfirm = (): boolean => {
  const { getSetting } = useSettings();
  return getSetting<boolean>("sales", "loyalty_points_earn_on_confirm", false);
};

// ----- Complete sales settings object -----
export const useSalesSettings = (): Partial<SalesSettings> => {
  const { getSetting } = useSettings();
  return {
    tax_rate: getSetting<number>("sales", "tax_rate", 12),
    vat_rate: getSetting<number>("sales", "vat_rate", 0.12),
    tax_calculation: getSetting<"inclusive" | "exclusive">("sales", "tax_calculation", "inclusive"),
    tax_enabled: getSetting<boolean>("sales", "tax_enabled", true),
    prices_include_tax: getSetting<boolean>("sales", "prices_include_tax", true),
    round_tax_at_subtotal: getSetting<boolean>("sales", "round_tax_at_subtotal", false),
    tax_flat_amount: getSetting<number>("sales", "tax_flat_amount", 0),
    import_duty_rate: getSetting<number>("sales", "import_duty_rate", 0),
    excise_tax_rate: getSetting<number>("sales", "excise_tax_rate", 0),
    digital_services_tax_rate: getSetting<number>("sales", "digital_services_tax_rate", 0),
    discount_enabled: getSetting<boolean>("sales", "discount_enabled", true),
    max_discount_percent: getSetting<number>("sales", "max_discount_percent", 100),
    allow_refunds: getSetting<boolean>("sales", "allow_refunds", true),
    refund_window_days: getSetting<number>("sales", "refund_window_days", 7),
    loyalty_points_enabled: getSetting<boolean>("sales", "loyalty_points_enabled", false),
    loyalty_points_rate: getSetting<number>("sales", "loyalty_points_rate", 0),
    loyalty_points_earn_on_confirm: getSetting<boolean>("sales", "loyalty_points_earn_on_confirm", false),
  };
};

// ----- Tax settings object (dedicated) -----
export const useTaxSettings = (): TaxSettings => {
  const { getSetting } = useSettings();
  return {
    vat_rate: getSetting<number>("sales", "vat_rate", 0.12),
    tax_rate: getSetting<number>("sales", "tax_rate", 12),
    tax_calculation: getSetting<"inclusive" | "exclusive">("sales", "tax_calculation", "inclusive"),
    display_prices: "incl_tax", // or read from a separate setting if available
    enabled: getSetting<boolean>("sales", "tax_enabled", true),
    tax_flat_amount: getSetting<number>("sales", "tax_flat_amount", 0),
    import_duty_rate: getSetting<number>("sales", "import_duty_rate", 0),
    excise_tax_rate: getSetting<number>("sales", "excise_tax_rate", 0),
    digital_services_tax_rate: getSetting<number>("sales", "digital_services_tax_rate", 0),
    round_tax_at_subtotal: getSetting<boolean>("sales", "round_tax_at_subtotal", false),
    prices_include_tax: getSetting<boolean>("sales", "prices_include_tax", true),
  };
};