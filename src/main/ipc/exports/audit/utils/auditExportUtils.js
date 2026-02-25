//@ts-check
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../../db/datasource");
const { AuditLog } = require("../../../../../entities/AuditLog");

const SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
const EXPORT_DIR = path.join(
  os.homedir(),
  "Downloads",
  "InventoryPro",
  "audit_log_exports",
);

// Create export directory if it doesn't exist
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// Optional dependencies
// @ts-ignore
let excelJS = null;
// @ts-ignore
let PDFKit = null;

try {
  excelJS = require("exceljs");
} catch (error) {
  console.warn("ExcelJS not available for enhanced Excel export");
}

try {
  PDFKit = require("pdfkit");
} catch (error) {
  console.warn("PDFKit not available for PDF export");
}

// ----------------------------------------------------------------------
// Helper: get action display name (tulad ng original)
// @ts-ignore
function getActionDisplay(actionType) {
  const actionMap = {
    create: "Create",
    update: "Update",
    delete: "Delete",
    read: "Read",
    login: "Login",
    logout: "Logout",
    login_failed: "Failed Login",
    password_change: "Password Change",
    password_reset: "Password Reset",
    user_create: "User Create",
    user_update: "User Update",
    user_delete: "User Delete",
    role_assign: "Role Assign",
    role_revoke: "Role Revoke",
  };
  // @ts-ignore
  return actionMap[actionType] || actionType.replace(/_/g, " ");
}

// ----------------------------------------------------------------------
// Helper: format file size
// @ts-ignore
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ----------------------------------------------------------------------
// Helper: get MIME type
// @ts-ignore
function getMimeType(format) {
  const mimeTypes = {
    csv: "text/csv",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };
  // @ts-ignore
  return mimeTypes[format] || "application/octet-stream";
}

// ----------------------------------------------------------------------
// Kunin ang audit logs base data (eksaktong replica ng _getBaseAuditLogsData)
async function getBaseAuditLogsData(params = {}) {
  // @ts-ignore
  const { date_from, date_to, user_id, action_type, model_name, suspicious } =
    params;

  const queryBuilder = AppDataSource.createQueryBuilder(AuditLog, "a")
    .leftJoinAndSelect("a.user", "u") // assuming relation "user" exists
    .select([
      "a.id",
      "a.created_at",
      "a.action",
      "a.entity", // original uses action_type and model_name; we map accordingly
      "a.entityId",
      "a.description",
      "a.ip_address",
      "a.user_agent",
      "a.is_suspicious",
      "a.suspicious_reason",
      "u.username",
      "u.email",
    ])
    .where("a.is_deleted = 0");

  if (date_from) {
    queryBuilder.andWhere("DATE(a.created_at) >= :date_from", { date_from });
  }
  if (date_to) {
    queryBuilder.andWhere("DATE(a.created_at) <= :date_to", { date_to });
  }
  if (user_id && user_id !== "all") {
    queryBuilder.andWhere("a.user_id = :user_id", { user_id });
  }
  if (action_type && action_type !== "all") {
    queryBuilder.andWhere("a.action = :action_type", { action_type });
  }
  if (model_name && model_name !== "all") {
    queryBuilder.andWhere("a.entity LIKE :model_name", {
      model_name: `%${model_name}%`,
    });
  }
  if (suspicious === true) {
    queryBuilder.andWhere("a.is_suspicious = 1");
  } else if (suspicious === false) {
    queryBuilder.andWhere("a.is_suspicious = 0");
  }

  queryBuilder.orderBy("a.created_at", "DESC");

  const logs = await queryBuilder.getMany();

  // Process logs to match original format
  return logs.map((log) => ({
    // @ts-ignore
    Date: new Date(log.created_at).toLocaleDateString(),
    // @ts-ignore
    Time: new Date(log.created_at).toLocaleTimeString(),
    // @ts-ignore
    User: log.user?.username || "System",
    // @ts-ignore
    "User Email": log.user?.email || "system@localhost",
    Action: getActionDisplay(log.action),
    Model: log.entity || "N/A",
    "Object ID": log.entityId?.toString() || "N/A",
    // @ts-ignore
    "IP Address": log.ip_address || "N/A",
    // @ts-ignore
    Suspicious: log.is_suspicious ? "Yes" : "No",
    // @ts-ignore
    "Suspicious Reason": log.suspicious_reason || "",
    // @ts-ignore
    "User Agent": log.user_agent || "",
  }));
}

