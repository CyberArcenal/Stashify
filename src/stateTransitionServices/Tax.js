// src/StateTransitionServices/Tax.js
// @ts-check
const Tax = require("../entities/Tax");
const Product = require("../entities/Product");
const ProductVariant = require("../entities/ProductVariant");
const ProductTaxChange = require("../entities/ProductTaxChange");
const auditLogger = require("../utils/auditLogger");
const { logger } = require("../utils/logger");


class TaxStateTransitionService {
  // @ts-ignore
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.taxRepo = dataSource.getRepository(Tax);
    this.productRepo = dataSource.getRepository(Product);
    this.variantRepo = dataSource.getRepository(ProductVariant);
    this.taxChangeRepo = dataSource.getRepository(ProductTaxChange);
  }

  /**
   * Calculate gross price based on net price and list of taxes
   */
  // @ts-ignore
  _calculateGrossPrice(netPrice, taxes) {
    if (!taxes || taxes.length === 0) return netPrice;

    let gross = netPrice;
    // @ts-ignore
    const activeTaxes = taxes.filter((t) => t.is_enabled && !t.is_deleted);

    for (const tax of activeTaxes) {
      if (tax.type === "percentage") {
        gross = gross * (1 + tax.rate / 100);
      } else {
        gross = gross + tax.rate;
      }
    }
    return gross;
  }

  /**
   * CORE METHOD: Handle any change in a product/variant's tax assignments
   */
  async onTaxesChanged(
    // @ts-ignore
    entity,
    // @ts-ignore
    oldTaxes,
    // @ts-ignore
    newTaxes,
    user = "system",
    metadata = {},
  ) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");
    const entityType = entity.constructor.name;
    const repo = entityType === "Product" ? this.productRepo : this.variantRepo;
    const oldGross = entity.gross_price;
    // @ts-ignore
    const oldTaxIds = (oldTaxes || []).map((t) => t.id).sort();
    // @ts-ignore
    const newTaxIds = (newTaxes || []).map((t) => t.id).sort();

    // Recalculate gross with new taxes
    const newGross = this._calculateGrossPrice(entity.net_price, newTaxes || []);

    entity.gross_price = newGross;
    entity.updated_at = new Date();
    await updateDb(repo, entity, { skipSignal: true });

    // Create tax change record
    const changeData = {
      [`${entityType.toLowerCase()}Id`]: entity.id,
      old_tax_ids: oldTaxIds,
      new_tax_ids: newTaxIds,
      old_gross_price: oldGross,
      new_gross_price: newGross,
      changed_by: user,
      // @ts-ignore
      reason: metadata.reason || "Tax assignments changed",
    };

    const change = this.taxChangeRepo.create(changeData);
    await saveDb(this.taxChangeRepo, change);

    await auditLogger.logUpdate(
      entityType,
      entity.id,
      { gross_price: oldGross, taxIds: oldTaxIds },
      { gross_price: newGross, taxIds: newTaxIds },
      user,
    );

    logger.info(
      `[TaxTransition] Gross price updated for ${entityType} ${entity.id}: ${oldGross} -> ${newGross}`,
    );
  }

  /**
   * EVENT: Tax rate changed
   */
  // @ts-ignore
  async onTaxRateChanged(tax, oldRate, newRate, user = "system") {
    logger.info(
      `[TaxTransition] Tax #${tax.id} rate changed: ${oldRate}% -> ${newRate}%`,
    );

    const [products, variants] = await Promise.all([
      this._findProductsWithTax(tax.id),
      this._findVariantsWithTax(tax.id),
    ]);

    for (const product of products) {
      await this.onTaxesChanged(
        product,
        product.taxes,
        product.taxes, // same taxes, new rate will be applied in calculation
        user,
        { reason: `Tax #${tax.id} rate changed from ${oldRate}% to ${newRate}%` },
      );
    }

    for (const variant of variants) {
      await this.onTaxesChanged(
        variant,
        variant.taxes,
        variant.taxes,
        user,
        { reason: `Tax #${tax.id} rate changed from ${oldRate}% to ${newRate}%` },
      );
    }
  }

  /**
   * EVENT: Tax type changed (percentage <-> fixed)
   */
  // @ts-ignore
  async onTaxTypeChanged(tax, oldType, newType, user = "system") {
    logger.info(
      `[TaxTransition] Tax #${tax.id} type changed: ${oldType} -> ${newType}`,
    );

    const [products, variants] = await Promise.all([
      this._findProductsWithTax(tax.id),
      this._findVariantsWithTax(tax.id),
    ]);

    for (const product of products) {
      await this.onTaxesChanged(
        product,
        product.taxes,
        product.taxes,
        user,
        { reason: `Tax #${tax.id} type changed from ${oldType} to ${newType}` },
      );
    }

    for (const variant of variants) {
      await this.onTaxesChanged(
        variant,
        variant.taxes,
        variant.taxes,
        user,
        { reason: `Tax #${tax.id} type changed from ${oldType} to ${newType}` },
      );
    }
  }

  /**
   * EVENT: Tax enabled/disabled
   */
  // @ts-ignore
  async onTaxStatusChanged(tax, wasEnabled, isEnabled, user = "system") {
    logger.info(
      `[TaxTransition] Tax #${tax.id} status changed: ${wasEnabled} -> ${isEnabled}`,
    );

    if (!isEnabled) {
      // Tax disabled - remove it from all products
      await this.onTaxDisabled(tax, user);
    } else {
      // Tax enabled - recalc all products that have this tax
      const [products, variants] = await Promise.all([
        this._findProductsWithTax(tax.id),
        this._findVariantsWithTax(tax.id),
      ]);

      for (const product of products) {
        await this.onTaxesChanged(
          product,
          product.taxes,
          product.taxes,
          user,
          { reason: `Tax #${tax.id} enabled` },
        );
      }

      for (const variant of variants) {
        await this.onTaxesChanged(
          variant,
          variant.taxes,
          variant.taxes,
          user,
          { reason: `Tax #${tax.id} enabled` },
        );
      }
    }
  }

  /**
   * EVENT: Tax deleted/soft-deleted
   */
  // @ts-ignore
  async onTaxDeleted(tax, user = "system") {
    logger.info(`[TaxTransition] Tax #${tax.id} deleted`);
    await this.onTaxDisabled(tax, user); // Reuse disabled logic
  }

  /**
   * Helper: Remove a tax from all products/variants (when disabled/deleted)
   */
  // @ts-ignore
  async onTaxDisabled(tax, user = "system") {
    const [products, variants] = await Promise.all([
      this._findProductsWithTax(tax.id),
      this._findVariantsWithTax(tax.id),
    ]);

    for (const product of products) {
      // @ts-ignore
      const newTaxes = product.taxes.filter((t) => t.id !== tax.id);
      await this.onTaxesChanged(
        product,
        product.taxes,
        newTaxes,
        user,
        { reason: `Tax #${tax.id} disabled/deleted` },
      );
    }

    for (const variant of variants) {
      // @ts-ignore
      const newTaxes = variant.taxes.filter((t) => t.id !== tax.id);
      await this.onTaxesChanged(
        variant,
        variant.taxes,
        newTaxes,
        user,
        { reason: `Tax #${tax.id} disabled/deleted` },
      );
    }
  }

  // --- Private helpers ---
  // @ts-ignore
  async _findProductsWithTax(taxId) {
    return await this.productRepo
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.taxes", "tax")
      .where("tax.id = :taxId", { taxId })
      .andWhere("product.is_deleted = false")
      .getMany();
  }

  // @ts-ignore
  async _findVariantsWithTax(taxId) {
    return await this.variantRepo
      .createQueryBuilder("variant")
      .leftJoinAndSelect("variant.taxes", "tax")
      .where("tax.id = :taxId", { taxId })
      .andWhere("variant.is_deleted = false")
      .getMany();
  }
}

module.exports = { TaxStateTransitionService };