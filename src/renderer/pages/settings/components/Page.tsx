// components/SettingsPage.tsx
import React, { useState, useEffect } from "react";
import {
  Save,
  Upload,
  Building,
  Package,
  ShoppingCart,
  Truck,
  BarChart,
  Users,
  Settings as SettingsIcon,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  SystemSettingsGroup,
  SystemSettingData,
  SystemInfo,
  SystemHealth,
  systemSettingsAPI,
  GeneralSettings,
  EmailSettings,
  TaxSettings,
  PaymentSettings,
} from "@/renderer/api/systemSettings"; // Bagong import path

// Mock package.json version - in real app, import from actual package.json
const APP_VERSION = "1.0.0";

// Bagong state structure na tumutugma sa SystemSettingsGroup
interface SettingsState {
  general: GeneralSettings;
  email: EmailSettings;
  tax: TaxSettings;
  payment: PaymentSettings;
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
