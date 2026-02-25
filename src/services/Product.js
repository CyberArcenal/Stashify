// services/ProductService.js

const auditLogger = require("../utils/auditLogger");


class ProductService {
  constructor() {
    this.productRepository = null;
    this.categoryRepository = null;
    this.stockItemRepository = null;
    this.stockMovementRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Product = require("../entities/Product");
    const Category = require("../entities/Category");
    const StockItem = require("../entities/StockItem");
    const StockMovement = require("../entities/StockMovement");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.productRepository = AppDataSource.getRepository(Product);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.stockItemRepository = AppDataSource.getRepository(StockItem);
    this.stockMovementRepository = AppDataSource.getRepository(StockMovement);
    console.log("ProductService initialized");
  }

  async getRepositories() {
    if (!this.productRepository) {
      await this.initialize();
    }
    return {
      product: this.productRepository,
      category: this.categoryRepository,
      stockItem: this.stockItemRepository,
      stockMovement: this.stockMovementRepository,
    };
  }

  /**
   * Create a new product
   * @param {Object} data
   * @param {string} user
   */
  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { product: repo, category: categoryRepo } = await this.getRepositories();

    try {
      // Validate required fields
      if (!data.name) throw new Error("Product name is required");
      if (!data.sku) throw new Error("SKU is required");

      // Check SKU uniqueness
      const existing = await repo.findOne({ where: { sku: data.sku } });
      if (existing) throw new Error(`Product with SKU "${data.sku}" already exists`);

      // Generate slug if not provided
      if (!data.slug) {
        data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }

      // Handle category relation
      let category = null;
      if (data.categoryId) {
        category = await categoryRepo.findOne({ where: { id: data.categoryId } });
        if (!category) throw new Error(`Category with ID ${data.categoryId} not found`);
        delete data.categoryId;
      }

      const productData = { ...data, category };
      const product = repo.create(productData);
      const saved = await saveDb(repo, product);
      await auditLogger.logCreate("Product", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create product:", error.message);
      throw error;
    }
  }

  /**
   * Update a product
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   */
  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { product: repo, category: categoryRepo } = await this.getRepositories();

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Product with ID ${id} not found`);
      const oldData = { ...existing };

      // Check SKU uniqueness if changed
      if (data.sku && data.sku !== existing.sku) {
        const skuExists = await repo.findOne({ where: { sku: data.sku } });
        if (skuExists) throw new Error(`Product with SKU "${data.sku}" already exists`);
      }

      // Handle category update
      if (data.categoryId !== undefined) {
        if (data.categoryId === null) {
          existing.category = null;
        } else {
          const category = await categoryRepo.findOne({ where: { id: data.categoryId } });
          if (!category) throw new Error(`Category with ID ${data.categoryId} not found`);
          existing.category = category;
        }
        delete data.categoryId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Product", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update product:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a product (set is_deleted = true)
   * @param {number} id
   * @param {string} user
   */
  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { product: repo } = await this.getRepositories();

    try {
      const product = await repo.findOne({ where: { id } });
      if (!product) throw new Error(`Product with ID ${id} not found`);
      if (product.is_deleted) throw new Error(`Product #${id} is already deleted`);

      const oldData = { ...product };
      product.is_deleted = true;
      product.updated_at = new Date();

