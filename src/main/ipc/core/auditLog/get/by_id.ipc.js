// src/main/ipc/auditLog/get/by_id.ipc.js

const auditLogService = require("../../../../../services/AuditLog");

/**
 * Get a single audit log by its ID
 * @param {Object} params - Request parameters
 * @param {number} params.id - ID of the audit log
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params) => {
  try {
    // Validate required id
    if (!params.id) {
      return {
        status: false,
        message: "Missing required parameter: id",
        data: null,
      };
    }

    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        status: false,
        message: "Invalid id. Must be a positive integer.",
        data: null,
      };
    }

    // Fetch log from service
    const log = await auditLogService.findById(id);

    return {
      status: true,
      message: "Audit log retrieved successfully",
      data: log,
    };
  } catch (error) {
    console.error("Error in getAuditLogById:", error);
    return {
      status: false,
      message: error.message || "Failed to retrieve audit log",
      data: null,
    };
  }
};