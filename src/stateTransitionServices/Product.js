// src/stateTransitionServices/Product.js
// @ts-check
const Product = require("../entities/Product");
const Warehouse = require("../entities/Warehouse");
const StockItem = require("../entities/StockItem");
const ProductTaxChange = require("../entities/ProductTaxChange");
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const Tax = require("../entities/Tax");

class ProductStateTransitionService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.productRepo = dataSource.getRepository(Product);
    this.taxChangeRepo = dataSource.getRepository(ProductTaxChange);
    this.warehouseRepo = dataSource.getRepository(Warehouse);
    this.stockItemRepo = dataSource.getRepository(StockItem);
  }

  /**
   * Calculate gross price based on net price and list of taxes
   * @param {number} netPrice
   * @param {Array<{type: string, rate: number, is_enabled?: boolean, is_deleted?: boolean}>} taxes
   * @returns {number}
   * @private
   */
  _calculateGrossPrice(netPrice, taxes) {
    if (!taxes || taxes.length === 0) return netPrice;

    let gross = netPrice;
    const activeTaxes = taxes.filter((t) => t.is_enabled && !t.is_deleted);

    for (const tax of activeTaxes) {
      if (tax.type === "percentage") {
        gross = gross * (1 + tax.rate / 100);
      } else {
        // fixed amount
        gross = gross + tax.rate;
      }
    }
    return gross;
  }

  /**
   * Handle after‑insert events: create stock items for all active warehouses
   * @param {Product} product
   * @param {string} user
   */
  // @ts-ignore
  // @ts-ignore
  async onAfterInsert(product, user = "system") {
    const { saveDb } = require("../utils/dbUtils/dbActions");

    const warehouses = await this.warehouseRepo.find({
      where: { is_deleted: false, is_active: true },
    });

    for (const warehouse of warehouses) {
      const existing = await this.stockItemRepo.findOne({
        where: {
          // @ts-ignore
          product: { id: product.id },
          variant: null,
          warehouse: { id: warehouse.id },
        },
      });

      if (!existing) {
        const stockItem = this.stockItemRepo.create({
          // @ts-ignore
          product: product,
          warehouse,
          quantity: 0,
          reorder_level: 0,
          low_stock_threshold: null,
        });
        // @ts-ignore
        await saveDb(this.stockItemRepo, stockItem);
        logger.info(
          // @ts-ignore
          `[ProductTransition] Created StockItem for product ${product.id} in warehouse ${warehouse.id}`,
        );
      }
    }
  }

  /**
   * Handle tax changes for a product (assign/unassign taxes)
   * @param {Product} product - The product entity (must have taxes relation loaded)
   * @param {Array<Tax>} oldTaxes - Previous taxes list
   * @param {Array<Tax>} newTaxes - New taxes list
   * @param {string} user - User who made the change
   * @param {Object} [metadata] - Additional info (e.g., reason)
   */

  async onTaxesChanged(
    product,
    oldTaxes,
    newTaxes,
    user = "system",
    metadata = {},
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const repo = this.productRepo; // dapat nakukuha sa constructor

    // @ts-ignore
    const oldGross = product.gross_price;
    // @ts-ignore
    const oldTaxIds = (oldTaxes || []).map((t) => t.id).sort();
    // @ts-ignore
    const newTaxIds = (newTaxes || []).map((t) => t.id).sort();

    // Recalculate gross with new taxes
    const newGross = this._calculateGrossPrice(
      // @ts-ignore
      product.net_price,
      // @ts-ignore
      newTaxes || [],
    );

    // @ts-ignore
    product.gross_price = newGross;
    // @ts-ignore
    product.updated_at = new Date();

    // ✅ GAMITIN ANG skipSignal PARA HINDI NA MAG-TRIGGER NG SUBSCRIBER
    // @ts-ignore
    await updateDb(repo, product, { skipSignal: true });

    // Create tax change record
    const changeData = {
      // @ts-ignore
      productId: product.id,
      old_tax_ids: oldTaxIds,
      new_tax_ids: newTaxIds,
      old_gross_price: oldGross,
      new_gross_price: newGross,
      changed_by: user,
      // @ts-ignore
      reason: metadata.reason || "Tax assignments changed",
    };

    const change = this.taxChangeRepo.create(changeData);
    // @ts-ignore
    await saveDb(this.taxChangeRepo, change);

    await auditLogger.logUpdate(
      "Product",
      // @ts-ignore
      product.id,
      { gross_price: oldGross, taxIds: oldTaxIds },
      { gross_price: newGross, taxIds: newTaxIds },
      user,
    );

    logger.info(
      // @ts-ignore
      `[ProductTransition] Gross price updated for product ${product.id}: ${oldGross} -> ${newGross}`,
    );
  }
}

module.exports = { ProductStateTransitionService };
