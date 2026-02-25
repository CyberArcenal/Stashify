// services/PurchaseItemService.js

const auditLogger = require("../utils/auditLogger");


class PurchaseItemService {
  constructor() {
    this.repository = null;
    this.purchaseRepository = null;
    this.productRepository = null;
    this.variantRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const PurchaseItem = require("../entities/PurchaseItem");
    const Purchase = require("../entities/Purchase");
    const Product = require("../entities/Product");
    const ProductVariant = require("../entities/ProductVariant");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(PurchaseItem);
    this.purchaseRepository = AppDataSource.getRepository(Purchase);
    this.productRepository = AppDataSource.getRepository(Product);
    this.variantRepository = AppDataSource.getRepository(ProductVariant);
    console.log("PurchaseItemService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      item: this.repository,
      purchase: this.purchaseRepository,
      product: this.productRepository,
      variant: this.variantRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { item: repo, purchase: purchaseRepo, product: productRepo, variant: variantRepo } = await this.getRepositories();
    try {
      if (!data.purchaseId) throw new Error("purchaseId is required");
      if (!data.productId) throw new Error("productId is required");
      if (data.quantity === undefined) throw new Error("quantity is required");

      const purchase = await purchaseRepo.findOne({ where: { id: data.purchaseId } });
      if (!purchase) throw new Error(`Purchase with ID ${data.purchaseId} not found`);

      const product = await productRepo.findOne({ where: { id: data.productId } });
      if (!product) throw new Error(`Product with ID ${data.productId} not found`);

      let variant = null;
      if (data.variantId) {
        variant = await variantRepo.findOne({ where: { id: data.variantId } });
        if (!variant) throw new Error(`Variant with ID ${data.variantId} not found`);
      }

      const itemData = {
        ...data,
        purchase,
        product,
        variant,
      };
      delete itemData.purchaseId;
      delete itemData.productId;
      delete itemData.variantId;

      const item = repo.create(itemData);
      const saved = await saveDb(repo, item);
      await auditLogger.logCreate("PurchaseItem", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create purchase item:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { item: repo, purchase: purchaseRepo, product: productRepo, variant: variantRepo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id }, relations: ["purchase", "product", "variant"] });
      if (!existing) throw new Error(`PurchaseItem with ID ${id} not found`);
      const oldData = { ...existing };

      if (data.purchaseId !== undefined) {
        const purchase = await purchaseRepo.findOne({ where: { id: data.purchaseId } });
        if (!purchase) throw new Error(`Purchase with ID ${data.purchaseId} not found`);
        existing.purchase = purchase;
        delete data.purchaseId;
      }
      if (data.productId !== undefined) {
        const product = await productRepo.findOne({ where: { id: data.productId } });
        if (!product) throw new Error(`Product with ID ${data.productId} not found`);
        existing.product = product;
        delete data.productId;
      }
      if (data.variantId !== undefined) {
        if (data.variantId === null) {
          existing.variant = null;
        } else {
          const variant = await variantRepo.findOne({ where: { id: data.variantId } });
          if (!variant) throw new Error(`Variant with ID ${data.variantId} not found`);
          existing.variant = variant;
        }
        delete data.variantId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("PurchaseItem", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update purchase item:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { item: repo } = await this.getRepositories();
    try {
      const item = await repo.findOne({ where: { id } });
      if (!item) throw new Error(`PurchaseItem with ID ${id} not found`);
      if (item.is_deleted) throw new Error(`PurchaseItem #${id} is already deleted`);

      const oldData = { ...item };
      item.is_deleted = true;
      item.updated_at = new Date();

      const saved = await updateDb(repo, item);
      await auditLogger.logDelete("PurchaseItem", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete purchase item:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { item: repo } = await this.getRepositories();
    try {
      const item = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["purchase", "product", "variant"],
      });
      if (!item) throw new Error(`PurchaseItem with ID ${id} not found`);
      await auditLogger.logView("PurchaseItem", id, "system");
      return item;
    } catch (error) {
      console.error("Failed to find purchase item:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { item: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("item")
        .leftJoinAndSelect("item.purchase", "purchase")
        .leftJoinAndSelect("item.product", "product")
        .leftJoinAndSelect("item.variant", "variant")
        .where("item.is_deleted = :isDeleted", { isDeleted: false });

      if (options.purchaseId) {
        qb.andWhere("purchase.id = :purchaseId", { purchaseId: options.purchaseId });
      }
      if (options.productId) {
        qb.andWhere("product.id = :productId", { productId: options.productId });
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`item.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const items = await qb.getMany();
      await auditLogger.logView("PurchaseItem", null, "system");
      return items;
    } catch (error) {
      console.error("Failed to fetch purchase items:", error);
      throw error;
    }
  }
}

const purchaseItemService = new PurchaseItemService();
module.exports = purchaseItemService;