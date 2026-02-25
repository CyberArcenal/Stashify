// pages/AuditLogViewPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  User,
  Shield,
  Clock,
  FileText,
  Calendar,
  Network,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { showApiError } from "@/renderer/utils/notification";
import { auditLogAPI, AuditLogData } from "@/renderer/api/auditLog";

const AuditLogViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [auditLog, setAuditLog] = useState<AuditLogData | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert to number
  const auditLogId = id ? parseInt(id, 10) : null;

  // Fetch audit log data
  useEffect(() => {
    const fetchAuditLog = async () => {
      if (!auditLogId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const logData = await auditLogAPI.findById(auditLogId);

        if (logData) {
          setAuditLog(logData);
        } else {
          showApiError("Audit log not found");
          navigate("/audit-logs");
        }
      } catch (error) {
        console.error("Error fetching audit log:", error);
        showApiError("Failed to load audit log details");
        navigate("/audit-logs");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();
  }, [auditLogId, navigate]);

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-emerald-100 text-emerald-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "read":
        return "bg-gray-100 text-gray-800";
      case "login":
        return "bg-purple-100 text-purple-800";
      case "logout":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "create":
        return "🆕";
      case "update":
        return "✏️";
      case "delete":
        return "🗑️";
      case "read":
        return "👁️";
      case "login":
        return "🔐";
      case "logout":
        return "🚪";
      default:
        return "📝";
    }
  };

  const exportToJSON = () => {
    if (!auditLog) return;

    const logData = {
      ...auditLog,
      formatted_timestamp: formatDateTime(auditLog.timestamp),
    };

    const dataStr = JSON.stringify(logData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${auditLog.id}-${formatDate(auditLog.timestamp).replace(/,/g, "")}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const renderChanges = (changes: any) => {
    if (!changes) return null;

    try {
      const parsedChanges =
        typeof changes === "string" ? JSON.parse(changes) : changes;

      if (
        typeof parsedChanges === "object" &&
        Object.keys(parsedChanges).length > 0
      ) {
        return (
          <div className="space-y-2">
            {Object.entries(parsedChanges).map(([key, value]) => (
              <div
                key={key}
                className="flex items-start justify-between py-2 border-b last:border-b-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span
                  className="font-medium capitalize"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  {key.replace(/_/g, " ")}:
                </span>
                <div className="text-right flex-1 ml-4">
                  {Array.isArray(value) && value.length === 2 ? (
                    // Show old → new format for changes
                    <div className="space-y-1">
                      <div
                        className="text-sm line-through"
                        style={{ color: "var(--accent-red)" }}
                      >
                        {JSON.stringify(value[0])}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--accent-green)" }}
                      >
                        {JSON.stringify(value[1])}
                      </div>
                    </div>
                  ) : (
                    <pre
                      className="text-sm whitespace-pre-wrap"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      return (
        <pre
          className="text-sm whitespace-pre-wrap"
          style={{ color: "var(--sidebar-text)" }}
        >
          {JSON.stringify(parsedChanges, null, 2)}
        </pre>
      );
    } catch (error) {
      return (
        <pre
          className="text-sm whitespace-pre-wrap"
          style={{ color: "var(--sidebar-text)" }}
        >
          {changes}
        </pre>
      );
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
          <p className="mt-4" style={{ color: "var(--sidebar-text)" }}>
            Loading audit log...
          </p>
        </div>
      </div>
    );
  }

  if (!auditLog) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--background-color)" }}
      >
        <div className="text-center">
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: "var(--sidebar-text)" }}
          >
            Audit Log Not Found
          </h1>
          <p style={{ color: "var(--sidebar-text)" }}>
            The audit log with ID "{id}" does not exist.
          </p>
          <button
            onClick={() => navigate("/audit-logs")}
            className="mt-4 px-4 py-2 text-[var(--sidebar-text)] rounded-lg"
            style={{ backgroundColor: "var(--accent-blue)" }}
          >
            Back to Audit Logs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{ backgroundColor: "var(--background-color)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/audit-logs")}
            className="flex items-center mb-4"
            style={{ color: "var(--accent-blue)" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Audit Logs
          </button>

          <div className="flex justify-between items-start">
            <div>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--sidebar-text)" }}
              >
                Audit Log Details
              </h1>
              <p style={{ color: "var(--sidebar-text)" }}>
                View detailed information about this system activity
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={exportToJSON}
                className="px-4 py-2 text-[var(--sidebar-text)] rounded-lg flex items-center text-sm"
                style={{ backgroundColor: "var(--accent-green)" }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Summary */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h2
                className="text-lg font-semibold mb-4 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Activity className="w-5 h-5 mr-2" />
                Activity Summary
              </h2>

              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: "var(--card-secondary-bg)" }}
                >
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {getActionIcon(auditLog.action_type)}
                    </span>
                    <div>
                      <div
                        className="font-semibold"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {auditLog.action_type_display}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        on {auditLog.model_name}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getActionTypeColor(auditLog.action_type)}`}
                  >
                    {auditLog.action_type_display}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div
                    className="text-center p-3 rounded-lg border"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <div
                      className="font-semibold"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {auditLog.model_name}
                    </div>
                    <div style={{ color: "var(--sidebar-text)" }}>Model</div>
                  </div>
                  <div
                    className="text-center p-3 rounded-lg border"
                    style={{
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--border-color)",
                    }}
                  >
                    <div
                      className="font-semibold font-mono"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {auditLog.object_id}
                    </div>
                    <div style={{ color: "var(--sidebar-text)" }}>
                      Object ID
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Changes Details */}
            {auditLog.changes && (
              <div
                className="rounded-xl shadow-sm border p-6"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                }}
              >
                <h2
                  className="text-lg font-semibold mb-4 flex items-center"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Changes Made
                </h2>

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: "var(--card-secondary-bg)" }}
                >
                  {renderChanges(auditLog.changes)}
                </div>
              </div>
            )}

            {/* Security Information */}
            {auditLog.is_suspicious && (
              <div
                className="rounded-xl shadow-sm border p-6"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--accent-red-dark)",
                }}
              >
                <h2
                  className="text-lg font-semibold mb-4 flex items-center"
                  style={{ color: "var(--accent-red)" }}
                >
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Security Alert
                </h2>

                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: "var(--accent-red-light)" }}
                >
                  <div className="flex items-start">
                    <Shield
                      className="w-5 h-5 mr-3 mt-0.5"
                      style={{ color: "var(--accent-red)" }}
                    />
                    <div>
                      <div
                        className="font-medium"
                        style={{ color: "var(--accent-red-dark)" }}
                      >
                        Suspicious Activity Detected
                      </div>
                      {auditLog.suspicious_reason && (
                        <div
                          className="mt-1"
                          style={{ color: "var(--accent-red)" }}
                        >
                          {auditLog.suspicious_reason}
                        </div>
                      )}
                      <div
                        className="text-sm mt-2"
                        style={{ color: "var(--accent-red)" }}
                      >
                        This activity has been flagged for review by the
                        security system.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Metadata */}
          <div className="space-y-6">
            {/* User Information */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <User className="w-4 h-4 mr-2" />
                User Information
              </h3>

              <div className="space-y-3">
                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>User:</span>
                  <span
                    className="font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {auditLog.user_display || "System"}
                  </span>
                </div>

                {auditLog.user_data && (
                  <>
                    <div
                      className="flex justify-between items-center py-2 border-b"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <span style={{ color: "var(--sidebar-text)" }}>
                        Email:
                      </span>
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {auditLog.user_data.email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span style={{ color: "var(--sidebar-text)" }}>
                        Name:
                      </span>
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {auditLog.user_data.first_name}{" "}
                        {auditLog.user_data.last_name}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Technical Details */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Network className="w-4 h-4 mr-2" />
                Technical Details
              </h3>

              <div className="space-y-3">
                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>
                    IP Address:
                  </span>
                  <span
                    className="font-medium font-mono text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {auditLog.ip_address || "N/A"}
                  </span>
                </div>

                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>Log ID:</span>
                  <span
                    className="font-medium font-mono text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    #{auditLog.id}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span style={{ color: "var(--sidebar-text)" }}>Status:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      auditLog.is_suspicious
                        ? "bg-red-100 text-red-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {auditLog.is_suspicious ? "Suspicious" : "Normal"}
                  </span>
                </div>
              </div>
            </div>

            {/* Timestamp Information */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3
                className="text-sm font-medium mb-3 flex items-center"
                style={{ color: "var(--sidebar-text)" }}
              >
                <Clock className="w-4 h-4 mr-2" />
                Timestamp
              </h3>

              <div className="space-y-3">
                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>Date:</span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDate(auditLog.timestamp)}
                  </span>
                </div>

                <div
                  className="flex justify-between items-center py-2 border-b"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span style={{ color: "var(--sidebar-text)" }}>Time:</span>
                  <span
                    className="font-medium text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {new Date(auditLog.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span style={{ color: "var(--sidebar-text)" }}>Full:</span>
                  <span
                    className="font-medium text-sm text-right"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDateTime(auditLog.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div
              className="rounded-xl shadow-sm border p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <h3
                className="text-sm font-medium mb-3"
                style={{ color: "var(--sidebar-text)" }}
              >
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={exportToJSON}
                  className="p-3 rounded-lg flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: "var(--accent-green-light)",
                    color: "var(--accent-green)",
                  }}
                >
                  <Download className="w-5 h-5 mb-1" />
                  <span className="text-xs">Export JSON</span>
                </button>

                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(auditLog, null, 2),
                    )
                  }
                  className="p-3 rounded-lg flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: "var(--accent-blue-light)",
                    color: "var(--accent-blue)",
                  }}
                >
                  <FileText className="w-5 h-5 mb-1" />
                  <span className="text-xs">Copy Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Description */}
        <div
          className="mt-6 rounded-xl shadow-sm border p-6"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <h3
            className="text-sm font-medium mb-2 flex items-center"
            style={{ color: "var(--sidebar-text)" }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Activity Description
          </h3>
          <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
            {auditLogAPI.getAuditLogDescription(auditLog)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLogViewPage;
