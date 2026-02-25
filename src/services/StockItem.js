// services/StockItemService.js

const auditLogger = require("../utils/auditLogger");


class StockItemService {
  constructor() {
    this.repository = null;
    this.productRepository = null;
    this.variantRepository = null;
    this.warehouseRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const StockItem = require("../entities/StockItem");
    const Product = require("../entities/Product");
    const ProductVariant = require("../entities/ProductVariant");
    const Warehouse = require("../entities/Warehouse");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(StockItem);
    this.productRepository = AppDataSource.getRepository(Product);
    this.variantRepository = AppDataSource.getRepository(ProductVariant);
    this.warehouseRepository = AppDataSource.getRepository(Warehouse);
    console.log("StockItemService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      stock: this.repository,
      product: this.productRepository,
      variant: this.variantRepository,
      warehouse: this.warehouseRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { stock: repo, product: productRepo, variant: variantRepo, warehouse: warehouseRepo } = await this.getRepositories();
    try {
      if (!data.productId) throw new Error("productId is required");
      if (!data.warehouseId) throw new Error("warehouseId is required");

      const product = await productRepo.findOne({ where: { id: data.productId } });
      if (!product) throw new Error(`Product with ID ${data.productId} not found`);

      let variant = null;
      if (data.variantId) {
        variant = await variantRepo.findOne({ where: { id: data.variantId } });
        if (!variant) throw new Error(`Variant with ID ${data.variantId} not found`);
      }

      const warehouse = await warehouseRepo.findOne({ where: { id: data.warehouseId } });
      if (!warehouse) throw new Error(`Warehouse with ID ${data.warehouseId} not found`);

      // Check uniqueness: (product, variant, warehouse)
      const existing = await repo.findOne({
        where: {
          product: { id: data.productId },
          variant: variant ? { id: data.variantId } : null,
          warehouse: { id: data.warehouseId },
        },
      });
      if (existing) throw new Error("Stock item already exists for this product/variant/warehouse combination");

      const stockData = {
        ...data,
        product,
        variant,
        warehouse,
      };
      delete stockData.productId;
      delete stockData.variantId;
      delete stockData.warehouseId;

      const stock = repo.create(stockData);
      const saved = await saveDb(repo, stock);
      await auditLogger.logCreate("StockItem", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create stock item:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { stock: repo, product: productRepo, variant: variantRepo, warehouse: warehouseRepo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id }, relations: ["product", "variant", "warehouse"] });
      if (!existing) throw new Error(`StockItem with ID ${id} not found`);
      const oldData = { ...existing };

      // If changing product/variant/warehouse, enforce uniqueness
      let product = existing.product;
      let variant = existing.variant;
      let warehouse = existing.warehouse;

      if (data.productId !== undefined) {
        product = await productRepo.findOne({ where: { id: data.productId } });
        if (!product) throw new Error(`Product with ID ${data.productId} not found`);
        delete data.productId;
      }
      if (data.variantId !== undefined) {
        if (data.variantId === null) {
          variant = null;
        } else {
          variant = await variantRepo.findOne({ where: { id: data.variantId } });
          if (!variant) throw new Error(`Variant with ID ${data.variantId} not found`);
        }
        delete data.variantId;
      }
      if (data.warehouseId !== undefined) {
        warehouse = await warehouseRepo.findOne({ where: { id: data.warehouseId } });
        if (!warehouse) throw new Error(`Warehouse with ID ${data.warehouseId} not found`);
        delete data.warehouseId;
      }

      // If any of these changed, check uniqueness
      if (product !== existing.product || variant !== existing.variant || warehouse !== existing.warehouse) {
        const duplicate = await repo.findOne({
          where: {
            product: { id: product.id },
            variant: variant ? { id: variant.id } : null,
            warehouse: { id: warehouse.id },
          },
        });
        if (duplicate && duplicate.id !== id) {
          throw new Error("Another stock item already exists for this product/variant/warehouse combination");
        }
      }

      existing.product = product;
      existing.variant = variant;
      existing.warehouse = warehouse;

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("StockItem", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update stock item:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { stock: repo } = await this.getRepositories();
    try {
      const stock = await repo.findOne({ where: { id } });
      if (!stock) throw new Error(`StockItem with ID ${id} not found`);
      if (stock.is_deleted) throw new Error(`StockItem #${id} is already deleted`);

      const oldData = { ...stock };
      stock.is_deleted = true;
      stock.updated_at = new Date();

      const saved = await updateDb(repo, stock);
      await auditLogger.logDelete("StockItem", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete stock item:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { stock: repo } = await this.getRepositories();
    try {
      const stock = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["product", "variant", "warehouse", "movements"],
      });
      if (!stock) throw new Error(`StockItem with ID ${id} not found`);
      await auditLogger.logView("StockItem", id, "system");
      return stock;
    } catch (error) {
      console.error("Failed to find stock item:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { stock: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("stock")
        .leftJoinAndSelect("stock.product", "product")
        .leftJoinAndSelect("stock.variant", "variant")
        .leftJoinAndSelect("stock.warehouse", "warehouse")
        .where("stock.is_deleted = :isDeleted", { isDeleted: false });

      if (options.productId) {
        qb.andWhere("product.id = :productId", { productId: options.productId });
      }
      if (options.variantId) {
        qb.andWhere("variant.id = :variantId", { variantId: options.variantId });
      }
      if (options.warehouseId) {
        qb.andWhere("warehouse.id = :warehouseId", { warehouseId: options.warehouseId });
      }
      if (options.minQuantity !== undefined) {
        qb.andWhere("stock.quantity >= :minQuantity", { minQuantity: options.minQuantity });
      }
      if (options.maxQuantity !== undefined) {
        qb.andWhere("stock.quantity <= :maxQuantity", { maxQuantity: options.maxQuantity });
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`stock.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const stocks = await qb.getMany();
      await auditLogger.logView("StockItem", null, "system");
      return stocks;
    } catch (error) {
      console.error("Failed to fetch stock items:", error);
      throw error;
    }
  }
}

const stockItemService = new StockItemService();
module.exports = stockItemService;