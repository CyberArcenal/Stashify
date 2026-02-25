// services/ProductVariantService.js

const auditLogger = require("../utils/auditLogger");


class ProductVariantService {
  constructor() {
    this.repository = null;
    this.productRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const ProductVariant = require("../entities/ProductVariant");
    const Product = require("../entities/Product");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(ProductVariant);
    this.productRepository = AppDataSource.getRepository(Product);
    console.log("ProductVariantService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      variant: this.repository,
      product: this.productRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { variant: repo, product: productRepo } = await this.getRepositories();
    try {
      if (!data.productId) throw new Error("productId is required");
      if (!data.name) throw new Error("Variant name is required");

      const product = await productRepo.findOne({ where: { id: data.productId } });
      if (!product) throw new Error(`Product with ID ${data.productId} not found`);

      // SKU uniqueness if provided
      if (data.sku) {
        const existing = await repo.findOne({ where: { sku: data.sku } });
        if (existing) throw new Error(`Variant with SKU "${data.sku}" already exists`);
      }
      // Barcode uniqueness if provided
      if (data.barcode) {
        const existing = await repo.findOne({ where: { barcode: data.barcode } });
        if (existing) throw new Error(`Variant with barcode "${data.barcode}" already exists`);
      }

      const variantData = { ...data, product };
      delete variantData.productId;

      const variant = repo.create(variantData);
      const saved = await saveDb(repo, variant);
      await auditLogger.logCreate("ProductVariant", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create product variant:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { variant: repo, product: productRepo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id }, relations: ["product"] });
      if (!existing) throw new Error(`ProductVariant with ID ${id} not found`);
      const oldData = { ...existing };

      // SKU uniqueness if changed
      if (data.sku && data.sku !== existing.sku) {
        const skuExists = await repo.findOne({ where: { sku: data.sku } });
        if (skuExists) throw new Error(`Variant with SKU "${data.sku}" already exists`);
      }
      // Barcode uniqueness if changed
      if (data.barcode && data.barcode !== existing.barcode) {
        const barcodeExists = await repo.findOne({ where: { barcode: data.barcode } });
        if (barcodeExists) throw new Error(`Variant with barcode "${data.barcode}" already exists`);
      }

      if (data.productId !== undefined) {
        const product = await productRepo.findOne({ where: { id: data.productId } });
        if (!product) throw new Error(`Product with ID ${data.productId} not found`);
        existing.product = product;
        delete data.productId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("ProductVariant", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update product variant:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { variant: repo } = await this.getRepositories();
    try {
      const variant = await repo.findOne({ where: { id } });
      if (!variant) throw new Error(`ProductVariant with ID ${id} not found`);
      if (variant.is_deleted) throw new Error(`Variant #${id} is already deleted`);

      const oldData = { ...variant };
      variant.is_deleted = true;
      variant.updated_at = new Date();

      const saved = await updateDb(repo, variant);
      await auditLogger.logDelete("ProductVariant", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete product variant:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { variant: repo } = await this.getRepositories();
    try {
      const variant = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["product", "stockItems", "orderItems", "purchaseItems"],
      });
      if (!variant) throw new Error(`ProductVariant with ID ${id} not found`);
      await auditLogger.logView("ProductVariant", id, "system");
      return variant;
    } catch (error) {
      console.error("Failed to find product variant:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { variant: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("variant")
        .leftJoinAndSelect("variant.product", "product")
        .where("variant.is_deleted = :isDeleted", { isDeleted: false });

      if (options.productId) {
        qb.andWhere("product.id = :productId", { productId: options.productId });
      }
      if (options.is_active !== undefined) {
        qb.andWhere("variant.is_active = :isActive", { isActive: options.is_active });
      }
      if (options.search) {
        qb.andWhere("(variant.name LIKE :search OR variant.sku LIKE :search OR variant.barcode LIKE :search)",
          { search: `%${options.search}%` });
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`variant.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const variants = await qb.getMany();
      await auditLogger.logView("ProductVariant", null, "system");
      return variants;
    } catch (error) {
      console.error("Failed to fetch product variants:", error);
      throw error;
    }
  }
}

const productVariantService = new ProductVariantService();
module.exports = productVariantService;