      const saved = await updateDb(repo, product);
      await auditLogger.logDelete("Product", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete product:", error.message);
      throw error;
    }
  }

  /**
   * Find product by ID
   * @param {number} id
   */
  async findById(id) {
    const { product: repo } = await this.getRepositories();

    try {
      const product = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["category", "variants", "images"],
      });
      if (!product) throw new Error(`Product with ID ${id} not found`);
      await auditLogger.logView("Product", id, "system");
      return product;
    } catch (error) {
      console.error("Failed to find product:", error.message);
      throw error;
    }
  }

  /**
   * Find all products with filters
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { product: repo } = await this.getRepositories();

    try {
      const qb = repo.createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .where("product.is_deleted = :isDeleted", { isDeleted: false });

      if (options.is_active !== undefined) {
        qb.andWhere("product.is_active = :isActive", { isActive: options.is_active });
      }
      if (options.categoryId) {
        qb.andWhere("category.id = :categoryId", { categoryId: options.categoryId });
      }
      if (options.search) {
        qb.andWhere("(product.name LIKE :search OR product.sku LIKE :search OR product.barcode LIKE :search)",
          { search: `%${options.search}%` });
      }
      if (options.minPrice !== undefined) {
        qb.andWhere("product.net_price >= :minPrice", { minPrice: options.minPrice });
      }
      if (options.maxPrice !== undefined) {
        qb.andWhere("product.net_price <= :maxPrice", { maxPrice: options.maxPrice });
      }

      // Sorting
      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`product.${sortBy}`, sortOrder);

      // Pagination
      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const products = await qb.getMany();
      await auditLogger.logView("Product", null, "system");
      return products;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  }

  /**
   * Update stock for a product (creates StockItem if not exists)
   * @param {number} productId
   * @param {number} warehouseId
   * @param {number} quantityChange
   * @param {string} movementType
   * @param {string} referenceCode
   * @param {string} [reason]
   * @param {string} user
   */
  async updateStock(productId, warehouseId, quantityChange, movementType, referenceCode, reason = null, user = "system") {
    const { product: productRepo, stockItem: stockItemRepo, stockMovement: movementRepo } = await this.getRepositories();

    try {
      const product = await productRepo.findOne({ where: { id: productId, is_deleted: false } });
      if (!product) throw new Error(`Product with ID ${productId} not found`);

      // Find or create StockItem
      let stockItem = await stockItemRepo.findOne({
        where: {
          product: { id: productId },
          warehouse: { id: warehouseId },
          variant: null, // assuming no variant for simplicity
          is_deleted: false,
        },
        relations: ["warehouse"],
      });

      if (!stockItem) {
        // Create new stock item
        stockItem = stockItemRepo.create({
          product,
          warehouse: { id: warehouseId },
          quantity: 0,
          reorder_level: 0,
          low_stock_threshold: null,
        });
        stockItem = await saveDb(stockItemRepo, stockItem);
      }

      const oldQty = stockItem.quantity;
      const newQty = oldQty + quantityChange;
      if (newQty < 0) throw new Error(`Insufficient stock. Current: ${oldQty}, change: ${quantityChange}`);

      stockItem.quantity = newQty;
      stockItem.updated_at = new Date();
      const updatedStock = await updateDb(stockItemRepo, stockItem);

      // Create stock movement
      const movement = movementRepo.create({
        stockItem: updatedStock,
        warehouse: { id: warehouseId },
        change: quantityChange,
        movement_type: movementType,
        reference_code: referenceCode,
        reason,
        current_quantity: newQty,
        metadata: null,
      });
      const savedMovement = await saveDb(movementRepo, movement);

      await auditLogger.logUpdate("StockItem", updatedStock.id, { quantity: oldQty }, { quantity: newQty }, user);
      await auditLogger.logCreate("StockMovement", savedMovement.id, savedMovement, user);

      return { stockItem: updatedStock, movement: savedMovement };
    } catch (error) {
      console.error("Failed to update stock:", error.message);
      throw error;
    }
  }

  /**
   * Get products with low stock (based on StockItem threshold)
   * @param {number} [threshold]
   */
  async getLowStock(threshold) {
    const { stockItem: repo } = await this.getRepositories();

    try {
      const qb = repo.createQueryBuilder("stockItem")
        .leftJoinAndSelect("stockItem.product", "product")
        .leftJoinAndSelect("stockItem.warehouse", "warehouse")
        .where("product.is_deleted = false")
        .andWhere("stockItem.is_deleted = false");

      if (threshold !== undefined) {
        qb.andWhere("stockItem.quantity <= :threshold", { threshold });
      } else {
        qb.andWhere("stockItem.quantity <= stockItem.low_stock_threshold OR (stockItem.low_stock_threshold IS NULL AND stockItem.quantity <= stockItem.reorder_level)");
      }

      return await qb.getMany();
    } catch (error) {
      console.error("Failed to get low stock products:", error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  async getStatistics() {
    const { product: productRepo, stockItem: stockRepo } = await this.getRepositories();

    try {
      const totalActive = await productRepo.count({ where: { is_deleted: false, is_active: true } });
      const totalInactive = await productRepo.count({ where: { is_deleted: false, is_active: false } });

      // Total stock value (sum of quantity * cost_per_item across all stock items)
      const stockValueResult = await stockRepo.createQueryBuilder("stockItem")
        .leftJoin("stockItem.product", "product")
        .select("SUM(stockItem.quantity * product.cost_per_item)", "totalValue")
        .where("product.is_deleted = false AND stockItem.is_deleted = false")
        .getRawOne();
      const totalStockValue = parseFloat(stockValueResult.totalValue) || 0;

      // Average price of active products
      const avgPriceResult = await productRepo.createQueryBuilder("product")
        .select("AVG(product.net_price)", "averagePrice")
        .where("product.is_deleted = false AND product.is_active = true")
        .getRawOne();
      const averagePrice = parseFloat(avgPriceResult.averagePrice) || 0;

      // Products with zero stock (through stock items)
      const zeroStock = await stockRepo.createQueryBuilder("stockItem")
        .leftJoin("stockItem.product", "product")
        .where("product.is_deleted = false AND stockItem.is_deleted = false AND stockItem.quantity = 0")
        .getCount();

      return { totalActive, totalInactive, totalStockValue, averagePrice, zeroStock };
    } catch (error) {
      console.error("Failed to get product statistics:", error);
      throw error;
    }
  }

  /**
   * Export products to CSV/JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   */
  async exportProducts(format = "json", filters = {}, user = "system") {
    try {
      const products = await this.findAll(filters);
      let exportData;
      if (format === "csv") {
        const headers = ["ID", "SKU", "Name", "Description", "Net Price", "Cost Per Item", "Active", "Created At"];
        const rows = products.map(p => [
          p.id, p.sku, p.name, p.description || "", p.net_price, p.cost_per_item,
          p.is_active ? "Yes" : "No",
          new Date(p.created_at).toLocaleDateString()
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map(row => row.join(",")).join("\n"),
          filename: `products_export_${new Date().toISOString().split("T")[0]}.csv`
        };
      } else {
        exportData = {
          format: "json",
          data: products,
          filename: `products_export_${new Date().toISOString().split("T")[0]}.json`
        };
      }
      await auditLogger.logExport("Product", format, filters, user);
      return exportData;
    } catch (error) {
      console.error("Failed to export products:", error);
      throw error;
    }
  }
}

const productService = new ProductService();
module.exports = productService;