// ----------------------------------------------------------------------
// CSV export
// @ts-ignore
async function exportCSV(logs, params) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit_log_list_${timestamp}.csv`;
  const filepath = path.join(EXPORT_DIR, filename);

  const lines = [];
  lines.push("Audit Log List");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push(`Total Logs: ${logs.length}`);
  lines.push("");

  if (logs.length > 0) {
    const headers = Object.keys(logs[0]);
    lines.push(headers.join(","));

    // @ts-ignore
    logs.forEach((log) => {
      const row = headers.map((h) => {
        const val = log[h];
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      });
      lines.push(row.join(","));
    });
  } else {
    lines.push("No data available");
  }

  fs.writeFileSync(filepath, lines.join("\n"), "utf8");
  const stats = fs.statSync(filepath);

  return { filename, fileSize: formatFileSize(stats.size) };
}

// ----------------------------------------------------------------------
// Excel export (gamit ang exceljs kung available)
// @ts-ignore
async function exportExcel(logs, params) {
  // @ts-ignore
  if (!excelJS) {
    // fallback to CSV
    return await exportCSV(logs, params);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit_log_list_${timestamp}.xlsx`;
  const filepath = path.join(EXPORT_DIR, filename);

  const workbook = new excelJS.Workbook();
  workbook.creator = "Audit Log Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Audit Logs");

  // Define columns
  const columns = [
    { header: "Date", key: "Date", width: 12 },
    { header: "Time", key: "Time", width: 10 },
    { header: "User", key: "User", width: 15 },
    { header: "User Email", key: "User Email", width: 20 },
    { header: "Action", key: "Action", width: 15 },
    { header: "Model", key: "Model", width: 15 },
    { header: "Object ID", key: "Object ID", width: 12 },
    { header: "IP Address", key: "IP Address", width: 15 },
    { header: "Suspicious", key: "Suspicious", width: 12 },
    { header: "Suspicious Reason", key: "Suspicious Reason", width: 25 },
  ];
  worksheet.columns = columns;

  // Title row
  const titleRow = worksheet.addRow(["Audit Log List"]);
  titleRow.font = { bold: true, size: 14 };
  worksheet.mergeCells(`A1:J1`);

  // Subtitle
  const subtitleRow = worksheet.addRow([
    `Generated: ${new Date().toLocaleString()} | Total: ${logs.length} logs`,
  ]);
  worksheet.mergeCells(`A2:J2`);
  subtitleRow.font = { size: 9, italic: true };

  // Empty row
  worksheet.addRow([]);

  // Header row (row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.values = columns.map((c) => c.header);
  headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "4472C4" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 20;

  // Data rows
  // @ts-ignore
  logs.forEach((log, index) => {
    const row = worksheet.addRow([
      log["Date"],
      log["Time"],
      log["User"],
      log["User Email"],
      log["Action"],
      log["Model"],
      log["Object ID"],
      log["IP Address"],
      log["Suspicious"],
      log["Suspicious Reason"],
    ]);

    // Zebra striping
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F2F2F2" },
      };
    }

    // Highlight suspicious rows
    if (log["Suspicious"] === "Yes") {
      const suspiciousCell = row.getCell(9);
      suspiciousCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFC7CE" },
      };
    }
  });

  // Freeze header
  worksheet.views = [{ state: "frozen", ySplit: 4 }];

  // Auto-filter
  if (logs.length > 0) {
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + logs.length, column: 10 },
    };
  }

  await workbook.xlsx.writeFile(filepath);
  const stats = fs.statSync(filepath);

  return { filename, fileSize: formatFileSize(stats.size) };
}

