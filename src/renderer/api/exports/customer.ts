// src/lib/customerExportApi.ts - Customer Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { formatCurrency } from "../../utils/formatters";
import { fileHandler } from "./fileHandler";

export interface CustomerBasic {
  ID: number;
  Name: string;
  Email: string;
  Phone: string;
  Status: string;
  "Loyalty Points": number;
  "Lifetime Points": number;
  "Joined Date": string;
  "Last Updated": string;
  "Account Age (days)": number;
}

export interface CustomerExportData extends CustomerBasic {
  // Can be extended if more fields are needed
}

export interface CustomerExportAnalytics {
  total_customers: number;
  regular_count: number;
  vip_count: number;
  elite_count: number;
  total_loyalty_points: number;
  avg_loyalty_points: number;
  avg_account_age_days: number;
  customers_joined_today: number;
  customers_joined_this_week: number;
  customers_joined_this_month: number;
  status_breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export interface CustomerExportParams {
  format?: "csv" | "excel" | "pdf";
  status?: "all" | "regular" | "vip" | "elite";
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface ExportResult {
  filename: string;
  fileSize: string;
  mimeType: string;
  fullPath: string;
  downloadUrl?: string;
}

export interface CustomerExportResponse {
  status: boolean;
  message: string;
  data: {
    customers: CustomerExportData[];
    analytics: CustomerExportAnalytics;
    filters: {
      status?: string;
      search?: string;
      start_date?: string;
      end_date?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
    };
  };
}

export interface BusinessInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface ExportHistoryItem {
  id: number;
  filename: string;
  format: string;
  record_count: number;
  generated_at: string;
  generated_by: string;
  file_size: string;
  filters: any;
  export_type: string;
  created_at: string;
}

export interface ExportTemplate {
  id: number;
  name: string;
  description: string;
  filters: Omit<CustomerExportParams, "format">;
  created_by: string;
  created_at: string;
}

class CustomerExportAPI {
  /**
   * Export customers data in specified format
   * @param params Export parameters including format and filters
   * @returns Export result with file information
   */
  async exportCustomers(params: CustomerExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI || !window.backendAPI.customerExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.customerExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message: `Customers exported successfully to: ${fileInfo.filename}\n\nFile saved at: ${fileInfo.fullPath}\n\nDo you want to open the file now?`,
          confirmText: "Open File",
          cancelText: "Later",
          icon: "success",
          showCloseButton: true,
        });

        if (shouldOpen) {
          try {
            await fileHandler.openExportedFile(fileInfo.fullPath);
          } catch (openError) {
            console.error("Failed to open file:", openError);
            await dialogs.error(
              "The file was exported successfully but could not be opened automatically. " +
                "You can find it in your Downloads folder.",
              "File Export Complete",
            );
          }
        }

        return fileInfo;
      }
      throw new Error(response.message || "Failed to export customers");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export customers. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export customers");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<CustomerExportParams, "format">,
  ): Promise<CustomerExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.customerExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.customerExport({
        method: "exportPreview",
        params,
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to get export preview");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get export preview");
    }
  }

  /**
   * Get available export formats
   */
  getSupportedFormats(): Array<{
    value: string;
    label: string;
    description: string;
  }> {
    return [
      {
        value: "csv",
        label: "CSV",
        description: "Comma-separated values for spreadsheet applications",
      },
      {
        value: "excel",
        label: "Excel",
        description:
          "Microsoft Excel format with multiple sheets and formatting",
      },
      {
        value: "pdf",
        label: "PDF",
        description: "Portable Document Format for printing and sharing",
      },
    ];
  }

  /**
   * Get customer status filter options
   */
  getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "all", label: "All Statuses" },
      { value: "regular", label: "Regular" },
      { value: "vip", label: "VIP" },
      { value: "elite", label: "Elite" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: CustomerExportAnalytics,
    customers: CustomerExportData[],
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // VIP/Elite concentration
    const vipEliteTotal = analytics.vip_count + analytics.elite_count;
    if (vipEliteTotal > 0) {
      const percentage = (vipEliteTotal / analytics.total_customers) * 100;
      if (percentage > 30) {
        insights.push({
          priority: "MEDIUM",
          finding: `High percentage of VIP/Elite customers (${percentage.toFixed(1)}%)`,
          recommendation:
            "Consider launching a special loyalty program to retain these valuable customers",
          impact_level: "HIGH",
        });
      } else if (percentage < 5) {
        insights.push({
          priority: "LOW",
          finding: `Low VIP/Elite customer ratio (${percentage.toFixed(1)}%)`,
          recommendation:
            "Create incentives to upgrade regular customers to VIP status",
          impact_level: "MEDIUM",
        });
      }
    }

    // Average loyalty points
    if (analytics.avg_loyalty_points < 100) {
      insights.push({
        priority: "LOW",
        finding: `Low average loyalty points (${analytics.avg_loyalty_points.toFixed(0)} points)`,
        recommendation:
          "Encourage more purchases through point multipliers or special offers",
        impact_level: "MEDIUM",
      });
    }

    // New customers
    if (analytics.customers_joined_today === 0) {
      insights.push({
        priority: "LOW",
        finding: "No new customers joined today",
        recommendation:
          "Review marketing campaigns or consider a referral program",
        impact_level: "LOW",
      });
    } else if (analytics.customers_joined_today > 10) {
      insights.push({
        priority: "HIGH",
        finding: `High influx of new customers today (${analytics.customers_joined_today})`,
        recommendation:
          "Ensure onboarding materials are ready and support is available",
        impact_level: "HIGH",
      });
    }

    // Account age distribution
    if (analytics.avg_account_age_days < 30) {
      insights.push({
        priority: "MEDIUM",
        finding: `Average customer account age is only ${analytics.avg_account_age_days.toFixed(0)} days`,
        recommendation:
          "Focus on retention strategies to keep new customers engaged",
        impact_level: "HIGH",
      });
    } else if (analytics.avg_account_age_days > 365) {
      insights.push({
        priority: "LOW",
        finding: `Customers are long‑term (avg age ${(analytics.avg_account_age_days / 365).toFixed(1)} years)`,
        recommendation:
          "Leverage this loyalty by asking for reviews or testimonials",
        impact_level: "LOW",
      });
    }

    // Default if no issues
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Customer base appears healthy",
        recommendation: "Continue current customer engagement strategies",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate customer portfolio score (0-100)
   */
  calculateCustomerPortfolioScore(
    analytics: CustomerExportAnalytics,
    customers: CustomerExportData[],
  ): number {
    let score = 100;

    // Penalise low VIP/Elite ratio
    const vipEliteRatio = (analytics.vip_count + analytics.elite_count) / analytics.total_customers;
    if (vipEliteRatio < 0.1) score -= 15;
    else if (vipEliteRatio < 0.2) score -= 5;

    // Penalise low average loyalty points
    if (analytics.avg_loyalty_points < 50) score -= 20;
    else if (analytics.avg_loyalty_points < 200) score -= 10;

    // Reward if many new customers
    const newRatio = analytics.customers_joined_this_month / analytics.total_customers;
    if (newRatio > 0.3) score += 10;

    // Penalise if many customers with zero points
    const zeroPointCustomers = customers.filter(c => c["Loyalty Points"] === 0).length;
    const zeroRatio = zeroPointCustomers / analytics.total_customers;
    if (zeroRatio > 0.5) score -= 25;
    else if (zeroRatio > 0.2) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get customer portfolio level
   */
  getCustomerPortfolioLevel(score: number): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format customer data for display
   */
  formatCustomerDisplay(customer: CustomerExportData): string {
    return `${customer.Name} (${customer.Email}) - ${customer.Status}`;
  }

  /**
   * Get status color for UI
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      regular: "blue",
      vip: "gold",
      elite: "purple",
    };
    return colors[status.toLowerCase()] || "gray";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: CustomerExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.status &&
      !this.getStatusOptions().some((opt) => opt.value === params.status)
    ) {
      errors.push("Invalid customer status");
    }

    if (params.start_date && isNaN(Date.parse(params.start_date))) {
      errors.push("Invalid start date");
    }
    if (params.end_date && isNaN(Date.parse(params.end_date))) {
      errors.push("Invalid end date");
    }

    return errors;
  }

  /**
   * Get customer analytics summary
   */
  getCustomerAnalyticsSummary(analytics: CustomerExportAnalytics): {
    total_customers: number;
    regular_count: number;
    vip_count: number;
    elite_count: number;
    vip_elite_percentage: number;
    total_loyalty_points: number;
    avg_loyalty_points: number;
    avg_account_age_days: number;
  } {
    return {
      total_customers: analytics.total_customers,
      regular_count: analytics.regular_count,
      vip_count: analytics.vip_count,
      elite_count: analytics.elite_count,
      vip_elite_percentage:
        analytics.total_customers > 0
          ? ((analytics.vip_count + analytics.elite_count) / analytics.total_customers) * 100
          : 0,
      total_loyalty_points: analytics.total_loyalty_points,
      avg_loyalty_points: analytics.avg_loyalty_points,
      avg_account_age_days: analytics.avg_account_age_days,
    };
  }

  /**
   * Get customer retention metrics
   */
  getRetentionMetrics(customers: CustomerExportData[]): {
    active_last_30_days: number;
    active_last_90_days: number;
    churn_rate_estimate: number;
  } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const activeLast30 = customers.filter(c => new Date(c["Last Updated"]) >= thirtyDaysAgo).length;
    const activeLast90 = customers.filter(c => new Date(c["Last Updated"]) >= ninetyDaysAgo).length;

    // Simple churn estimate: customers not updated in 90 days / total
    const churned = customers.length - activeLast90;
    const churnRate = customers.length > 0 ? (churned / customers.length) * 100 : 0;

    return {
      active_last_30_days: activeLast30,
      active_last_90_days: activeLast90,
      churn_rate_estimate: churnRate,
    };
  }

  // Reuse formatting helpers from productExportAPI or define here
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(number);
  }
}

export const customerExportAPI = new CustomerExportAPI();