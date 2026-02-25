import { fileHandler } from "./fileHandler";
import { dialogs } from "@/renderer/utils/dialogs";
import { ExportResult } from "./product";

export interface UserSecuritySettings {
  id: number;
  user: number;
  two_factor_enabled: boolean;
  alert_on_new_device: boolean;
  alert_on_password_change: boolean;
  alert_on_failed_login: boolean;
  login_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAddress {
  id: number;
  user: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: number;
  user: number;
  date_of_birth?: string;
  avatar?: string;
  bio?: string;
  preferences: {
    language: string;
    timezone: string;
    email_notifications: boolean;
    sms_notifications: boolean;
  };
  created_at: string;
  updated_at: string;
}
export interface UserExportParams {
  format?: "csv" | "excel" | "pdf";
  user_type?: string;
  status?: string;
  search?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  time_range?: "24h" | "7d" | "30d";
}

export interface UserExportAnalytics {
  total_users: number;
  user_type_breakdown: Array<{
    user_type: string;
    count: number;
    percentage: number;
  }>;
  status_breakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  recent_users: number;
  users_with_2fa: number;
  active_users: number;
  suspended_users: number;
}

export interface UserExportData {
  id: number;
  username: string;
  email: string;
  full_name: string;
  user_type: string;
  user_type_display: string;
  status: string;
  status_display: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  security_settings_data?: {
    two_factor_enabled: boolean;
    alert_on_new_device: boolean;
    alert_on_password_change: boolean;
    alert_on_failed_login: boolean;
  };
}

export interface UserExportResponse {
  status: boolean;
  message: string;
  data: {
    users: UserExportData[];
    analytics: UserExportAnalytics;
    filters: {
      user_type?: string;
      status?: string;
      search?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
    };
  };
}

export interface SecurityInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class AccountExportAPI {
  /**
   * Export user accounts data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportUserAccounts(params: UserExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `User accounts exported successfully in ${params.format.toUpperCase()} format.\n\n` +
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

      throw new Error(response.message || "Failed to export user accounts");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export user accounts. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export user accounts");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<UserExportParams, "format">,
  ): Promise<UserExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
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
   * Get user type filter options
   */
  getUserTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "admin", label: "Administrator" },
      { value: "manager", label: "Manager" },
      { value: "staff", label: "Staff" },
      { value: "customer", label: "Customer" },
      { value: "viewer", label: "Viewer" },
    ];
  }

  /**
   * Get status filter options
   */
  getStatusOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "active", label: "Active" },
      { value: "restricted", label: "Restricted" },
      { value: "suspended", label: "Suspended" },
      { value: "deleted", label: "Deleted" },
    ];
  }

  /**
   * Generate security insights from analytics data
   */
  generateSecurityInsights(analytics: UserExportAnalytics): SecurityInsight[] {
    const insights: SecurityInsight[] = [];

    const twoFaRatio = analytics.users_with_2fa / analytics.total_users;
    if (twoFaRatio < 0.5) {
      insights.push({
        priority: "HIGH",
        finding: `Low 2FA adoption (${(twoFaRatio * 100).toFixed(1)}%)`,
        recommendation:
          "Implement mandatory 2FA for all admin and manager accounts",
        risk_level: "HIGH",
      });
    }

    const suspendedRatio = analytics.suspended_users / analytics.total_users;
    if (suspendedRatio > 0.1) {
      insights.push({
        priority: "MEDIUM",
        finding: `High suspended account rate (${(suspendedRatio * 100).toFixed(1)}%)`,
        recommendation:
          "Review suspension policies and conduct account cleanup",
        risk_level: "MEDIUM",
      });
    }

    const adminCount =
      analytics.user_type_breakdown.find((item) => item.user_type === "admin")
        ?.count || 0;
    if (adminCount > 5) {
      insights.push({
        priority: "MEDIUM",
        finding: `High number of admin accounts (${adminCount})`,
        recommendation:
          "Review admin access and implement principle of least privilege",
        risk_level: "MEDIUM",
      });
    }

    if (analytics.recent_users === 0 && analytics.total_users > 10) {
      insights.push({
        priority: "LOW",
        finding: "No new user registrations in 30 days",
        recommendation:
          "Monitor user acquisition channels and onboarding process",
        risk_level: "LOW",
      });
    }

    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "User accounts appear well-managed and secure",
        recommendation:
          "Continue current security practices and regular audits",
        risk_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate security score (0-100)
   */
  calculateSecurityScore(analytics: UserExportAnalytics): number {
    let score = 100;

    const twoFaRatio = analytics.users_with_2fa / analytics.total_users;
    if (twoFaRatio < 0.5) {
      score -= 30;
    } else if (twoFaRatio < 0.8) {
      score -= 15;
    }

    const suspendedRatio = analytics.suspended_users / analytics.total_users;
    if (suspendedRatio > 0.1) {
      score -= 20;
    } else if (suspendedRatio > 0.05) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Get security score level
   */
  getSecurityScoreLevel(score: number): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "FAIR";
    return "POOR";
  }

  /**
   * Format user data for display
   */
  formatUserDisplay(user: UserExportData): string {
    return `${user.full_name} (${user.username})`;
  }

  /**
   * Get user status color
   */
  getUserStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      active: "green",
      restricted: "orange",
      suspended: "red",
      deleted: "gray",
    };
    return colors[status] || "gray";
  }

  /**
   * Get user type color
   */
  getUserTypeColor(userType: string): string {
    const colors: { [key: string]: string } = {
      admin: "red",
      manager: "blue",
      staff: "green",
      customer: "purple",
      viewer: "gray",
    };
    return colors[userType] || "gray";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: UserExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.user_type &&
      !this.getUserTypeOptions().some((opt) => opt.value === params.user_type)
    ) {
      errors.push("Invalid user type");
    }

    if (
      params.status &&
      !this.getStatusOptions().some((opt) => opt.value === params.status)
    ) {
      errors.push("Invalid status");
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
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
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
    filters: Omit<UserExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
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
      if (!window.backendAPI || !window.backendAPI.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
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
      filters: Omit<UserExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
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
    filters: Omit<UserExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.accountExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.accountExport({
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

export const accountExportAPI = new AccountExportAPI();
