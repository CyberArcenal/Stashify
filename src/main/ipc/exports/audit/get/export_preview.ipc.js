//@ts-check
const { getExportPreview } = require("../utils/auditExportUtils");

/**
 * @param {{
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
    const data = await getExportPreview(params);
    return {
      status: true,
      message: "Export preview generated successfully",
      data,
    };
  } catch (error) {
    console.error("getExportPreview error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to generate export preview",
      data: null,
    };
  }
};