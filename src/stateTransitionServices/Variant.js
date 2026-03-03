// src/stateTransitionServices/Variant.js
// @ts-check
const ProductVariant = require("../entities/ProductVariant");
const Warehouse = require("../entities/Warehouse");
const StockItem = require("../entities/StockItem");
const ProductTaxChange = require("../entities/ProductTaxChange");
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");
const Tax = require("../entities/Tax");
class VariantStateTransitionService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.variantRepo = dataSource.getRepository(ProductVariant);
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
   * @param {ProductVariant} variant
   * @param {string} user
   */
  // @ts-ignore
  async onAfterInsert(variant, user = "system") {
    const { saveDb } = require("../utils/dbUtils/dbActions");

    // Need productId from variant (relation may be loaded or not)
    // @ts-ignore
    let productId = variant.product?.id;
    if (!productId) {
      const fullVariant = await this.variantRepo.findOne({
        // @ts-ignore
        where: { id: variant.id },
        relations: ["product"],
      });
      // @ts-ignore
      if (fullVariant?.product) {
        // @ts-ignore
        productId = fullVariant.product.id;
      } else {
        logger.error(
          // @ts-ignore
          `[VariantTransition] Could not determine productId for variant ${variant.id}`,
        );
        return;
      }
    }

    const warehouses = await this.warehouseRepo.find({
      where: { is_deleted: false, is_active: true },
    });

    for (const warehouse of warehouses) {
      const existing = await this.stockItemRepo.findOne({
        where: {
          // @ts-ignore
          product: { id: productId },
          // @ts-ignore
          variant: { id: variant.id },
          warehouse: { id: warehouse.id },
        },
      });

      if (!existing) {
        const stockItem = this.stockItemRepo.create({
          // @ts-ignore
          product: { id: productId },
          variant: variant,
          warehouse,
          quantity: 0,
          reorder_level: 0,
          low_stock_threshold: null,
        });
        // @ts-ignore
        await saveDb(this.stockItemRepo, stockItem);
        logger.info(
          // @ts-ignore
          `[VariantTransition] Created StockItem for variant ${variant.id} in warehouse ${warehouse.id}`,
        );
      }
    }
  }

  /**
   * Handle tax changes for a variant (assign/unassign taxes)
   * @param {ProductVariant} variant - The variant entity (must have taxes relation loaded)
   * @param {Array<Tax>} oldTaxes - Previous taxes list
   * @param {Array<Tax>} newTaxes - New taxes list
   * @param {string} user - User who made the change
   * @param {Object} [metadata] - Additional info (e.g., reason)
   */

  async onTaxesChanged(
    variant,
    oldTaxes,
    newTaxes,
    user = "system",
    metadata = {},
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    // @ts-ignore
    const oldGross = variant.gross_price;
    // @ts-ignore
    const oldTaxIds = (oldTaxes || []).map((t) => t.id).sort();
    // @ts-ignore
    const newTaxIds = (newTaxes || []).map((t) => t.id).sort();

    // Recalculate gross with new taxes
    const newGross = this._calculateGrossPrice(
      // @ts-ignore
      variant.net_price,
      // @ts-ignore
      newTaxes || [],
    );

    // @ts-ignore
    variant.gross_price = newGross;
    // @ts-ignore
    variant.updated_at = new Date();

    // ✅ GAMITIN ANG skipSignal PARA HINDI NA MAG-TRIGGER NG SUBSCRIBER
    // @ts-ignore
    await updateDb(this.variantRepo, variant, { skipSignal: true });

    // Create tax change record (using variantId)
    const changeData = {
      // @ts-ignore
      variantId: variant.id,
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
      "ProductVariant",
      // @ts-ignore
      variant.id,
      { gross_price: oldGross, taxIds: oldTaxIds },
      { gross_price: newGross, taxIds: newTaxIds },
      user,
    );

    logger.info(
      // @ts-ignore
      `[VariantTransition] Gross price updated for variant ${variant.id}: ${oldGross} -> ${newGross}`,
    );
  }
}

module.exports = { VariantStateTransitionService };