// ----------------------------------------------------------------------
// PDF export (gamit ang pdfkit kung available)
// @ts-ignore
async function exportPDF(logs, params) {
  // @ts-ignore
  if (!PDFKit) {
    return await exportCSV(logs, params);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `audit_log_list_${timestamp}.pdf`;
  const filepath = path.join(EXPORT_DIR, filename);

  const doc = new PDFKit({ size: "A4", layout: "landscape", margin: 20 });
  const writeStream = fs.createWriteStream(filepath);
  doc.pipe(writeStream);

  // Title
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Audit Log List", { align: "center" });
  doc
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Generated: ${new Date().toLocaleDateString()} | Total: ${logs.length} logs`,
      { align: "center" },
    );
  doc.moveDown(0.5);

  if (logs.length === 0) {
    doc.fontSize(11).text("No audit logs found.", { align: "center" });
    doc.end();
    await new Promise((resolve, reject) => {
      // @ts-ignore
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });
    const stats = fs.statSync(filepath);
    return { filename, fileSize: formatFileSize(stats.size) };
  }

  // Table dimensions
  const pageWidth = 842;
  const leftMargin = 20;
  const rightMargin = 20;
  const availableWidth = pageWidth - leftMargin - rightMargin;

  const columnWidths = [
    availableWidth * 0.08, // Date
    availableWidth * 0.06, // Time
    availableWidth * 0.1, // User
    availableWidth * 0.13, // User Email
    availableWidth * 0.1, // Action
    availableWidth * 0.1, // Model
    availableWidth * 0.08, // Object ID
    availableWidth * 0.1, // IP Address
    availableWidth * 0.08, // Suspicious
    availableWidth * 0.17, // Suspicious Reason
  ];

  const headers = [
    "Date",
    "Time",
    "User",
    "User Email",
    "Action",
    "Model",
    "Object ID",
    "IP Address",
    "Suspicious",
    "Suspicious Reason",
  ];
  const rowHeight = 15;
  let currentY = doc.y;

  // Helper to draw table header
  // @ts-ignore
  const drawHeader = (y) => {
    doc
      .rect(leftMargin, y, availableWidth, rowHeight)
      .fillColor("#4A6FA5")
      .fill();
    doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
    let x = leftMargin;
    headers.forEach((header, i) => {
      doc.text(header, x + 3, y + 4, {
        width: columnWidths[i] - 6,
        align: "center",
      });
      x += columnWidths[i];
    });
  };

  drawHeader(currentY);
  currentY += rowHeight;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    // New page if needed
    if (currentY + rowHeight > 595 - 20) {
      doc.addPage({ size: "A4", layout: "landscape", margin: 20 });
      currentY = 20;
      drawHeader(currentY);
      currentY += rowHeight;
    }

    // Zebra striping
    if (i % 2 === 0) {
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#F8F9FA")
        .fill();
    } else {
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#FFFFFF")
        .fill();
    }

    // Cell borders
    doc.lineWidth(0.2);
    let x = leftMargin;
    for (let j = 0; j < columnWidths.length; j++) {
      doc
        .moveTo(x, currentY)
        .lineTo(x, currentY + rowHeight)
        .strokeColor("#CCCCCC")
        .stroke();
      x += columnWidths[j];
    }
    doc
      .moveTo(leftMargin, currentY + rowHeight)
      .lineTo(leftMargin + availableWidth, currentY + rowHeight)
      .strokeColor("#CCCCCC")
      .stroke();

    // Cell content
    doc.fillColor("#000000");
    x = leftMargin;
    const rowData = [
      log["Date"],
      log["Time"],
      log["User"],
      log["User Email"],
      log["Action"],
      log["Model"],
      log["Object ID"],
      log["IP Address"],
      log["Suspicious"],
      log["Suspicious Reason"],
    ];
    rowData.forEach((value, j) => {
      let cellValue = String(value);
      if (j === 3 && cellValue.length > 20)
        cellValue = cellValue.substring(0, 17) + "...";
      if (j === 9 && cellValue.length > 25)
        cellValue = cellValue.substring(0, 22) + "...";
      if (j === 4 && cellValue.length > 12)
        cellValue = cellValue.substring(0, 9) + "...";
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(cellValue, x + 3, currentY + 4, {
          width: columnWidths[j] - 6,
          align: j === 8 ? "center" : "left",
        });
      x += columnWidths[j];
    });

    currentY += rowHeight;
  }

  // Page numbers
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(7)
      .fillColor("#666666")
      .text(`Page ${i + 1} of ${pageCount}`, leftMargin, 595 - 15, {
        align: "right",
        width: availableWidth,
      });
  }

  doc.end();
  await new Promise((resolve, reject) => {
    // @ts-ignore
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  const stats = fs.statSync(filepath);
  return { filename, fileSize: formatFileSize(stats.size) };
}

// ----------------------------------------------------------------------
// Main export function
// @ts-ignore
async function exportAuditLogs(params) {
  const format = params.format || "csv";
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new Error(
      `Unsupported format. Supported: ${SUPPORTED_FORMATS.join(", ")}`,
    );
  }

  const logs = await getBaseAuditLogsData(params);

  let result;
  switch (format) {
    case "csv":
      result = await exportCSV(logs, params);
      break;
    case "excel":
      result = await exportExcel(logs, params);
      break;
    case "pdf":
      result = await exportPDF(logs, params);
      break;
  }

  // @ts-ignore
  const filepath = path.join(EXPORT_DIR, result.filename);
  const fileBuffer = fs.readFileSync(filepath);
  const base64Content = fileBuffer.toString("base64");

  return {
    content: base64Content,
    // @ts-ignore
    filename: result.filename,
    // @ts-ignore
    fileSize: result.fileSize,
    mimeType: getMimeType(format),
    fullPath: filepath,
  };
}

// ----------------------------------------------------------------------
// Preview function (first 10 logs)
// @ts-ignore
async function getExportPreview(params) {
  const logs = await getBaseAuditLogsData(params);
  return {
    logs: logs.slice(0, 10),
    totalCount: logs.length,
  };
}

// ----------------------------------------------------------------------
// Supported formats (tulad ng original)
function getSupportedFormats() {
  return [
    {
      value: "csv",
      label: "CSV",
      description:
        "Simple text format compatible with all spreadsheet software",
    },
    {
      value: "excel",
      label: "Excel",
      description:
        "Microsoft Excel format with formatting and auto-fit columns",
    },
    {
      value: "pdf",
      label: "PDF (Landscape)",
      description:
        "Compact table layout optimized for printing - uses landscape orientation",
    },
  ];
}

module.exports = {
  exportAuditLogs,
  getExportPreview,
  getSupportedFormats,
  SUPPORTED_FORMATS,
};
