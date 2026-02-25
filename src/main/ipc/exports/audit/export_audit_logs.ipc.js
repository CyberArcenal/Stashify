//@ts-check

const { exportAuditLogs } = require("./utils/auditExportUtils");

/**
 * @param {{
 *   format?: string;
 *   date_from?: string;
 *   date_to?: string;
 *   user_id?: string;
 *   action_type?: string;
 *   model_name?: string;
 *   suspicious?: boolean;
 * }} params
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params = {}) => {
  try {
    const data = await exportAuditLogs(params);
    return {
      status: true,
      message: "Export completed successfully",
      data,
    };
  } catch (error) {
    console.error("exportAuditLogs error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to export audit logs",
      data: null,
    };
  }
};