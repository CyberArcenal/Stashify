// services/PurchaseService.js
// @ts-nocheck

const ProductVariant = require("../entities/ProductVariant");
const auditLogger = require("../utils/auditLogger");
const UPDATABLE_STATUSES = ["initiated", "pending"];
const DELETABLE_STATUSES = ["initiated", "pending"];
const { validatePurchaseData } = require("../utils/purchase");
// 🔧 SETTINGS INTEGRATION
// @ts-ignore
// @ts-ignore
// @ts-ignore
const {
  supplierTaxRate,

  // other settings if needed
} = require("../utils/settings/system");

class PurchaseService {
  constructor() {
    this.purchaseRepository = null;
    this.supplierRepository = null;
    this.warehouseRepository = null;
    this.productRepository = null;
    this.variantRepository = null;
    this.purchaseItemService = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Purchase = require("../entities/Purchase");
    const Supplier = require("../entities/Supplier");
    const Warehouse = require("../entities/Warehouse");
    const Product = require("../entities/Product");
    const PurchaseItemService = require("./PurchaseItem");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.purchaseRepository = AppDataSource.getRepository(Purchase);
    this.supplierRepository = AppDataSource.getRepository(Supplier);
    this.warehouseRepository = AppDataSource.getRepository(Warehouse);
    this.productRepository = AppDataSource.getRepository(Product);
    this.variantRepository = AppDataSource.getRepository(ProductVariant);
    this.purchaseItemService = PurchaseItemService;
    await this.purchaseItemService.initialize();
    console.log("PurchaseService initialized");
  }

  async getRepositories() {
    if (!this.purchaseRepository) {
      await this.initialize();
    }
    return {
      purchase: this.purchaseRepository,
      supplier: this.supplierRepository,
      warehouse: this.warehouseRepository,
      product: this.productRepository,
      variant: this.variantRepository,
      purchaseItemService: this.purchaseItemService,
    };
  }

  /**
   * Create a new purchase (initiated → pending)
   * @param {Object} purchaseData
   * @param {string} user
   */

