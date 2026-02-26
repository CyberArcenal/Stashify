//@ts-check
const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");
const {
  buildLowStockReport,
  generateCSV,
  generateExcel,
  generatePDF,
} = require("../utils/lowStockUtils");

/**
 * @param {{
 *   category?: string;
 *   threshold_multiplier?: number;
 *   format: "pdf" | "csv" | "excel";
 * }} params
 * @param {import("typeorm").QueryRunner} queryRunner
 * @returns {Promise<{ status: boolean, message: string, data: any }>}
 */
module.exports = async (params, queryRunner) => {
  try {
    const format = params.format || "csv";
    const reportData = await buildLowStockReport(params, queryRunner);

    const downloadsPath = app.getPath("downloads");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `low_stock_report_${timestamp}.${format}`;
    const fullPath = path.join(downloadsPath, "stashly", filename);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    let fileBuffer;
    switch (format) {
      case "csv":
        fileBuffer = generateCSV(reportData);
        break;
      case "excel":
        fileBuffer = await generateExcel(reportData);
        break;
      case "pdf":
        fileBuffer = await generatePDF(reportData);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    await fs.writeFile(fullPath, fileBuffer);

    return {
      status: true,
      message: "Export successful",
      data: {
        filename: path.basename(fullPath),
        fullPath,
        fileSize: (await fs.stat(fullPath)).size,
        recordCount: reportData.stockItems.length,
      },
    };
  } catch (error) {
    console.error("exportLowStock error:", error);
    return {
      status: false,
      // @ts-ignore
      message: error.message || "Export failed",
      data: null,
    };
  }
};
