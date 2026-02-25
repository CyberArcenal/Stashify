// services/PurchaseService.js
//@ts-check

const auditLogger = require("../utils/auditLogger");

const { validatePurchaseData } = require("../utils/purchase");
// 🔧 SETTINGS INTEGRATION
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

      // 🔧 Settings
      const defaultTaxRate = await supplierTaxRate();

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
        // @ts-ignore
        const product = await productRepo.findOne({
          where: { id: item.productId, is_deleted: false },
        });
        if (!product) throw new Error(`Product ID ${item.productId} not found`);

        const unitCost =
          item.unitCost !== undefined
            ? item.unitCost
            : product.cost_per_item || 0;
        const quantity = item.quantity;
        const lineTotal = unitCost * quantity;

        // Tax calculation (if purchase is taxable)
        let tax = 0;
        if (item.tax !== undefined) {
          tax = item.tax;
        } else if (defaultTaxRate > 0) {
          tax = lineTotal * (defaultTaxRate / 100);
        }

        itemDetails.push({
          product,
          quantity,
          unitCost,
          lineTotal,
          tax,
          variantId: item.variantId || null,
        });

        subtotal += lineTotal;
        totalTax += tax;
      }

      const total = subtotal + totalTax;

      // 1. Create purchase with status 'initiated'
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

      // 2. Create purchase items
      for (const det of itemDetails) {
        const itemData = {
          purchaseId: savedPurchase.id,
          productId: det.product.id,
          variantId: det.variantId,
          quantity: det.quantity,
          unit_cost: det.unitCost,
          total: det.lineTotal,
          // If your PurchaseItem entity has a tax field, include it here
        };
        // @ts-ignore
        await purchaseItemService.create(itemData, user);
      }

      // 3. Update purchase status to 'pending'
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
  async update(id, data, user = "system") {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const {
      purchase: repo,
      supplier: supplierRepo,
      warehouse: warehouseRepo,
    } = await this.getRepositories();
    try {
      // @ts-ignore
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Purchase with ID ${id} not found`);
      const oldData = { ...existing };

      if (
        // @ts-ignore
        data.purchase_number &&
        // @ts-ignore
        data.purchase_number !== existing.purchase_number
      ) {
        // @ts-ignore
        const numExists = await repo.findOne({
          // @ts-ignore
          where: { purchase_number: data.purchase_number },
        });
        if (numExists)
          throw new Error(
            // @ts-ignore
            `Purchase with number "${data.purchase_number}" already exists`,
          );
      }

      // @ts-ignore
      if (data.supplierId !== undefined) {
        // @ts-ignore
        const supplier = await supplierRepo.findOne({
          // @ts-ignore
          where: { id: data.supplierId },
        });
        if (!supplier)
          // @ts-ignore
          throw new Error(`Supplier with ID ${data.supplierId} not found`);
        // @ts-ignore
        existing.supplier = supplier;
        // @ts-ignore
        delete data.supplierId;
      }

      // @ts-ignore
      if (data.warehouseId !== undefined) {
        // @ts-ignore
        const warehouse = await warehouseRepo.findOne({
          // @ts-ignore
          where: { id: data.warehouseId },
        });
        if (!warehouse)
          // @ts-ignore
          throw new Error(`Warehouse with ID ${data.warehouseId} not found`);
        // @ts-ignore
        existing.warehouse = warehouse;
        // @ts-ignore
        delete data.warehouseId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      // @ts-ignore
      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Purchase", id, oldData, saved, user);
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to update purchase:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a purchase (set is_deleted = true)
   * @param {number} id
   * @param {string} user
   */
  async delete(id, user = "system") {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const { purchase: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const purchase = await repo.findOne({ where: { id } });
      if (!purchase) throw new Error(`Purchase with ID ${id} not found`);
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
        relations: ["supplier", "warehouse", "items"],
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
