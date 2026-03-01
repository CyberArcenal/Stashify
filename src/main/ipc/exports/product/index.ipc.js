// electron-app/main/ipc/handlers/productExportHandler.js
// @ts-check
const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { getGeneralCurrencySign } = require("../../../../utils/settings/system");
const { AppDataSource } = require("../../../db/datasource");
const Product = require("../../../../entities/Product");
const ProductVariant = require("../../../../entities/ProductVariant");
const StockItem = require("../../../../entities/StockItem");

let currency = "$";
(async () => {
  // @ts-ignore
  currency = await getGeneralCurrencySign();
})();

class ProductExportHandler {
  constructor() {
    this.SUPPORTED_FORMATS = ["csv", "excel", "pdf"];
    this.EXPORT_DIR = path.join(
      os.homedir(),
      "Downloads",
      "Stashify",
      "product_exports",
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
  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      console.log(`ProductExportHandler: ${method}`, params);

      switch (method) {
        case "export":
          return await this.exportProducts(params);
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
      console.error("ProductExportHandler error:", error);
      return {
        status: false,
        // @ts-ignore
        message: error.message,
        data: null,
      };
    }
  }

  // @ts-ignore
  async exportProducts(params) {
    try {
      const format = params.format || "csv";

      if (!this.SUPPORTED_FORMATS.includes(format)) {
        return {
          status: false,
          message: `Unsupported format. Supported: ${this.SUPPORTED_FORMATS.join(", ")}`,
          data: null,
        };
      }

      const products = await this._getBaseProductsData(params);

      let result;
      switch (format) {
        case "csv":
          result = await this._exportCSV(products, params);
          break;
        case "excel":
          result = await this._exportExcel(products, params);
          break;
        case "pdf":
          result = await this._exportPDF(products, params);
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
      console.error("exportProducts error:", error);
      return {
        status: false,
        // @ts-ignore
        message: `Failed to export products: ${error.message}`,
        data: null,
      };
    }
  }

  // @ts-ignore
  async getExportPreview(params) {
    try {
      const products = await this._getBaseProductsData(params);
      return {
        status: true,
        message: "Export preview generated successfully",
        data: {
          products: products.slice(0, 10),
          totalCount: products.length,
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

  // @ts-ignore
  async _getBaseProductsData(params) {
    const productRepo = AppDataSource.getRepository(Product);

    const variantCountSubQuery = productRepo
      .createQueryBuilder()
      .subQuery()
      .select("COUNT(*)")
      .from(ProductVariant, "pv")
      .where("pv.productId = p.id")
      .andWhere("pv.is_deleted = 0")
      .getQuery();

    const productStockSubQuery = productRepo
      .createQueryBuilder()
      .subQuery()
      .select("COALESCE(SUM(si.quantity), 0)")
      .from(StockItem, "si")
      .where("si.productId = p.id")
      .andWhere("si.variantId IS NULL")
      .getQuery();

    const variantStockSubQuery = productRepo
      .createQueryBuilder()
      .subQuery()
      .select("COALESCE(SUM(si.quantity), 0)")
      .from(StockItem, "si")
      // @ts-ignore
      .innerJoin(ProductVariant, "pv", "si.variantId = pv.id")
      .where("pv.productId = p.id")
      .getQuery();

    const lowStockExists = `EXISTS(SELECT 1 FROM "stock_items" "si" WHERE "si"."productId" = "p"."id" AND "si"."quantity" < "si"."low_stock_threshold" AND "si"."low_stock_threshold" IS NOT NULL)`;

    const queryBuilder = productRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.category", "c")
      .select([
        "p.id",
        "p.sku",
        "p.name",
        "c.name as category_name",
        "p.net_price",
        "p.cost_per_item",
        "p.is_published",
        "p.allow_backorder",
        "p.track_quantity",
        "p.barcode", // ✅ added barcode
      ])
      .addSelect(`(${variantCountSubQuery})`, "variants_count")
      .addSelect(`(${productStockSubQuery})`, "product_stock")
      .addSelect(`(${variantStockSubQuery})`, "variant_stock")
      .addSelect(lowStockExists, "has_low_stock")
      .where("p.is_deleted = 0");

    if (params.category) {
      queryBuilder.andWhere("p.categoryId = :categoryId", {
        categoryId: params.category,
      });
    }
    if (params.status) {
      if (params.status === "published") {
        queryBuilder.andWhere("p.is_published = 1");
      } else if (params.status === "unpublished") {
        queryBuilder.andWhere("p.is_published = 0");
      }
    }
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      queryBuilder.andWhere(
        "(p.name LIKE :search OR p.sku LIKE :search OR c.name LIKE :search)",
        { search: searchTerm },
      );
    }

    queryBuilder.orderBy("p.name");

    const products = await queryBuilder.getRawMany();

    const processedProducts = [];
    for (const product of products) {
      const totalQuantity =
        (parseInt(product.product_stock) || 0) +
        (parseInt(product.variant_stock) || 0);
      const lowStockFlag = !!parseInt(product.has_low_stock);

      let status = "In Stock";
      if (totalQuantity === 0) {
        status = product.p_allow_backorder ? "Backorder" : "Out of Stock";
      } else if (lowStockFlag) {
        status = "Low Stock";
      }

      processedProducts.push({
        SKU: product.p_sku || "",
        Name: product.p_name || "",
        Category: product.category_name || "Uncategorized",
        "Net Price": parseFloat(product.p_net_price || 0).toFixed(2),
        Cost:
          product.p_cost_per_item > 0
            ? parseFloat(product.p_cost_per_item).toFixed(2)
            : "N/A",
        Stock: totalQuantity,
        Status: status,
        Published: product.p_is_published === 1 ? "Yes" : "No",
        "Variants Count": parseInt(product.variants_count) || 0,
        Barcode: product.p_barcode || "", // ✅ added barcode
      });
    }

    if (params.low_stock === "true") {
      return processedProducts.filter((p) => p.Status === "Low Stock");
    }
    return processedProducts;
  }

  // @ts-ignore
  async _exportCSV(products, params) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `product_list_${timestamp}.csv`;
    const filepath = path.join(this.EXPORT_DIR, filename);

    let csvContent = [];
    csvContent.push("Product List");
    csvContent.push(`Generated: ${new Date().toLocaleString()}`);
    csvContent.push(`Total Products: ${products.length}`);
    csvContent.push("");

    const headers = Object.keys(products[0] || {});
    csvContent.push(headers.join(","));

    // @ts-ignore
    products.forEach((product) => {
      const row = headers.map((header) => {
        const value = product[header];
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
      csvContent.push(row.join(","));
    });

    fs.writeFileSync(filepath, csvContent.join("\n"), "utf8");
    const stats = fs.statSync(filepath);

    return {
      filename: filename,
      fileSize: this._formatFileSize(stats.size),
    };
  }

  // @ts-ignore
  async _exportExcel(products, params) {
    try {
      if (!this.excelJS) throw new Error("ExcelJS not available");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_list_${timestamp}.xlsx`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const workbook = new this.excelJS.Workbook();
      workbook.creator = "Product Management System";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Products");

      // Columns now include Barcode
      worksheet.columns = [
        { header: "SKU", key: "sku", width: 12 },
        { header: "Name", key: "name", width: 35 },
        { header: "Category", key: "category", width: 15 },
        { header: "Net Price", key: "net_price", width: 12 },
        { header: "Cost", key: "cost", width: 10 },
        { header: "Stock", key: "stock", width: 8 },
        { header: "Status", key: "status", width: 12 },
        { header: "Published", key: "published", width: 10 },
        { header: "Variants", key: "variants", width: 10 },
        { header: "Barcode", key: "barcode", width: 18 }, // ✅ added
      ];

      const titleRow = worksheet.addRow(["Product List"]);
      titleRow.font = { bold: true, size: 14 };
      titleRow.height = 20;
      worksheet.mergeCells(`A1:J1`); // now 10 columns

      const subtitleRow = worksheet.addRow([
        `Generated: ${new Date().toLocaleString()} | Total: ${products.length} products`,
      ]);
      worksheet.mergeCells(`A2:J2`);
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

      // @ts-ignore
      products.forEach((product, index) => {
        const row = worksheet.addRow([
          product.SKU,
          product.Name,
          product.Category,
          product["Net Price"] !== "N/A"
            ? parseFloat(product["Net Price"])
            : "N/A",
          product.Cost !== "N/A" ? parseFloat(product.Cost) : "N/A",
          parseInt(product.Stock),
          product.Status,
          product.Published,
          parseInt(product["Variants Count"]),
          product.Barcode, // ✅ added
        ]);

        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }

        const netPriceCell = row.getCell(4);
        const costCell = row.getCell(5);

        if (netPriceCell.value && netPriceCell.value !== "N/A") {
          netPriceCell.numFmt = '"$"#,##0.00';
          netPriceCell.alignment = { horizontal: "right" };
        }
        if (costCell.value && costCell.value !== "N/A") {
          costCell.numFmt = '"$"#,##0.00';
          costCell.alignment = { horizontal: "right" };
        }

        row.getCell(6).alignment = { horizontal: "center" }; // Stock
        row.getCell(9).alignment = { horizontal: "center" }; // Variants

        const statusCell = row.getCell(7);
        if (product.Status === "Out of Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFC7CE" },
          };
        } else if (product.Status === "Low Stock") {
          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEB9C" },
          };
        }
      });

      worksheet.views = [{ state: "frozen", ySplit: 4 }];

      worksheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + products.length, column: 10 },
      };

      await workbook.xlsx.writeFile(filepath);
      const stats = fs.statSync(filepath);

      return {
        filename: filename,
        fileSize: this._formatFileSize(stats.size),
      };
    } catch (error) {
      console.error("Excel export error:", error);
      return await this._exportCSV(products, params);
    }
  }

  // @ts-ignore
  async _exportPDF(products, params) {
    try {
      let PDFKit;
      try {
        PDFKit = require("pdfkit");
      } catch (error) {
        console.warn("PDFKit not available, falling back to CSV");
        return await this._exportCSV(products, params);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `product_list_${timestamp}.pdf`;
      const filepath = path.join(this.EXPORT_DIR, filename);

      const doc = new PDFKit({
        size: "A4",
        layout: "landscape",
        margin: 20,
        info: {
          Title: "Product List",
          Author: "Product Management System",
          CreationDate: new Date(),
        },
        bufferPages: true,
      });

      const writeStream = fs.createWriteStream(filepath);
      doc.pipe(writeStream);

      doc.fontSize(14).font("Helvetica-Bold").text("Product List", {
        align: "center",
      });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total: ${products.length} products`,
          { align: "center" },
        );

      doc.moveDown(0.5);

      if (products.length === 0) {
        doc.fontSize(11).text("No products found.", { align: "center" });
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

      const pageWidth = 842;
      const pageHeight = 595;
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = doc.y;
      const availableWidth = pageWidth - leftMargin - rightMargin;

      // ✅ 10 columns (added Barcode)
      const columnWidths = [
        availableWidth * 0.1, // SKU
        availableWidth * 0.2, // Name
        availableWidth * 0.1, // Category
        availableWidth * 0.08, // Net Price
        availableWidth * 0.06, // Cost
        availableWidth * 0.06, // Stock
        availableWidth * 0.08, // Status
        availableWidth * 0.06, // Published
        availableWidth * 0.08, // Variants Count
        availableWidth * 0.18, // Barcode (larger for long codes)
      ];

      const rowHeight = 15;
      let currentY = topMargin;
      const headers = [
        "SKU",
        "Name",
        "Category",
        "Net Price",
        "Cost",
        "Stock",
        "Status",
        "Published",
        "Variants",
        "Barcode",
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

      for (let i = 0; i < products.length; i++) {
        const product = products[i];

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

        const productData = [
          product.SKU,
          product.Name,
          product.Category,
          product["Net Price"],
          product.Cost,
          product.Stock.toString(),
          product.Status,
          product.Published,
          product["Variants Count"].toString(),
          product.Barcode,
        ];

        productData.forEach((cellValue, j) => {
          let displayValue = String(cellValue);

          // Truncate long text (except barcode)
          if (j === 1 && displayValue.length > 30) {
            displayValue = displayValue.substring(0, 27) + "...";
          } else if (j === 2 && displayValue.length > 15) {
            displayValue = displayValue.substring(0, 12) + "...";
          } else if (j === 9 && displayValue.length > 30) {
            // Barcode – bigyan ng limit pero huwag putulin kung kaya; i-wrap kung sobrang haba
            // Dahil fixed row height, hindi mag-wrap, kaya kailangan tiyakin na hindi pinuputol.
            // Ibigay ang buong barcode, ngunit kung sobrang haba ay puputulin pa rin ng PDF dahil sa width.
            // Para maiwasan, pahabain ang column width.
          }

          // Format currency
          if ((j === 3 || j === 4) && displayValue !== "N/A") {
            displayValue = "$" + displayValue;
          }

          doc.text(displayValue, xPos + 3, currentY + 4, {
            width: columnWidths[j] - 6,
            align: this._getColumnAlignment(headers[j]),
          });

          xPos += columnWidths[j];
        });

        currentY += rowHeight;
      }

      // Footer
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
      return await this._exportCSV(products, params);
    }
  }

  // @ts-ignore
  _getColumnAlignment(header) {
    const centerAlign = ["Stock", "Published", "Variants"];
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
        description:
          "Compact table layout optimized for printing - uses landscape orientation",
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

  getProductStatusOptions() {
    return [
      { value: "published", label: "Published" },
      { value: "unpublished", label: "Unpublished" },
    ];
  }

  getLowStockOptions() {
    return [
      { value: "true", label: "Low Stock Only" },
      { value: "false", label: "All Stock Levels" },
    ];
  }
}

const productExportHandler = new ProductExportHandler();

if (ipcMain) {
  ipcMain.handle("productExport", async (event, payload) => {
    return await productExportHandler.handleRequest(event, payload);
  });
} else {
  console.warn(
    "ipcMain is not available - running in non-Electron environment",
  );
}

module.exports = { ProductExportHandler, productExportHandler };
