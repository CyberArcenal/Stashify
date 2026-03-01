// src/lib/auditExportApi.ts - Audit Log Export API Interfaces

import { dialogs } from "../../utils/dialogs";
import { fileHandler } from "./fileHandler";
import type { ExportResult } from "./product";

export interface AuditLogBasic {
  id: number;
  user: string;
  user_email: string;
  action_type: string;
  action_display: string;
  model_name: string;
  object_id: string;
  changes: string;
  ip_address: string;
  user_agent: string;
  is_suspicious: boolean;
  suspicious_reason: string;
  timestamp: string;
  date: string;
  time: string;
}

export interface AuditLogExportData extends AuditLogBasic {
  // Additional fields that might be needed for export
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity_score?: number;
  investigation_priority?: number;
}

export interface AuditLogExportAnalytics {
  total_logs: number;
  suspicious_count: number;
  recent_activity: number;
  action_breakdown: Array<{
    action_type: string;
    count: number;
    percentage: number;
  }>;
  model_breakdown: Array<{
    model_name: string;
    count: number;
  }>;
  user_activity: Array<{
    user__username: string;
    user__email: string;
    count: number;
  }>;
  risk_breakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  average_severity: number;
  peak_activity_hours: Array<{
    hour: number;
    count: number;
  }>;
}

export interface AuditLogExportParams {
  format?: "csv" | "excel" | "pdf";
  action_type?: string;
  model_name?: string;
  user_id?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  is_suspicious?: boolean;
  search?: string;
  time_range?: "24h" | "7d" | "30d" | "90d";
  risk_level?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  severity_min?: number;
  severity_max?: number;
}

export interface AuditLogExportResponse {
  status: boolean;
  message: string;
  data: {
    audit_logs: AuditLogExportData[];
    analytics: AuditLogExportAnalytics;
    filters: {
      action_type?: string;
      model_name?: string;
      user_id?: number;
      start_date?: string;
      end_date?: string;
      is_suspicious?: boolean;
      search?: string;
    };
    metadata: {
      generated_at: string;
      total_records: number;
      records_exported: number;
    };
  };
}

export interface SecurityInsight {
  priority: "HIGH" | "MEDIUM" | "LOW";
  finding: string;
  recommendation: string;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

class AuditLogExportAPI {
  /**
   * Export audit logs data in specified format
   * @param params Export parameters including format and filters
   * @returns Blob data for download
   */
  async exportAuditLogs(params: AuditLogExportParams): Promise<ExportResult> {
    try {
      if (!window.backendAPI?.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
        method: "export",
        params,
      });

      if (response.status && response.data) {
        const fileInfo = response.data;

        // Success dialog with option to open file
        const shouldOpen = await dialogs.confirm({
          title: "Export Successful!",
          message:
            `Audit logs exported successfully to: ${fileInfo.filename}\n\n` +
            `File saved at: ${fileInfo.fullPath}\n\n` +
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
                "You can find it in your Stashify folder inside Downloads.",
              "File Export Complete",
            );
          }
        }

        // Return the file information for UI display
        return fileInfo;
      }

