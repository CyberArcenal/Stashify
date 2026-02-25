// src/lib/supplierExportApi.ts - Supplier Export API Interfaces

import { fileHandler } from "./fileHandler";
import { dialogs } from "@/renderer/utils/dialogs";
import { ExportResult } from "./product";

export interface SupplierBasic {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  status: string;
  status_display: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  can_be_deleted: boolean;
  is_approved: boolean;
  is_pending: boolean;
}

export interface SupplierExportData extends SupplierBasic {
  // Additional fields that might be needed for export
  performance_rating?: number;
  total_orders?: number;
  total_spent?: number;
  last_order_date?: string;
}

export interface SupplierExportAnalytics {
  total_suppliers: number;
  approved_suppliers: number;
  pending_suppliers: number;
  rejected_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  status_breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  recent_suppliers: number;
  approval_rate: number;
  rejection_rate: number;
  activity_breakdown: Array<{
    is_active: boolean;
    count: number;
    percentage: number;
  }>;
}

export interface SupplierExportParams {
  format?: "csv" | "excel" | "pdf";
  status?: string;
  search?: string;
  is_active?: boolean;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  time_range?: "24h" | "7d" | "30d" | "90d";
  has_tax_id?: boolean;
  has_contact_person?: boolean;
}

export interface SupplierExportResponse {
  status: boolean;
  message: string;
  data: {
    suppliers: SupplierExportData[];
    analytics: SupplierExportAnalytics;
    filters: {
      status?: string;
      search?: string;
      is_active?: boolean;
      start_date?: string;
      end_date?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
    };
  };
}

