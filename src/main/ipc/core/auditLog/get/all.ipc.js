// src/main/ipc/auditLog/get/all.ipc.js

const auditLogService = require("../../../../../services/AuditLog");

/**
 * Get all audit logs with optional filtering and pagination
 * @param {Object} params - Request parameters
 * @param {string} [params.entity] - Filter by entity name
 * @param {string} [params.action] - Filter by action type
 * @param {string} [params.actor] - Filter by actor (user)
 * @param {string} [params.startDate] - Filter by start date (ISO string)
 * @param {string} [params.endDate] - Filter by end date (ISO string)
 * @param {string} [params.sortBy='timestamp'] - Sort field
 * @param {string} [params.sortOrder='DESC'] - Sort order ('ASC' or 'DESC')
 * @param {number} [params.page] - Page number (1-based)
 * @param {number} [params.limit] - Items per page
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate pagination parameters
    if (params.page !== undefined && (!Number.isInteger(params.page) || params.page < 1)) {
      return {
        status: false,
        message: "Invalid page number. Must be a positive integer.",
        data: null,
      };
    }
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1)) {
      return {
        status: false,
        message: "Invalid limit. Must be a positive integer.",
        data: null,
      };
    }

    // Prepare options for service
    const options = {
      entity: params.entity,
      action: params.action,
      actor: params.actor,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      sortBy: params.sortBy || "timestamp",
      sortOrder: params.sortOrder === "ASC" ? "ASC" : "DESC",
      page: params.page,
      limit: params.limit,
    };

    // Remove undefined values
    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    // Fetch logs from service
    const logs = await auditLogService.findAll(options);

    return {
      status: true,
      message: "Audit logs retrieved successfully",
      data: logs,
    };
  } catch (error) {
    console.error("Error in getAllAuditLogs:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve audit logs",
      data: null,
    };
  }
};