      throw new Error(response.message || "Failed to export audit logs");
    } catch (error: any) {
      console.error("Export error:", error);
      await dialogs.error(
        error.message || "Failed to export audit logs. Please try again.",
        "Export Failed",
      );
      throw new Error(error.message || "Failed to export audit logs");
    }
  }

  /**
   * Get export preview data without downloading
   * @param params Export parameters
   * @returns Preview data with analytics
   */
  async getExportPreview(
    params: Omit<AuditLogExportParams, "format">,
  ): Promise<AuditLogExportResponse["data"]> {
    try {
      if (!window.backendAPI || !window.backendAPI.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
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
   * Get audit action type filter options
   */
  getActionTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: "create", label: "Create" },
      { value: "update", label: "Update" },
      { value: "delete", label: "Delete" },
      { value: "login", label: "Login" },
      { value: "logout", label: "Logout" },
      { value: "view", label: "View" },
      { value: "export", label: "Export" },
      { value: "import", label: "Import" },
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
   * Get risk level options
   */
  getRiskLevelOptions(): Array<{
    value: string;
    label: string;
    color: string;
  }> {
    return [
      { value: "LOW", label: "Low Risk", color: "green" },
      { value: "MEDIUM", label: "Medium Risk", color: "yellow" },
      { value: "HIGH", label: "High Risk", color: "orange" },
      { value: "CRITICAL", label: "Critical Risk", color: "red" },
    ];
  }

  /**
   * Generate security insights from analytics data
   */
  generateSecurityInsights(
    analytics: AuditLogExportAnalytics,
    auditLogs: AuditLogExportData[],
  ): SecurityInsight[] {
    const insights: SecurityInsight[] = [];

    // Suspicious activities insight
    if (analytics.suspicious_count > 0) {
      insights.push({
        priority: "HIGH",
        finding: `${analytics.suspicious_count} suspicious activities detected`,
        recommendation:
          "Immediately investigate flagged activities and review security protocols",
        risk_level: "HIGH",
      });
    }

    // High volume of delete operations
    const deleteCount =
      analytics.action_breakdown.find((item) => item.action_type === "delete")
        ?.count || 0;

    if (deleteCount > 50) {
      insights.push({
        priority: "HIGH",
        finding: `High number of delete operations (${deleteCount})`,
        recommendation:
          "Review deletion patterns and ensure proper authorization controls",
        risk_level: "HIGH",
      });
    }

    // High volume of login activities
    const loginCount =
      analytics.action_breakdown.find((item) => item.action_type === "login")
        ?.count || 0;

    if (loginCount > 100) {
      insights.push({
        priority: "MEDIUM",
        finding: `Unusually high login activities (${loginCount})`,
        recommendation:
          "Investigate potential brute force attacks or review authentication patterns",
        risk_level: "MEDIUM",
      });
    }

    // High recent activity
    if (analytics.recent_activity > 1000) {
      insights.push({
        priority: "MEDIUM",
        finding: `Very high recent activity (${analytics.recent_activity} actions in 7 days)`,
        recommendation:
          "Monitor for unusual patterns and consider implementing rate limiting",
        risk_level: "MEDIUM",
      });
    }

    // Multiple suspicious activities from same user
    const suspiciousUsers = new Map<string, number>();
    auditLogs
      .filter((log) => log.is_suspicious)
      .forEach((log) => {
        const count = suspiciousUsers.get(log.user) || 0;
        suspiciousUsers.set(log.user, count + 1);
      });

    for (const [user, count] of suspiciousUsers.entries()) {
      if (count > 5) {
        insights.push({
          priority: "HIGH",
          finding: `User "${user}" has ${count} suspicious activities`,
          recommendation:
            "Immediately review user permissions and investigate potential misuse",
          risk_level: "CRITICAL",
        });
      }
    }

    // High risk model activities
    const sensitiveModels = [
      "User",
      "Permission",
      "Role",
      "Setting",
      "Configuration",
    ];
    const sensitiveModelCount = analytics.model_breakdown
      .filter((model) => sensitiveModels.includes(model.model_name))
      .reduce((sum, model) => sum + model.count, 0);

    if (sensitiveModelCount > 100) {
      insights.push({
        priority: "MEDIUM",
        finding: `High activity on sensitive models (${sensitiveModelCount} operations)`,
        recommendation:
          "Review access controls and monitor sensitive data operations",
        risk_level: "MEDIUM",
      });
    }

    // Default recommendation if no issues found
    if (insights.length === 0) {
      insights.push({
        priority: "LOW",
        finding: "Audit log patterns appear normal and secure",
        recommendation:
          "Continue current monitoring practices and regular security reviews",
        risk_level: "LOW",
      });
    }

    return insights;
  }

  /**
   * Calculate security health score (0-100)
   */
  calculateSecurityHealthScore(
    analytics: AuditLogExportAnalytics,
    auditLogs: AuditLogExportData[],
  ): number {
    let score = 100;

    // Deduct for suspicious activities
    const suspiciousRatio =
      analytics.total_logs > 0
        ? analytics.suspicious_count / analytics.total_logs
        : 0;

    if (suspiciousRatio > 0.05) {
      score -= 40;
    } else if (suspiciousRatio > 0.01) {
      score -= 20;
    }

    // Deduct for high delete operations
    const deleteCount =
      analytics.action_breakdown.find((item) => item.action_type === "delete")
        ?.count || 0;

    const deleteRatio =
      analytics.total_logs > 0 ? deleteCount / analytics.total_logs : 0;

    if (deleteRatio > 0.1) {
      score -= 20;
    } else if (deleteRatio > 0.05) {
      score -= 10;
    }

    // Deduct for very high activity
    if (analytics.recent_activity > 5000) {
      score -= 15;
    } else if (analytics.recent_activity > 2000) {
      score -= 8;
    }

    // Bonus for low suspicious activity
    if (analytics.suspicious_count === 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get security health level
   */
  getSecurityHealthLevel(
    score: number,
  ): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
    if (score >= 90) return "EXCELLENT";
    if (score >= 75) return "GOOD";
    if (score >= 60) return "FAIR";
    return "POOR";
  }

  /**
   * Calculate risk level for individual audit log
   */
  calculateLogRiskLevel(log: AuditLogExportData): {
    risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    risk_score: number;
    risk_factors: string[];
  } {
    const risk_factors: string[] = [];
    let risk_score = 0;

    if (log.is_suspicious) {
      risk_factors.push("Flagged as suspicious");
      risk_score += 60;
    }

    if (log.action_type === "delete") {
      risk_factors.push("Delete operation");
      risk_score += 30;
    }

    if (log.action_type === "login") {
      risk_factors.push("Authentication event");
      risk_score += 10;
    }

    // Sensitive models
    const sensitiveModels = [
      "User",
      "Permission",
      "Role",
      "Setting",
      "Configuration",
    ];
    if (sensitiveModels.includes(log.model_name)) {
      risk_factors.push("Sensitive model access");
      risk_score += 20;
    }

    // Missing IP address
    if (!log.ip_address || log.ip_address === "N/A") {
      risk_factors.push("Missing IP address");
      risk_score += 5;
    }

    let risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (risk_score >= 70) risk_level = "CRITICAL";
    else if (risk_score >= 50) risk_level = "HIGH";
    else if (risk_score >= 25) risk_level = "MEDIUM";

    return {
      risk_level,
      risk_score: Math.min(100, risk_score),
      risk_factors,
    };
  }

  /**
   * Format audit log data for display
   */
  formatAuditLogDisplay(log: AuditLogExportData): string {
    return `${log.timestamp} - ${log.user} - ${log.action_display} - ${log.model_name}`;
  }

  /**
   * Get action type color
   */
  getActionTypeColor(actionType: string): string {
    const colors: { [key: string]: string } = {
      create: "green",
      update: "blue",
      delete: "red",
      login: "orange",
      logout: "gray",
      view: "purple",
      export: "teal",
      import: "cyan",
    };
    return colors[actionType] || "gray";
  }

  /**
   * Get risk level color
   */
  getRiskLevelColor(riskLevel: string): string {
    const colors: { [key: string]: string } = {
      LOW: "green",
      MEDIUM: "yellow",
      HIGH: "orange",
      CRITICAL: "red",
    };
    return colors[riskLevel] || "gray";
  }

  /**
   * Get suspicious status color
   */
  getSuspiciousStatusColor(isSuspicious: boolean): string {
    return isSuspicious ? "red" : "green";
  }

  /**
   * Validate export parameters
   */
  validateExportParams(params: AuditLogExportParams): string[] {
    const errors: string[] = [];

    if (params.format && !["csv", "excel", "pdf"].includes(params.format)) {
      errors.push("Invalid export format");
    }

    if (
      params.action_type &&
      !this.getActionTypeOptions().some(
        (opt) => opt.value === params.action_type,
      )
    ) {
      errors.push("Invalid action type");
    }

    if (params.start_date && params.end_date) {
      const start = new Date(params.start_date);
      const end = new Date(params.end_date);
      if (start > end) {
        errors.push("Start date cannot be after end date");
      }
    }

    if (
      params.severity_min !== undefined &&
      params.severity_max !== undefined
    ) {
      if (params.severity_min > params.severity_max) {
        errors.push("Minimum severity cannot be greater than maximum severity");
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
      if (!window.backendAPI || !window.backendAPI.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
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
    filters: Omit<AuditLogExportParams, "format">;
    recipients: string[];
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
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
      if (!window.backendAPI || !window.backendAPI.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
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
      filters: Omit<AuditLogExportParams, "format">;
      created_by: string;
      created_at: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
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
    filters: Omit<AuditLogExportParams, "format">;
  }): Promise<{ id: number; message: string }> {
    try {
      if (!window.backendAPI || !window.backendAPI.auditExport) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.auditExport({
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
   * Get audit analytics summary
   */
  getAuditAnalyticsSummary(analytics: AuditLogExportAnalytics): {
    total_logs: number;
    suspicious_count: number;
    recent_activity: number;
    security_health_score: number;
    average_severity: number;
    top_action: string;
    top_model: string;
    top_user: string;
  } {
    const topAction =
      analytics.action_breakdown.length > 0
        ? analytics.action_breakdown.reduce((prev, current) =>
            prev.count > current.count ? prev : current,
          ).action_type
        : "N/A";

    const topModel =
      analytics.model_breakdown.length > 0
        ? analytics.model_breakdown.reduce((prev, current) =>
            prev.count > current.count ? prev : current,
          ).model_name
        : "N/A";

    const topUser =
      analytics.user_activity.length > 0
        ? analytics.user_activity.reduce((prev, current) =>
            prev.count > current.count ? prev : current,
          ).user__username
        : "N/A";

    return {
      total_logs: analytics.total_logs,
      suspicious_count: analytics.suspicious_count,
      recent_activity: analytics.recent_activity,
      security_health_score: this.calculateSecurityHealthScore(analytics, []),
      average_severity: analytics.average_severity,
      top_action: topAction,
      top_model: topModel,
      top_user: topUser,
    };
  }

  /**
   * Get audit log performance metrics
   */
  getAuditLogMetrics(log: AuditLogExportData): {
    completeness_score: number;
    security_score: number;
    risk_score: number;
    overall_score: number;
  } {
    let completeness_score = 100;
    let security_score = 100;
    let risk_score = 100;

    // Completeness score calculation
    if (!log.user || log.user === "System") {
      completeness_score -= 10;
    }
    if (!log.ip_address || log.ip_address === "N/A") {
      completeness_score -= 15;
    }
    if (!log.user_agent) {
      completeness_score -= 10;
    }
    if (!log.changes || log.changes.trim() === "") {
      completeness_score -= 20;
    }

    // Security score calculation
    if (log.is_suspicious) {
      security_score -= 40;
    }
    if (log.action_type === "delete") {
      security_score -= 20;
    }

    // Risk score calculation (inverse of risk)
    const riskAssessment = this.calculateLogRiskLevel(log);
    risk_score = 100 - riskAssessment.risk_score;

    const overall_score =
      (completeness_score + security_score + risk_score) / 3;

    return {
      completeness_score: Math.max(0, completeness_score),
      security_score: Math.max(0, security_score),
      risk_score: Math.max(0, risk_score),
      overall_score: Math.max(0, overall_score),
    };
  }

  /**
   * Calculate user behavior metrics
   */
  calculateUserBehaviorMetrics(analytics: AuditLogExportAnalytics): Array<{
    username: string;
    email: string;
    total_actions: number;
    suspicious_actions: number;
    risk_score: number;
    activity_level: "LOW" | "MEDIUM" | "HIGH";
  }> {
    if (!analytics.user_activity) return [];

    return analytics.user_activity.map((user) => {
      // This is a simplified calculation - in a real scenario, you'd have more data
      let risk_score = 50; // Base score
      let suspicious_actions = 0; // This would need to be calculated from actual data

      if (user.count > 100) risk_score += 20;
      else if (user.count > 50) risk_score += 10;

      if (suspicious_actions > 0) risk_score += 30;
      else if (suspicious_actions > 5) risk_score += 50;

      let activity_level: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      if (user.count > 100) activity_level = "HIGH";
      else if (user.count > 20) activity_level = "MEDIUM";

      return {
        username: user.user__username,
        email: user.user__email,
        total_actions: user.count,
        suspicious_actions,
        risk_score: Math.min(100, risk_score),
        activity_level,
      };
    });
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /**
   * Format number with commas
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat("en-US").format(number);
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
   * Truncate text for display
   */
  truncateText(text: string, maxLength: number = 50): string {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  /**
   * Get investigation priority for audit log
   */
  getInvestigationPriority(log: AuditLogExportData): number {
    let priority = 0;

    if (log.is_suspicious) priority += 50;
    if (log.action_type === "delete") priority += 30;
    if (log.action_type === "login") priority += 10;

    const sensitiveModels = [
      "User",
      "Permission",
      "Role",
      "Setting",
      "Configuration",
    ];
    if (sensitiveModels.includes(log.model_name)) priority += 20;

    return Math.min(100, priority);
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

  private _formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const auditLogExportAPI = new AuditLogExportAPI();
