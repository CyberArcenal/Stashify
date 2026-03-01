// electron-app/main/ipc/handlers/ProductVariantExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { AppDataSource } = require("../../../db/datasource");
const ProductVariant = require("../../../../entities/ProductVariant");
const StockItem = require("../../../../entities/StockItem");

class ProductVariantExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "Stashify",
      "product_variant_exports",
    );

    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }

    this.excelJS = null;
    this._initializeExcelJS();
  }

  async _initializeExcelJS() {
    try {
      this.excelJS = require("exceljs");
    } catch (error) {
      console.warn(
        "ExcelJS not available for enhanced Excel export:",
        // @ts-ignore
        error.message,
      );
    }
  }

  // @ts-ignore
  // @ts-ignore
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`ProductVariantExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportVariants(params);
        case "exportPreview":
          return await this.getExportPreview(params);
        case "getSupportedFormats":
          return {
            status: true,
            message: "Supported formats fetched",
            data: this.getSupportedFormats(),
          };
        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("ProductVariantExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  // @ts-ignore
  async exportVariants(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      const variants = await this._getBaseVariantsData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(variants, params);
          break;
        case "excel":
          result = await this._exportExcel(variants, params);
          break;
        case "pdf":
          result = await this._exportPDF(variants, params);
          break;
      }

      // @ts-ignore
      const filepath = path.join(this.EXPORT_DIR, result.filename);
      const fileBuffer = fs.readFileSync(filepath);
      const base64Content = fileBuffer.toString("base64");

      return {
        status: true,
        // @ts-ignore
        message: `Export completed: ${result.filename}`,
        data: {
          content: base64Content,
          // @ts-ignore
          filename: result.filename,
          // @ts-ignore
          fileSize: result.fileSize,
          mimeType: this._getMimeType(format),
          fullPath: filepath,
        },
      };
    } catch (error) {
      console.error("exportVariants error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export variants: ${error.message}`,
        data: null,
      };
    }
  }

  // @ts-ignore
  async getExportPreview(params) {
    try {
      const variants = await this._getBaseVariantsData(params);
      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          variants: variants.slice(0, 10),
          totalCount: variants.length,
        },
      };
    } catch (error) {
      console.error("getExportPreview error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to generate preview: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * @param {{ product: any; category: any; search: any; low_stock: string; }} params
   */
  async _getBaseVariantsData(params) {
    const variantRepo = AppDataSource.getRepository(ProductVariant);

    const stockSubQuery = variantRepo
      .createQueryBuilder()
      .subQuery()
      .select("COALESCE(SUM(si.quantity), 0)")
      .from(StockItem, "si")
      .where("si.variantId = pv.id")
      .andWhere("si.is_deleted = 0")
      .getQuery();

    // ✅ Correct raw EXISTS
    const lowStockExists = `EXISTS(SELECT 1 FROM "stock_items" "si" WHERE "si"."variantId" = "pv"."id" AND "si"."quantity" < "si"."low_stock_threshold" AND "si"."low_stock_threshold" IS NOT NULL)`;

    const queryBuilder = variantRepo
      .createQueryBuilder("pv")
      .leftJoinAndSelect("pv.product", "p")
      .leftJoinAndSelect("p.category", "c")
      .select([
        "pv.id",
        "pv.sku",
        "pv.name",
        "p.name as product_name",
        "p.sku as product_sku",
        "c.name as category_name",
        "pv.net_price",
        "pv.cost_per_item",
        "pv.barcode",
        "pv.created_at",
      ])
      .addSelect(`(${stockSubQuery})`, "total_stock")
      .addSelect(lowStockExists, "has_low_stock")
      .where("pv.is_deleted = 0")
      .andWhere("p.is_deleted = 0");

    if (params.product) {
      queryBuilder.andWhere("pv.productId = :productId", {
        productId: params.product,
      });
    }
    if (params.category) {
      queryBuilder.andWhere("p.categoryId = :categoryId", {
        categoryId: params.category,
      });
    }
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(pv.name LIKE :search OR pv.sku LIKE :search OR p.name LIKE :search OR pv.barcode LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("p.name").addOrderBy("pv.name");

    const variants = await queryBuilder.getRawMany();

    const processedVariants = [];
    for (const variant of variants) {
      const totalStock = parseInt(variant.total_stock) || 0;
      const lowStockFlag = !!parseInt(variant.has_low_stock);

      let status = "In Stock";
      if (totalStock === 0) {
        status = "Out of Stock";
      } else if (lowStockFlag) {
        status = "Low Stock";
      }

      processedVariants.push({
        SKU: variant.pv_sku || "",
        Name: variant.pv_name || "",
        "Product Name": variant.product_name || "",
        "Product SKU": variant.product_sku || "",
        Category: variant.category_name || "Uncategorized",
        "Net Price": parseFloat(variant.pv_net_price || 0).toFixed(2),
        Cost:
          variant.pv_cost_per_item > 0
            ? parseFloat(variant.pv_cost_per_item).toFixed(2)
            : "N/A",
        Stock: totalStock,
        Status: status,
        Barcode: variant.pv_barcode || "",
        "Created Date": new Date(variant.pv_created_at).toLocaleDateString(),
      });
    }

    if (params.low_stock === "true") {
      return processedVariants.filter((v) => v.Status === "Low Stock");
    }
    return processedVariants;
  }

  /**
   * Export data as CSV
   * @param {any[]} variants
   * @param {any} params
   */
  // @ts-ignore
  // @ts-ignore
  async _exportCSV(variants, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `product_variants_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    let csvContent = [];
    csvContent.push("Product Variants List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Variants: ${variants.length}`);
    csvContent.push("");

    if (variants.length > 0) {
      const headers = Object.keys(variants[0]);
      csvContent.push(headers.join(","));

      variants.forEach((variant) => {
        const row = headers.map((header) => {
          const value = variant[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        });
        csvContent.push(row.join(","));
      });
    }

    fs.writeFileSync(filepath, csvContent.join("\n"), "utf8");
    const stats = fs.statSync(filepath);

    return {
      filename: filename,
      fileSize: this._formatFileSize(stats.size),
    };
  }

  /**
   * Export data as Excel
   * @param {any[]} variants
   * @param {any} params
   */
  async _exportExcel(variants, params) {
    try {
      if (!this.excelJS) {
        throw new Error("ExcelJS not available");
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_variants_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Product Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Variants");

      worksheet.columns = [
        { header: "SKU", key: "sku", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Product Name", key: "product_name", width: 20 },
        { header: "Product SKU", key: "product_sku", width: 15 },
        { header: "Category", key: "category", width: 15 },
        { header: "Net Price", key: "net_price", width: 12 },
        { header: "Cost", key: "cost", width: 10 },
        { header: "Stock", key: "stock", width: 8 },
        { header: "Status", key: "status", width: 12 },
        { header: "Barcode", key: "barcode", width: 15 },
        { header: "Created Date", key: "created_date", width: 12 },
      ];

      const titleRow = worksheet.addRow(["Product Variants List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells("A1:K1");

      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${variants.length} variants`,
      ]);
      worksheet.mergeCells("A2:K2");
      subtitleRow.font = { size: 9, italic: true };
      subtitleRow.height = 15;

      worksheet.addRow([]);

      const headerRow = worksheet.getRow(4);
      // @ts-ignore
      headerRow.values = worksheet.columns.map((col) => col.header);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 20;
      headerRow.border = {
        bottom: { style: "thin", color: { argb: "000000" } },
      };

      variants.forEach((variant, index) => {
        const row = worksheet.addRow([
          variant.SKU,
          variant.Name,
          variant["Product Name"],
          variant["Product SKU"],
          variant.Category,
          variant["Net Price"] !== "N/A"
            ? parseFloat(variant["Net Price"])
            : "N/A",
          variant.Cost !== "N/A" ? parseFloat(variant.Cost) : "N/A",
          parseInt(variant.Stock),
          variant.Status,
          variant.Barcode,
          variant["Created Date"],
        ]);

        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        const netPriceCell = row.getCell(6);
        const costCell = row.getCell(7);

        if (netPriceCell.value && netPriceCell.value !== "N/A") {
          netPriceCell.numFmt = '"$"#,##0.00';
          netPriceCell.alignment = { horizontal: "right" };
        }

        if (costCell.value && costCell.value !== "N/A") {
          costCell.numFmt = '"$"#,##0.00';
          costCell.alignment = { horizontal: "right" };
        }

        row.getCell(8).alignment = { horizontal: "center" }; // Stock

        const statusCell = row.getCell(9);
        if (variant.Status === "Out of Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
        } else if (variant.Status === "Low Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" },
          };
        }
      });

      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      if (variants.length > 0) {
        worksheet.autoFilter = {
          from: { row: 4, column: 1 },
          to: { row: 4 + variants.length, column: 11 },
        };
      }

      await workbook.xlsx.writeFile(filepath);
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      return await this._exportCSV(variants, params);
    }
  }

  /**
   * Export data as PDF
   * @param {any[]} variants
   * @param {any} params
   */
  async _exportPDF(variants, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(variants, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_variants_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Product Variants List",
          Author: "Product Management System",
          CreationDate: new Date(),
        },
        bufferPages: true,
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      // Title
      doc.fontSize(14).font("Helvetica-Bold").text("Product Variants List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${variants.length} variants`,
          { align: "center" },
        );

      doc.moveDown(0.5);

      if (variants.length === 0) {
        doc.fontSize(11).text("No variants found.", { align: "center" });
        doc.end();
        await new Promise((resolve, reject) => {
          // @ts-ignore
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });

        const stats = fs.statSync(filepath);
        return {
          filename: filename,
          fileSize: this._formatFileSize(stats.size),
        };
      }

      const pageWidth = 842; // A4 landscape width
      const pageHeight = 595;
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // ✅ Bagong column widths – eksaktong 100% ang kabuuan
      const columnWidths = [
        availableWidth * 0.1, // SKU
        availableWidth * 0.15, // Name
        availableWidth * 0.12, // Product Name
        availableWidth * 0.1, // Product SKU
        availableWidth * 0.09, // Category
        availableWidth * 0.06, // Net Price
        availableWidth * 0.05, // Cost
        availableWidth * 0.04, // Stock
        availableWidth * 0.07, // Status
        availableWidth * 0.12, // Barcode (mas malaki para sa довгих barcode)
        availableWidth * 0.1, // Created Date
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "SKU",
        "Name",
        "Product Name",
        "Product SKU",
        "Category",
        "Net Price",
        "Cost",
        "Stock",
        "Status",
        "Barcode",
        "Created Date",
      ];

      // Draw header
      doc
        .rect(leftMargin, currentY, availableWidth, rowHeight)
        .fillColor("#4A6FA5")
        .fill();

      doc.fillColor("white").fontSize(8).font("Helvetica-Bold");

      let xPos = leftMargin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 3, currentY + 4, {
          width: columnWidths[i] - 6,
          align: this._getColumnAlignment(header),
        });
        xPos += columnWidths[i];
      });

      currentY += rowHeight;
      doc.fontSize(8).font("Helvetica");

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];

        // New page if needed
        if (currentY + rowHeight > pageHeight - 20) {
          doc.addPage({ size: "A4", layout: "landscape", margin: 20 });
          currentY = 20;

          // Redraw header
          doc
            .rect(leftMargin, currentY, availableWidth, rowHeight)
            .fillColor("#4A6FA5")
            .fill();

          doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
          xPos = leftMargin;
          headers.forEach((header, j) => {
            doc.text(header, xPos + 3, currentY + 4, {
              width: columnWidths[j] - 6,
              align: this._getColumnAlignment(header),
            });
            xPos += columnWidths[j];
          });
          currentY += rowHeight;

          doc.fontSize(8).font("Helvetica");
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
        xPos = leftMargin;
        for (let j = 0; j < columnWidths.length; j++) {
          doc
            .moveTo(xPos, currentY)
            .lineTo(xPos, currentY + rowHeight)
            .strokeColor("#CCCCCC")
            .stroke();
          xPos += columnWidths[j];
        }
        doc
          .moveTo(leftMargin, currentY + rowHeight)
          .lineTo(leftMargin + availableWidth, currentY + rowHeight)
          .strokeColor("#CCCCCC")
          .stroke();

        // Cell content
        doc.fillColor("#000000");
        xPos = leftMargin;

        const variantData = [
          variant.SKU,
          variant.Name,
          variant["Product Name"],
          variant["Product SKU"],
          variant.Category,
          variant["Net Price"],
          variant.Cost,
          variant.Stock.toString(),
          variant.Status,
          variant.Barcode,
          variant["Created Date"],
        ];

        variantData.forEach((cellValue, j) => {
          let displayValue = String(cellValue);

          // Truncate only very long text fields (hindi ang barcode)
          if (j === 1 && displayValue.length > 25) {
            displayValue = displayValue.substring(0, 22) + "...";
          } else if (j === 2 && displayValue.length > 20) {
            displayValue = displayValue.substring(0, 17) + "...";
          } else if (j === 3 && displayValue.length > 18) {
            displayValue = displayValue.substring(0, 15) + "...";
          }

          // Format currency
          if ((j === 5 || j === 6) && displayValue !== "N/A") {
            displayValue = "$" + displayValue;
          }

          doc.text(displayValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: this._getColumnAlignment(headers[j]),
            ellipsis: false, // Huwag gumamit ng ellipsis, mag-wrapping na lang
          });

          xPos += columnWidths[j];
        });

        currentY += rowHeight;
      }

      // ✅ FIXED: Footer na may tamang page numbering
      const range = doc.bufferedPageRange();
      const start = range.start || 0;
      const count = range.count || 0;
      for (let p = start; p < start + count; p++) {
        doc.switchToPage(p);
        doc
          .fontSize(7)
          .fillColor("#666666")
          .text(
            `Page ${p - start + 1} of ${count}`,
            leftMargin,
            pageHeight - 15,
            {
              align: "right",
              width: availableWidth,
            },
          );
      }

      doc.end();

      await new Promise((resolve, reject) => {
        // @ts-ignore
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
      });

      const stats = fs.statSync(filepath);
      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("PDF export error:", error);
      return await this._exportCSV(variants, params);
    }
  }

  // @ts-ignore
  _getColumnAlignment(header) {
    const centerAlign = ["Stock"];
    const rightAlign = ["Net Price", "Cost"];
    if (centerAlign.includes(header)) return "center";
    if (rightAlign.includes(header)) return "right";
    return "left";
  }

  getSupportedFormats() {
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
        description: "Compact table layout optimized for printing",
      },
    ];
  }

  // @ts-ignore
  _getMimeType(format) {
    const mimeTypes = {
      csv: "text/csv",
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };
    // @ts-ignore
    return mimeTypes[format] || "application/octet-stream";
  }

  // @ts-ignore
  _formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  getLowStockOptions() {
    return [
      { value: "true", label: "Low Stock Only" },
      { value: "false", label: "All Stock Levels" },
    ];
  }
}

const productVariantExportHandler = new ProductVariantExportHandler();

if (ipcMain) {
  ipcMain.handle("productVariantExport", async (event, payload) => {
    return await productVariantExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

module.exports = { ProductVariantExportHandler, productVariantExportHandler };
