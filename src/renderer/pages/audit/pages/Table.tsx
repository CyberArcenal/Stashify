// pages/AuditLogsPage.tsx
import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  User,
  Shield,
  Clock,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  auditLogAPI,
  AuditLogData,
  AuditLogSearchParams,
} from "@/renderer/api/auditLog";
import { showApiError, showSuccess } from "@/renderer/utils/notification";
import {
  auditLogExportAPI,
  AuditLogExportParams,
} from "@/renderer/api/exports/audit";
import { dialogs } from "@/renderer/utils/dialogs";
import { Pagination, PaginationType } from "@/renderer/api/category";

interface Filters {
  search: string;
  user_id: string;
  action_type: string;
  model_name: string;
  object_id: string;
  start_date: string;
  end_date: string;
  is_suspicious: string;
}

interface SortConfig {
  key: keyof AuditLogData | "timestamp";
  direction: "asc" | "desc";
}

const AuditLogsPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "timestamp",
    direction: "desc",
  });
  const [viewingLog, setViewingLog] = useState<AuditLogData | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf">(
    "csv",
  );

  const [pagination, setPagination] = useState<PaginationType>({
    current_page: 1,
    total_pages: 1,
    count: 0,
    page_size: 10,
    next: null,
    previous: null,
  });

  const [filters, setFilters] = useState<Filters>({
    search: "",
    user_id: "",
    action_type: "",
    model_name: "",
    object_id: "",
    start_date: "",
    end_date: "",
    is_suspicious: "",
  });

  // Available filter options
  const actionTypes = [
    "create",
    "update",
    "delete",
    "read",
    "login",
    "logout",
    "export",
    "import",
  ];
  const modelNames = [
    "User",
    "Product",
    "Category",
    "ProductImage",
    "AuditLog",
    "Permission",
    "Role",
  ];

  // Load audit logs
  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, itemsPerPage]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      const searchParams: AuditLogSearchParams = {
        q: filters.search || undefined,
        user_id: filters.user_id ? parseInt(filters.user_id) : undefined,
        action_type: filters.action_type || undefined,
        model_name: filters.model_name || undefined,
        object_id: filters.object_id || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        is_suspicious: filters.is_suspicious
          ? filters.is_suspicious === "true"
          : undefined,
      };

      const response = await auditLogAPI.findPage(
        itemsPerPage,
        currentPage,
        searchParams,
      );
      setAuditLogs(response.data || []);
      setPagination(response.pagination);
      setFilteredLogs(response.data || []);
      setTotalItems(response.pagination?.count || response.data?.length || 0);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      showApiError("Failed to load audit logs");
      setAuditLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      user_id: "",
      action_type: "",
      model_name: "",
      object_id: "",
      start_date: "",
      end_date: "",
      is_suspicious: "",
    });
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadAuditLogs();
  };

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  // Sort and filter data
  useEffect(() => {
    let result = [...auditLogs];

    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortConfig.key === "timestamp") {
        aValue = new Date(a.timestamp).getTime();
        bValue = new Date(b.timestamp).getTime();
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredLogs(result);
  }, [auditLogs, sortConfig]);

  const toggleLogSelection = (logId: number) => {
    setSelectedLogs((prev) =>
      prev.includes(logId)
        ? prev.filter((id) => id !== logId)
        : [...prev, logId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedLogs.length === filteredLogs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(filteredLogs.map((log) => log.id));
    }
  };

  const handleViewDetails = (log: AuditLogData) => {
    setViewingLog(log);
  };

  const handleCloseDetails = () => {
    setViewingLog(null);
  };

  const handleDeleteLog = async (logId: number) => {
    const confirmed = await dialogs.confirm({
      title: "Delete?",
      message: `Are you sure you want to delete this audit log? This action cannot be undone.`,
      icon: "info",
    });
    if (!confirmed) {
      return;
    }

    try {
      await auditLogAPI.delete(logId);
      showSuccess("Audit log deleted successfully");
      loadAuditLogs();
    } catch (error: any) {
      console.error("Failed to delete audit log:", error);
      showApiError(error.message || "Failed to delete audit log");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLogs.length === 0) return;

    const confirmed = await dialogs.confirm({
      title: "Delete?",
      message: `Are you sure you want to delete ${selectedLogs.length} audit log(s)? This action cannot be undone.`,
      icon: "info",
    });
    if (!confirmed) {
      return;
    }

    try {
      await auditLogAPI.bulkDelete(selectedLogs);
      showSuccess(`${selectedLogs.length} audit log(s) deleted successfully`);
      setSelectedLogs([]);
      loadAuditLogs();
    } catch (error: any) {
      console.error("Failed to delete audit logs:", error);
      showApiError(error.message || "Failed to delete audit logs");
    }
  };

  const handleExport = async () => {
    if (auditLogs.length === 0) {
      await dialogs.warning("No audit logs available to export.");
      return;
    }
    // Show confirmation dialog
    const confirmed = await dialogs.confirm({
      title: "Export Orders",
      message: `Are you sure you want to export ${pagination.count} product(s) in ${exportFormat.toUpperCase()} format?`,
      icon: "info",
    });

    if (!confirmed) return;
    try {
      setExportLoading(true);

      const exportParams: AuditLogExportParams = {
        format: exportFormat,
        action_type: filters.action_type || undefined,
        model_name: filters.model_name || undefined,
        user_id: filters.user_id ? parseInt(filters.user_id) : undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
        is_suspicious: filters.is_suspicious
          ? filters.is_suspicious === "true"
          : undefined,
        search: filters.search || undefined,
      };

      await auditLogExportAPI.exportAuditLogs(exportParams);
      showSuccess("Export completed successfully");
    } catch (error: any) {
      console.error("Export failed:", error);
      showApiError(error.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
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

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString("en-US");
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div
      className="app-container compact-card rounded-md shadow-md border"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Page Header */}
      <div className="flex justify-between items-center mb-md">
        <div>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            Audit Logs
          </h2>
          <p className="mt-xs text-sm" style={{ color: "var(--sidebar-text)" }}>
            Monitor and review system activities and user actions
          </p>
        </div>
        <div className="flex gap-xs">
          <button
            className="rounded-md flex items-center compact-button"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="icon-sm mr-sm" />
            Filters
          </button>

          {/* Export Format Selector and Button */}
          <div
            className="flex items-center gap-xs rounded-md px-1 border"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <label
              className="text-xs font-medium whitespace-nowrap"
              style={{ color: "var(--sidebar-text)" }}
            >
              Export as:
            </label>
            <select
              value={exportFormat}
              onChange={(e) =>
                setExportFormat(e.target.value as "csv" | "excel" | "pdf")
              }
              className="compact-input border text-sm font-medium focus:ring-0 cursor-pointer px-xs py-xs rounded-md"
              style={{
                backgroundColor: "var(--card-secondary-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
            <button
              onClick={handleExport}
              disabled={exportLoading || auditLogs.length === 0}
              className="compact-button text-[var(--sidebar-text)] rounded-md flex items-center transition-colors disabled:cursor-not-allowed ml-xs"
              style={{
                backgroundColor:
                  exportLoading || auditLogs.length === 0
                    ? "var(--secondary-color)"
                    : "var(--accent-green)",
              }}
              title="Export all products"
            >
              <Download className="icon-sm mr-xs" />
              {exportLoading ? "Exporting..." : "Export"}
            </button>
          </div>

          <button
            onClick={loadAuditLogs}
            className="rounded-md flex items-center compact-button"
            style={{
              backgroundColor: "var(--card-secondary-bg)",
              color: "var(--sidebar-text)",
            }}
          >
            <RefreshCw className="icon-sm mr-sm" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm mb-md p-sm rounded-md"
          style={{ backgroundColor: "var(--card-secondary-bg)" }}
        >
          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Search
            </label>
            <div className="relative">
              <Search
                className="icon-sm absolute left-sm top-1/2 transform -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-xl pr-sm compact-input border rounded-md"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                  color: "var(--sidebar-text)",
                }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Action Type
            </label>
            <select
              value={filters.action_type}
              onChange={(e) =>
                handleFilterChange("action_type", e.target.value)
              }
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Actions</option>
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {auditLogAPI.getActionTypeDisplay(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Model
            </label>
            <select
              value={filters.model_name}
              onChange={(e) => handleFilterChange("model_name", e.target.value)}
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Models</option>
              {modelNames.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Suspicious
            </label>
            <select
              value={filters.is_suspicious}
              onChange={(e) =>
                handleFilterChange("is_suspicious", e.target.value)
              }
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            >
              <option value="">All Activities</option>
              <option value="true">Suspicious Only</option>
              <option value="false">Normal Only</option>
            </select>
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              User ID
            </label>
            <input
              type="number"
              placeholder="User ID"
              value={filters.user_id}
              onChange={(e) => handleFilterChange("user_id", e.target.value)}
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Object ID
            </label>
            <input
              type="text"
              placeholder="Object ID"
              value={filters.object_id}
              onChange={(e) => handleFilterChange("object_id", e.target.value)}
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange("start_date", e.target.value)}
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-xs"
              style={{ color: "var(--sidebar-text)" }}
            >
              End Date
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange("end_date", e.target.value)}
              className="w-full compact-input border rounded-md"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-color)",
                color: "var(--sidebar-text)",
              }}
            />
          </div>

          <div className="flex items-end gap-xs col-span-1 md:col-span-2 lg:col-span-4">
            <button
              onClick={applyFilters}
              className="flex-1 compact-button text-[var(--sidebar-text)] rounded-md"
              style={{ backgroundColor: "var(--accent-blue)" }}
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="flex-1 compact-button text-[var(--sidebar-text)] rounded-md"
              style={{ backgroundColor: "var(--primary-color)" }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk selection info */}
      {selectedLogs.length > 0 && (
        <div
          className="mb-sm p-sm rounded-md flex items-center justify-between"
          style={{
            backgroundColor: "var(--accent-blue-light)",
            borderColor: "var(--accent-blue)",
          }}
        >
          <span className="text-sm" style={{ color: "var(--accent-green)" }}>
            {selectedLogs.length} log(s) selected
          </span>
          <div className="flex gap-xs">
            <button
              onClick={handleBulkDelete}
              className="compact-button text-[var(--sidebar-text)] rounded-md"
              style={{ backgroundColor: "var(--accent-red)" }}
            >
              <Trash2 className="icon-sm" />
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-base">
          <div
            className="animate-spin rounded-full h-xl w-xl border-b-2"
            style={{ borderColor: "var(--accent-blue)" }}
          ></div>
        </div>
      )}

      {/* Audit Logs Table */}
      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y compact-table"
              style={{ borderColor: "var(--border-color)" }}
            >
              <thead style={{ backgroundColor: "var(--card-secondary-bg)" }}>
                <tr>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedLogs.length === filteredLogs.length &&
                        filteredLogs.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-3 w-3 rounded"
                      style={{ color: "var(--accent-blue)" }}
                    />
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center">
                      ID
                      {sortConfig.key === "id" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="icon-sm ml-xs" />
                        ) : (
                          <ChevronDown className="icon-sm ml-xs" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("user_display")}
                  >
                    <div className="flex items-center">
                      User
                      {sortConfig.key === "user_display" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="icon-sm ml-xs" />
                        ) : (
                          <ChevronDown className="icon-sm ml-xs" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("action_type")}
                  >
                    <div className="flex items-center">
                      Action
                      {sortConfig.key === "action_type" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="icon-sm ml-xs" />
                        ) : (
                          <ChevronDown className="icon-sm ml-xs" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("model_name")}
                  >
                    <div className="flex items-center">
                      Model
                      {sortConfig.key === "model_name" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="icon-sm ml-xs" />
                        ) : (
                          <ChevronDown className="icon-sm ml-xs" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Object ID
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    IP Address
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                    style={{ color: "var(--sidebar-text)" }}
                    onClick={() => handleSort("timestamp")}
                  >
                    <div className="flex items-center">
                      Timestamp
                      {sortConfig.key === "timestamp" &&
                        (sortConfig.direction === "asc" ? (
                          <ChevronUp className="icon-sm ml-xs" />
                        ) : (
                          <ChevronDown className="icon-sm ml-xs" />
                        ))}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--border-color)",
                }}
                className="divide-y"
              >
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ backgroundColor: "var(--card-bg)" }}
                  >
                    <td className="whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={() => toggleLogSelection(log.id)}
                        className="h-3 w-3 rounded"
                        style={{ color: "var(--accent-blue)" }}
                      />
                    </td>
                    <td
                      className="whitespace-nowrap text-sm font-mono"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      #{log.id}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center">
                        <User
                          className="icon-sm mr-sm"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                        <span
                          className="text-sm"
                          style={{ color: "var(--sidebar-text)" }}
                        >
                          {log.user_display || "System"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getActionTypeColor(log.action_type)}`}
                      >
                        {log.action_type_display}
                      </span>
                    </td>
                    <td
                      className="whitespace-nowrap text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.model_name}
                    </td>
                    <td
                      className="whitespace-nowrap text-sm font-mono"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.object_id}
                    </td>
                    <td
                      className="whitespace-nowrap text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      {log.ip_address || "N/A"}
                    </td>
                    <td
                      className="whitespace-nowrap text-sm"
                      style={{ color: "var(--sidebar-text)" }}
                    >
                      <div className="flex items-center">
                        <Clock
                          className="icon-sm mr-sm"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                        {formatDateTime(log.timestamp)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {log.is_suspicious ? (
                        <span className="inline-flex items-center px-xs py-xs rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Shield className="icon-xs mr-xs" />
                          Suspicious
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-xs py-xs rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-xs">
                        <button
                          onClick={() => handleViewDetails(log)}
                          style={{ color: "var(--accent-blue)" }}
                          title="View Details"
                        >
                          <Eye className="icon-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          style={{ color: "var(--accent-red)" }}
                          title="Delete"
                        >
                          <Trash2 className="icon-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredLogs.length === 0 && (
            <div className="text-center py-base">
              <div
                className="text-5xl mb-sm"
                style={{ color: "var(--sidebar-text)" }}
              >
                <FileText className="icon-xl mx-auto" />
              </div>
              <p className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                No audit logs found.
              </p>
              <div className="mt-sm gap-xs">
                <button
                  className="compact-button text-[var(--sidebar-text)] rounded-md"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between mt-md">
              <div className="text-sm" style={{ color: "var(--sidebar-text)" }}>
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>{" "}
                of <span className="font-medium">{totalItems}</span> results
              </div>
              <div className="flex gap-xs">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="compact-button rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Previous
                </button>
                <span
                  className="compact-button text-sm"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="compact-button rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Details Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-sm z-50">
          <div
            className="rounded-md shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--card-bg)" }}
          >
            <div
              className="border-b px-md py-sm"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="flex justify-between items-center">
                <h3
                  className="text-base font-semibold"
                  style={{ color: "var(--sidebar-text)" }}
                >
                  Audit Log Details
                </h3>
                <button
                  onClick={handleCloseDetails}
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <svg
                    className="icon-lg"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-md gap-sm">
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    ID
                  </label>
                  <p
                    className="mt-xs text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    #{viewingLog.id}
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    User
                  </label>
                  <p
                    className="mt-xs text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {viewingLog.user_display || "System"}
                    {viewingLog.user_data && (
                      <span
                        className="block"
                        style={{ color: "var(--sidebar-text)" }}
                      >
                        {viewingLog.user_data.email}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Action
                  </label>
                  <p className="mt-xs">
                    <span
                      className={`inline-flex items-center px-xs py-xs rounded-full text-xs font-medium ${getActionTypeColor(viewingLog.action_type)}`}
                    >
                      {viewingLog.action_type_display}
                    </span>
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Model
                  </label>
                  <p
                    className="mt-xs text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {viewingLog.model_name}
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Object ID
                  </label>
                  <p
                    className="mt-xs text-sm font-mono"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {viewingLog.object_id}
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    IP Address
                  </label>
                  <p
                    className="mt-xs text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {viewingLog.ip_address || "N/A"}
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Timestamp
                  </label>
                  <p
                    className="mt-xs text-sm"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    {formatDateTime(viewingLog.timestamp)}
                  </p>
                </div>
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Status
                  </label>
                  <p className="mt-xs">
                    {viewingLog.is_suspicious ? (
                      <span className="inline-flex items-center px-xs py-xs rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Shield className="icon-xs mr-xs" />
                        Suspicious
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-xs py-xs rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Normal
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {viewingLog.suspicious_reason && (
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Suspicious Reason
                  </label>
                  <p
                    className="mt-xs text-sm"
                    style={{ color: "var(--accent-red)" }}
                  >
                    {viewingLog.suspicious_reason}
                  </p>
                </div>
              )}

              {viewingLog.changes && (
                <div>
                  <label
                    className="block text-xs font-medium"
                    style={{ color: "var(--sidebar-text)" }}
                  >
                    Changes
                  </label>
                  <pre
                    className="mt-xs text-sm p-sm rounded-md overflow-x-auto"
                    style={{ backgroundColor: "var(--card-secondary-bg)" }}
                  >
                    {JSON.stringify(viewingLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              <div
                className="flex justify-end pt-sm border-t"
                style={{ borderColor: "var(--border-color)" }}
              >
                <button
                  onClick={handleCloseDetails}
                  className="compact-button rounded-md"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    color: "var(--sidebar-text)",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