  async create(purchaseData, user = "system") {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const {
      purchase: purchaseRepo,
      supplier: supplierRepo,
      warehouse: warehouseRepo,
      product: productRepo,
      variant: variantRepo,
      purchaseItemService,
    } = await this.getRepositories();

    try {
      // 1. Validate purchase data
      const validation = validatePurchaseData(purchaseData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      // @ts-ignore
      const { items, supplierId, warehouseId, notes = null } = purchaseData;

      // Fetch supplier and warehouse
      // @ts-ignore
      const supplier = await supplierRepo.findOne({
        where: { id: supplierId, is_deleted: false },
      });
      if (!supplier)
        throw new Error(`Supplier with ID ${supplierId} not found`);

      // @ts-ignore
      const warehouse = await warehouseRepo.findOne({
        where: { id: warehouseId, is_deleted: false },
      });
      if (!warehouse)
        throw new Error(`Warehouse with ID ${warehouseId} not found`);

      // Process items
      const itemDetails = [];
      let subtotal = 0;
      let totalTax = 0;

      for (const item of items) {
        let product, variant;
        if (item.variantId) {
          // @ts-ignore
          variant = await variantRepo.findOne({
            where: { id: item.variantId, is_deleted: false },
            relations: ["purchaseTaxes", "product"],
          });
          if (!variant)
            throw new Error(`Variant ID ${item.variantId} not found`);
          // @ts-ignore
          product = variant.product;
        } else {
          // @ts-ignore
          product = await productRepo.findOne({
            where: { id: item.productId, is_deleted: false },
            relations: ["purchaseTaxes"],
          });
          if (!product)
            throw new Error(`Product ID ${item.productId} not found`);
        }

        const unitCost =
          item.unitCost !== undefined
            ? item.unitCost
            : product.cost_per_item || 0;
        const quantity = item.quantity;
        const lineNetTotal = unitCost * quantity; // no discount in purchases (for now)

        // Determine which purchase taxes to use
        const sourceForTaxes = variant || product;
        const purchaseTaxes =
          sourceForTaxes.purchaseTaxes?.filter(
            // @ts-ignore
            (t) => t.is_enabled && !t.is_deleted,
          ) || [];

        // Compute applied taxes
        const appliedTaxes = [];
        let lineTaxTotal = 0;
        for (const tax of purchaseTaxes) {
          let taxAmount;
          if (tax.type === "percentage") {
            taxAmount = lineNetTotal * (tax.rate / 100);
          } else {
            taxAmount = tax.rate * quantity; // fixed per item
          }
          taxAmount = Math.round(taxAmount * 100) / 100;
          appliedTaxes.push({
            taxId: tax.id,
            name: tax.name,
            rate: tax.rate,
            type: tax.type,
            amount: taxAmount,
          });
          lineTaxTotal += taxAmount;
        }
        lineTaxTotal = Math.round(lineTaxTotal * 100) / 100;
        const lineGrossTotal = lineNetTotal + lineTaxTotal;

        itemDetails.push({
          product,
          variant,
          quantity,
          unitCost,
          lineNetTotal,
          appliedTaxes,
          lineTaxTotal,
          lineGrossTotal,
          variantId: item.variantId || null,
        });

        subtotal += lineNetTotal;
        totalTax += lineTaxTotal;
      }

      const total = subtotal + totalTax;

      // Create purchase with status 'initiated'
      // @ts-ignore
      const purchase = purchaseRepo.create({
        // @ts-ignore
        purchase_number: purchaseData.purchase_number,
        supplier,
        warehouse,
        status: "initiated",
        subtotal: this.round2(subtotal),
        tax_amount: this.round2(totalTax),
        total: this.round2(total),
        notes,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      });

      // @ts-ignore
      const savedPurchase = await saveDb(purchaseRepo, purchase);
      await auditLogger.logCreate(
        "Purchase",
        // @ts-ignore
        savedPurchase.id,
        savedPurchase,
        user,
      );

      // Create purchase items with tax details
      for (const det of itemDetails) {
        const itemData = {
          purchaseId: savedPurchase.id,
          productId: det.product.id,
          variantId: det.variantId,
          quantity: det.quantity,
          unit_cost: det.unitCost,
          total: det.lineNetTotal, // net total (cost before tax)
          applied_taxes: det.appliedTaxes,
          line_tax_total: det.lineTaxTotal,
          line_gross_total: det.lineGrossTotal,
        };
        // @ts-ignore
        await purchaseItemService.create(itemData, user);
      }

      // Update purchase status to 'pending'
      const oldData = { ...savedPurchase };
      savedPurchase.status = "pending";
      savedPurchase.updated_at = new Date();
      // @ts-ignore
      const updatedPurchase = await updateDb(purchaseRepo, savedPurchase);
      await auditLogger.logUpdate(
        "Purchase",
        // @ts-ignore
        savedPurchase.id,
        oldData,
        updatedPurchase,
        user,
      );

      console.log(
        `Purchase created: #${savedPurchase.id} (initiated → pending)`,
      );
      return updatedPurchase;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to create purchase:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing purchase
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   */

  /**
   * Update an existing purchase – only notes and items can be changed.
   * Supplier, warehouse, and other data remain as originally set.
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   */
  async update(id, data, user = "system") {
    const {
      saveDb,
      updateDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");
    const {
      purchase: purchaseRepo,
      supplier: supplierRepo,
      warehouse: warehouseRepo,
      product: productRepo,
      variant: variantRepo,
      purchaseItemService,
    } = await this.getRepositories();

    try {
      // 1. Fetch existing purchase with items (to delete them later)
      const existing = await purchaseRepo.findOne({
        where: { id, is_deleted: false },
        relations: ["items", "supplier", "warehouse"],
      });
      if (!existing) throw new Error(`Purchase with ID ${id} not found`);

      // Status validation – only allow updates if still editable
      if (!UPDATABLE_STATUSES.includes(existing.status)) {
        throw new Error(
          `Purchase cannot be updated because its status is "${existing.status}"`,
        );
      }

      const oldData = { ...existing };

      // 2. Update notes if provided
      if (data.notes !== undefined) existing.notes = data.notes;

      // 3. Handle items – full replacement (if items array is provided)
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Items array is required when updating a purchase");
      }

      // Process new items and compute totals
      const itemDetails = [];
      let subtotal = 0;
      let totalTax = 0;

      for (const item of data.items) {
        let product, variant;
        if (item.variantId) {
          variant = await variantRepo.findOne({
            where: { id: item.variantId, is_deleted: false },
            relations: ["purchaseTaxes", "product"],
          });
          if (!variant)
            throw new Error(`Variant ID ${item.variantId} not found`);
          product = variant.product;
        } else {
          product = await productRepo.findOne({
            where: { id: item.productId, is_deleted: false },
            relations: ["purchaseTaxes"],
          });
          if (!product)
            throw new Error(`Product ID ${item.productId} not found`);
        }

        const unitCost =
          item.unitCost !== undefined
            ? item.unitCost
            : product.cost_per_item || 0;
        const quantity = item.quantity;
        const lineNetTotal = unitCost * quantity;

        const sourceForTaxes = variant || product;
        const purchaseTaxes =
          sourceForTaxes.purchaseTaxes?.filter(
            (t) => t.is_enabled && !t.is_deleted,
          ) || [];

        const appliedTaxes = [];
        let lineTaxTotal = 0;
        for (const tax of purchaseTaxes) {
          let taxAmount;
          if (tax.type === "percentage") {
            taxAmount = lineNetTotal * (tax.rate / 100);
          } else {
            taxAmount = tax.rate * quantity;
          }
          taxAmount = Math.round(taxAmount * 100) / 100;
          appliedTaxes.push({
            taxId: tax.id,
            name: tax.name,
            rate: tax.rate,
            type: tax.type,
            amount: taxAmount,
          });
          lineTaxTotal += taxAmount;
        }
        lineTaxTotal = Math.round(lineTaxTotal * 100) / 100;
        const lineGrossTotal = lineNetTotal + lineTaxTotal;

        itemDetails.push({
          product,
          variant,
          quantity,
          unitCost,
          lineNetTotal,
          appliedTaxes,
          lineTaxTotal,
          lineGrossTotal,
          variantId: item.variantId || null,
        });

        subtotal += lineNetTotal;
        totalTax += lineTaxTotal;
      }

      // Update purchase totals
      existing.subtotal = this.round2(subtotal);
      existing.tax_amount = this.round2(totalTax);
      existing.total = this.round2(subtotal + totalTax);
      existing.updated_at = new Date();

      // 4. Save the updated purchase (without items)
      const saved = await updateDb(purchaseRepo, existing);
      await auditLogger.logUpdate("Purchase", id, oldData, saved, user);

      // 5. Delete all existing items
      const oldItems = await purchaseItemService.repository.find({
        where: { purchase: { id: existing.id } },
      });
      for (const item of oldItems) {
        await removeDb(purchaseItemService.repository, item);
      }

      // 6. Create new items
      for (const det of itemDetails) {
        const itemData = {
          purchaseId: existing.id,
          productId: det.product.id,
          variantId: det.variantId,
          quantity: det.quantity,
          unit_cost: det.unitCost,
          total: det.lineNetTotal,
          applied_taxes: det.appliedTaxes,
          line_tax_total: det.lineTaxTotal,
          line_gross_total: det.lineGrossTotal,
        };
        await purchaseItemService.create(itemData, user);
      }

      // 7. Reload the purchase with all relations using a fresh query builder
      const updatedPurchase = await purchaseRepo
        .createQueryBuilder("purchase")
        .leftJoinAndSelect("purchase.supplier", "supplier")
        .leftJoinAndSelect("purchase.warehouse", "warehouse")
        .leftJoinAndSelect("purchase.items", "items")
        .leftJoinAndSelect("items.product", "product")
        .leftJoinAndSelect("items.variant", "variant")
        .where("purchase.id = :id", { id: existing.id })
        .getOne();

      if (!updatedPurchase)
        throw new Error("Failed to reload updated purchase");

      return updatedPurchase;
    } catch (error) {
      console.error("Failed to update purchase:", error.message);
      throw error;
    }
  }
  /**
   * Update purchase status
   * @param {number} id
   * @param {string} status - New status
   * @param {string} user
   */
  async updateStatus(id, status, user = "system") {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const { purchase: repo } = await this.getRepositories();

    try {
      // @ts-ignore
      const purchase = await repo.findOne({ where: { id, is_deleted: false } });
      if (!purchase) throw new Error(`Purchase with ID ${id} not found`);

      const oldStatus = purchase.status;
      if (oldStatus === status) {
        return purchase; // no change
      }

      // Allowed status transitions for purchases
      const allowedTransitions = {
        initiated: ["pending", "cancelled"],
        pending: ["confirmed", "cancelled"],
        confirmed: ["received", "cancelled"],
        received: ["refunded"], // cannot transition out of received
        cancelled: [], // cannot transition out of cancelled
      };

      const allowed = allowedTransitions[oldStatus];
      if (!allowed || !allowed.includes(status)) {
        throw new Error(
          `Invalid status transition from ${oldStatus} to ${status}`,
        );
      }

      purchase.status = status;
      purchase.updated_at = new Date();

      // @ts-ignore
      const updated = await updateDb(repo, purchase);
      await auditLogger.logUpdate(
        "Purchase",
        id,
        { status: oldStatus },
        { status },
        user,
      );
      return updated;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to update purchase status:", error.message);
      throw error;
    }
  }
  /**
   * Soft delete a purchase (set is_deleted = true)
   * @param {number} id
   * @param {string} user
   */
  async delete(id, user = "system") {
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const { purchase: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const purchase = await repo.findOne({ where: { id } });
      if (!purchase) throw new Error(`Purchase with ID ${id} not found`);
      if (!DELETABLE_STATUSES.includes(purchase.status)) {
        throw new Error(
          `Order cannot be deleted because its status is "${purchase.status}"`,
        );
      }
      if (purchase.is_deleted)
        throw new Error(`Purchase #${id} is already deleted`);

      const oldData = { ...purchase };
      purchase.is_deleted = true;
      purchase.updated_at = new Date();

      // @ts-ignore
      const saved = await updateDb(repo, purchase);
      await auditLogger.logDelete("Purchase", id, oldData, user);
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to delete purchase:", error.message);
      throw error;
    }
  }

  /**
   * Find purchase by ID with relations
   * @param {number} id
   */
  async findById(id) {
    const { purchase: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const purchase = await repo.findOne({
        where: { id, is_deleted: false },
        relations: [
          "supplier",
          "warehouse",
          "items",
          "items.product",
          "items.variant",
        ],
      });
      if (!purchase) throw new Error(`Purchase with ID ${id} not found`);
      await auditLogger.logView("Purchase", id, "system");
      return purchase;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to find purchase:", error.message);
      throw error;
    }
  }

  /**
   * Find all purchases with filters
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { purchase: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const qb = repo
        .createQueryBuilder("purchase")
        .leftJoinAndSelect("purchase.supplier", "supplier")
        .leftJoinAndSelect("purchase.warehouse", "warehouse")
        .leftJoinAndSelect("purchase.items", "items")
        // .leftJoinAndSelect("items.product", "product")
        // .leftJoinAndSelect("items.variant", "variant")
        .where("purchase.is_deleted = :isDeleted", { isDeleted: false });

      // @ts-ignore
      if (options.status) {
        // @ts-ignore
        qb.andWhere("purchase.status = :status", { status: options.status });
      }
      // @ts-ignore
      if (options.supplierId) {
        qb.andWhere("supplier.id = :supplierId", {
          // @ts-ignore
          supplierId: options.supplierId,
        });
      }
      // @ts-ignore
      if (options.warehouseId) {
        qb.andWhere("warehouse.id = :warehouseId", {
          // @ts-ignore
          warehouseId: options.warehouseId,
        });
      }
      // @ts-ignore
      if (options.startDate) {
        qb.andWhere("purchase.created_at >= :startDate", {
          // @ts-ignore
          startDate: options.startDate,
        });
      }
      // @ts-ignore
      if (options.endDate) {
        qb.andWhere("purchase.created_at <= :endDate", {
          // @ts-ignore
          endDate: options.endDate,
        });
      }

      // @ts-ignore
      const sortBy = options.sortBy || "created_at";
      // @ts-ignore
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`purchase.${sortBy}`, sortOrder);

      // @ts-ignore
      if (options.page && options.limit) {
        // @ts-ignore
        const skip = (options.page - 1) * options.limit;
        // @ts-ignore
        qb.skip(skip).take(options.limit);
      }

      const purchases = await qb.getMany();
      // @ts-ignore
      await auditLogger.logView("Purchase", null, "system");
      return purchases;
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
      throw error;
    }
  }

  // @ts-ignore
  round2(value) {
    return Math.round(value * 100) / 100;
  }
}

const purchaseService = new PurchaseService();
module.exports = purchaseService;
