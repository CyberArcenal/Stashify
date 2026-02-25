//@ts-check
const { getSupportedFormats, SUPPORTED_FORMATS } = require("../utils/inventoryReportExportUtils");

/**
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async () => {
  try {
    const formats = getSupportedFormats();
    return {
      status: true,
      message: "Supported formats fetched",
      data: {
        formats,
        default: "pdf",
      },
    };
  } catch (error) {
    console.error("getSupportedFormats error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to get supported formats",
      data: null,
    };
  }
};