export interface SupplierBusinessInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  impact_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class SupplierExportAPI {
  /**
   * Export suppliers data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportSuppliers(params: SupplierExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Suppliers exported successfully in ${params.format.toUpperCase()} format.\n\n` +
            `File: ${fileInfo.filename}\nLocation: ${fileInfo.fullPath}\n\n` +
            `Do you want to open the file now?`,
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
              "The file was exported successfully but could not be opened automatically.\n" +
                "You can find it in your InventoryPro folder inside Downloads.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export suppliers");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export suppliers. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export suppliers");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<SupplierExportParams, "format">,
  ): Promise<SupplierExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "getExportPreview",
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
   * Get supplier status filter options based on Django STATUS_CHOICES
   */
  getSupplierStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "approved", label: "Approved" },
      { value: "pending", label: "Pending" },
      { value: "rejected", label: "Rejected" },
    ];
  }

  /**
   * Get time range filter options
   */
  getTimeRangeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "24h", label: "Last 24 Hours" },
      { value: "7d", label: "Last 7 Days" },
      { value: "30d", label: "Last 30 Days" },
      { value: "90d", label: "Last 90 Days" },
    ];
  }

  /**
   * Generate business insights from analytics data
   */
  generateBusinessInsights(
    analytics: SupplierExportAnalytics,
    suppliers: SupplierExportData[],
  ): SupplierBusinessInsight[] {
    const insights: SupplierBusinessInsight[] = [];

    if (analytics.pending_suppliers > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${analytics.pending_suppliers} suppliers awaiting approval`,
        recommendation:
          "Review and process pending supplier applications promptly",
        impact_level: "HIGH",
      });
    }

    if (analytics.total_suppliers > 0 && analytics.approval_rate < 0.5) {
      insights.push({
        priority: "MEDIUM",
        finding: `Low supplier approval rate (${(analytics.approval_rate * 100).toFixed(1)}%)`,
        recommendation: "Review approval criteria and qualification process",
        impact_level: "MEDIUM",
      });
    }

    if (analytics.total_suppliers > 0 && analytics.rejection_rate > 0.3) {
      insights.push({
        priority: "MEDIUM",
        finding: `High supplier rejection rate (${(analytics.rejection_rate * 100).toFixed(1)}%)`,
        recommendation:
          "Evaluate supplier qualification and onboarding process",
        impact_level: "MEDIUM",
      });
    }

    if (analytics.inactive_suppliers > 0) {
      insights.push({
        priority: "LOW",
        finding: `${analytics.inactive_suppliers} inactive suppliers`,
        recommendation: "Review and potentially archive inactive suppliers",
        impact_level: "LOW",
      });
    }

    const suppliersWithoutTaxId = suppliers.filter(
      (s) => !s.tax_id || s.tax_id.trim() === "",
    ).length;
    if (suppliersWithoutTaxId > 0) {
      insights.push({
        priority: "MEDIUM",
        finding: `${suppliersWithoutTaxId} suppliers missing tax ID information`,
        recommendation: "Request tax ID updates from suppliers for compliance",
        impact_level: "MEDIUM",
      });
    }

    const suppliersWithoutContact = suppliers.filter(
      (s) => !s.contact_person || s.contact_person.trim() === "",
    ).length;
    if (suppliersWithoutContact > 0) {
      insights.push({
        priority: "LOW",
        finding: `${suppliersWithoutContact} suppliers missing contact person information`,
        recommendation:
          "Update supplier contact information for better communication",
        impact_level: "LOW",
      });
    }

    if (analytics.recent_suppliers > 10) {
      insights.push({
        priority: "LOW",
        finding: `High supplier growth (${analytics.recent_suppliers} new suppliers in selected period)`,
        recommendation:
          "Monitor supplier performance and maintain quality standards",
        impact_level: "LOW",
      });
    }

    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Supplier management appears healthy and well-maintained",
        recommendation:
          "Continue current supplier management practices and regular reviews",
        impact_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate supplier management performance score (0-100)
   */
  calculateSupplierPerformanceScore(
    analytics: SupplierExportAnalytics,
    suppliers: SupplierExportData[],
  ): number {
    let score = 100;

    const pendingRatio =
      analytics.total_suppliers > 0
        ? analytics.pending_suppliers / analytics.total_suppliers
        : 0;

    if (pendingRatio > 0.2) {
      score -= 30;
    } else if (pendingRatio > 0.1) {
      score -= 15;
    }

    if (analytics.approval_rate < 0.5) {
      score -= 20;
    } else if (analytics.approval_rate < 0.7) {
      score -= 10;
    }

    if (analytics.rejection_rate > 0.3) {
      score -= 15;
    } else if (analytics.rejection_rate > 0.2) {
      score -= 8;
    }

    const inactiveRatio =
      analytics.total_suppliers > 0
        ? analytics.inactive_suppliers / analytics.total_suppliers
        : 0;

    if (inactiveRatio > 0.3) {
      score -= 10;
    } else if (inactiveRatio > 0.2) {
      score -= 5;
    }

    if (analytics.approval_rate > 0.8) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get supplier performance level
   */
  getSupplierPerformanceLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 75) return "GOOD";
    if (score >= 60) return "FAIR";
    return "POOR";
  }

  /**
   * Format supplier data for display
   */
  formatSupplierDisplay(supplier: SupplierExportData): string {
    return `${supplier.name} - ${supplier.contact_person} - ${supplier.status_display}`;
  }

  /**
   * Get supplier status color
   */
  getSupplierStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      approved: "green",
      pending: "orange",
      rejected: "red",
    };
    return colors[status] || "gray";
  }

  /**
   * Get activity status color
   */
  getActivityStatusColor(isActive: boolean): string {
    return isActive ? "green" : "red";
  }

  /**
   * Get approval status color
   */
  getApprovalStatusColor(isApproved: boolean): string {
    return isApproved ? "green" : "orange";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: SupplierExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.status &&
      !this.getSupplierStatusOptions().some(
        (opt) => opt.value === params.status,
      )
    ) {
      errors.push("Invalid supplier status");
    }

    if (params.start_date && params.end_date) {
      const start = new Date(params.start_date);
      const end = new Date(params.end_date);
      if (start > end) {
        errors.push("Start date cannot be after end date");
      }
    }

    return errors;
  }

  /**
   * Get export history
   */
  async getExportHistory(): Promise<
    Array<{
      id: number;
      filename: string;
      format: string;
      record_count: number;
      generated_at: string;
      generated_by: string;
      file_size: string;
      filters: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "getExportHistory",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch export history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch export history");
    }
  }

  /**
   * Schedule recurring export
   */
  async scheduleExport(schedule: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    format: string;
    filters: Omit<SupplierExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "scheduleExport",
        params: schedule,
      });

      if (response.status) {
        return {
          id: response.data.id,
          message: response.message || "Export scheduled successfully",
        };
      }
      throw new Error(response.message || "Failed to schedule export");
    } catch (error: any) {
      throw new Error(error.message || "Failed to schedule export");
    }
  }

  /**
   * Cancel scheduled export
   */
  async cancelScheduledExport(scheduleId: number): Promise<void> {
    try {
      if (!window.backendAPI || !window.backendAPI.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "cancelScheduledExport",
        params: { scheduleId },
      });

      if (response.status) {
        return;
      }
      throw new Error(response.message || "Failed to cancel scheduled export");
    } catch (error: any) {
      throw new Error(error.message || "Failed to cancel scheduled export");
    }
  }

  /**
   * Get export templates
   */
  async getExportTemplates(): Promise<
    Array<{
      id: number;
      name: string;
      description: string;
      filters: Omit<SupplierExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "getExportTemplates",
        params: {},
      });

      if (response.status) {
        return response.data;
      }
      throw new Error(response.message || "Failed to fetch export templates");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch export templates");
    }
  }

  /**
   * Save export template
   */
  async saveExportTemplate(template: {
    name: string;
    description: string;
    filters: Omit<SupplierExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.supplierExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.supplierExport({
        method: "saveExportTemplate",
        params: template,
      });

      if (response.status) {
        return {
          id: response.data.id,
          message: response.message || "Template saved successfully",
        };
      }
      throw new Error(response.message || "Failed to save template");
    } catch (error: any) {
      throw new Error(error.message || "Failed to save template");
    }
  }

  /**
   * Get supplier analytics summary
   */
  getSupplierAnalyticsSummary(analytics: SupplierExportAnalytics): {
    total_suppliers: number;
    approved_suppliers: number;
    pending_suppliers: number;
    active_suppliers: number;
    approval_rate: number;
    rejection_rate: number;
    recent_growth: number;
    health_score: number;
  } {
    return {
      total_suppliers: analytics.total_suppliers,
      approved_suppliers: analytics.approved_suppliers,
      pending_suppliers: analytics.pending_suppliers,
      active_suppliers: analytics.active_suppliers,
      approval_rate: analytics.approval_rate,
      rejection_rate: analytics.rejection_rate,
      recent_growth: analytics.recent_suppliers,
      health_score: this.calculateSupplierPerformanceScore(analytics, []),
    };
  }

  /**
   * Get supplier performance metrics
   */
  getSupplierPerformanceMetrics(supplier: SupplierExportData): {
    completeness_score: number;
    compliance_score: number;
    activity_score: number;
    overall_score: number;
  } {
    let completeness_score = 100;
    let compliance_score = 100;
    let activity_score = 100;

    if (!supplier.contact_person || supplier.contact_person.trim() === "") {
      completeness_score -= 20;
    }
    if (!supplier.email || supplier.email.trim() === "") {
      completeness_score -= 15;
    }
    if (!supplier.phone || supplier.phone.trim() === "") {
      completeness_score -= 15;
    }
    if (!supplier.address || supplier.address.trim() === "") {
      completeness_score -= 10;
    }

    if (!supplier.tax_id || supplier.tax_id.trim() === "") {
      compliance_score -= 30;
    }
    if (supplier.status === "rejected") {
      compliance_score -= 40;
    } else if (supplier.status === "pending") {
      compliance_score -= 20;
    }

    if (!supplier.is_active) {
      activity_score -= 50;
    }
    if (!supplier.is_approved) {
      activity_score -= 30;
    }

    const overall_score =
      (completeness_score + compliance_score + activity_score) / 3;

    return {
      completeness_score: Math.max(0, completeness_score),
      compliance_score: Math.max(0, compliance_score),
      activity_score: Math.max(0, activity_score),
      overall_score: Math.max(0, overall_score),
    };
  }

  /**
   * Calculate supplier risk assessment
   */
  calculateSupplierRisk(supplier: SupplierExportData): {
    risk_level: "LOW" | "MEDIUM" | "HIGH";
    risk_factors: string[];
    risk_score: number;
  } {
    const risk_factors: string[] = [];
    let risk_score = 0;

    if (!supplier.is_active) {
      risk_factors.push("Supplier is inactive");
      risk_score += 30;
    }

    if (!supplier.is_approved) {
      risk_factors.push("Supplier not approved");
      risk_score += 40;
    }

    if (!supplier.tax_id || supplier.tax_id.trim() === "") {
      risk_factors.push("Missing tax ID");
      risk_score += 20;
    }

    if (!supplier.contact_person || supplier.contact_person.trim() === "") {
      risk_factors.push("Missing contact person");
      risk_score += 10;
    }

    if (supplier.status === "rejected") {
      risk_factors.push("Supplier was rejected");
      risk_score += 50;
    }

    let risk_level: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (risk_score >= 60) risk_level = "HIGH";
    else if (risk_score >= 30) risk_level = "MEDIUM";

    return {
      risk_level,
      risk_factors,
      risk_score: Math.min(100, risk_score),
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Format number with commas
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(number);
  }

  // PRIVATE HELPER METHODS

  private _getMimeType(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      csv: "text/csv",
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };
    return mimeTypes[format] || "application/octet-stream";
  }
}

export const supplierExportAPI = new SupplierExportAPI();
