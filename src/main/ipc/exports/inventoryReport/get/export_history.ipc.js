//@ts-check
const { getExportHistory } = require("../utils/inventoryReportExportUtils");

/**
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async () => {
  try {
    const result = await getExportHistory();
    return result;
  } catch (error) {
    console.error("getExportHistory error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Failed to fetch export history",
      data: [],
    };
  }
};