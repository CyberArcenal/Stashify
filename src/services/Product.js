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
    const Tax = require("../entities/Tax");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.productRepository = AppDataSource.getRepository(Product);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.stockItemRepository = AppDataSource.getRepository(StockItem);
    this.stockMovementRepository = AppDataSource.getRepository(StockMovement);
    this.taxRepository = AppDataSource.getRepository(Tax);
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
      tax: this.taxRepository,
    };
  }

  /**
   * Create a new product
   * @param {Object} data
   * @param {string} user
   */

  async create(data, user = "system") {
    const {
      saveDb,
      // ... other destructured actions
    } = require("../utils/dbUtils/dbActions");
    const {
      product: repo,
      category: categoryRepo,
      tax: taxRepo,
    } = await this.getRepositories();

    try {
      // Validate required fields
      if (!data.name) throw new Error("Product name is required");
      if (!data.sku) throw new Error("SKU is required");

      // Check SKU uniqueness
      const existing = await repo.findOne({ where: { sku: data.sku } });
      if (existing)
        throw new Error(`Product with SKU "${data.sku}" already exists`);

      // Generate slug if not provided
      if (!data.slug) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }

      // Handle category relation
      let category = null;
      if (data.categoryId) {
        category = await categoryRepo.findOne({
          where: { id: data.categoryId },
        });
        if (!category)
          throw new Error(`Category with ID ${data.categoryId} not found`);
        delete data.categoryId;
      }

      // --- Handle taxes ---
      let taxes = [];
      if (data.taxIds !== undefined) {
        // Use provided tax IDs
        const taxIds = (data.taxIds || []).map((id) => Number(id));
        if (taxIds.length > 0) {
          taxes = await taxRepo.findByIds(taxIds);
          if (taxes.length !== taxIds.length) {
            const foundIds = taxes.map((t) => t.id);
            const missing = taxIds.filter((id) => !foundIds.includes(id));
            throw new Error(`Tax IDs not found: ${missing.join(", ")}`);
          }
        }
        delete data.taxIds;
      } else {
        // No taxIds provided → use default taxes
        taxes = await taxRepo.find({
          where: { is_default: true, is_deleted: false, is_enabled: true },
        });
      }

      const productData = { ...data, category, taxes };
      const product = repo.create(productData);
      const saved = await saveDb(repo, product);
      await auditLogger.logCreate("Product", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create product:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system", queryRunner = null) {
    // Kunin ang repositories – gumamit ng queryRunner kung meron
    let repo, categoryRepo, taxRepo;
    if (queryRunner) {
      const Product = require("../entities/Product");
      const Category = require("../entities/Category");
      const Tax = require("../entities/Tax");

      repo = queryRunner.manager.getRepository(Product);

      categoryRepo = queryRunner.manager.getRepository(Category);

      taxRepo = queryRunner.manager.getRepository(Tax);
    } else {
      const repos = await this.getRepositories();
      repo = repos.product;
      categoryRepo = repos.category;
      taxRepo = repos.tax;
    }

    try {
      // Kunin ang existing product (with current taxes)
      const existing = await repo.findOne({
        where: { id },
        relations: ["taxes"],
      });
      if (!existing) throw new Error(`Product with ID ${id} not found`);
      const oldData = { ...existing };

      // --- I-update ang mga field (maliban sa taxes) ---
      // SKU uniqueness check
      if (data.sku && data.sku !== existing.sku) {
        const skuExists = await repo.findOne({ where: { sku: data.sku } });
        if (skuExists)
          throw new Error(`Product with SKU "${data.sku}" already exists`);
      }

      // Category update
      if (data.categoryId !== undefined) {
        if (data.categoryId === null) {
          existing.category = null;
        } else {
          const category = await categoryRepo.findOne({
            where: { id: data.categoryId },
          });
          if (!category)
            throw new Error(`Category with ID ${data.categoryId} not found`);
          existing.category = category;
        }
        delete data.categoryId;
      }

      // I-apply ang ibang field updates (name, price, etc.)
      Object.assign(existing, data);
      existing.updated_at = new Date();

      // --- HAKBANG 1: I-save muna ang product nang walang taxes ---
      // I-clone at tanggalin ang taxes para hindi ito isama ni TypeORM sa save
      const productToSave = { ...existing };
      delete productToSave.taxes;

      const { updateDb } = require("../utils/dbUtils/dbActions");
      const savedProduct = await updateDb(repo, productToSave);

      // --- HAKBANG 2: I-set ang taxes at i-save muli gamit ang updateDb ---
      if (data.taxIds !== undefined) {
        const newTaxIds = (data.taxIds || []).map((id) => Number(id)).sort();

        const oldTaxIds = (oldData.taxes || []).map((t) => t.id).sort();

        if (JSON.stringify(oldTaxIds) !== JSON.stringify(newTaxIds)) {
          // Validate kung may existing ang mga tax IDs
          if (newTaxIds.length > 0) {
            const taxes = await taxRepo.findByIds(newTaxIds);
            if (taxes.length !== newTaxIds.length) {
              const foundIds = taxes.map((t) => t.id);

              const missing = newTaxIds.filter((id) => !foundIds.includes(id));
              throw new Error(`Tax IDs not found: ${missing.join(", ")}`);
            }
            // I-assign ang mga tax entities sa savedProduct
            savedProduct.taxes = taxes;
          } else {
            savedProduct.taxes = [];
          }

          // I-save muli ang product – ito ang magti-trigger ng subscriber
          await updateDb(repo, savedProduct);
        }
      }

      // --- I-reload ang product para makuha ang updated taxes (opsyonal) ---
      const updatedProduct = await repo.findOne({
        where: { id },
        relations: ["taxes"],
      });

      await auditLogger.logUpdate("Product", id, oldData, updatedProduct, user);
      return updatedProduct;
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
    const {
      saveDb,
      updateDb,

      removeDb,
    } = require("../utils/dbUtils/dbActions");
    const { product: repo } = await this.getRepositories();

    try {
      const product = await repo.findOne({ where: { id } });
      if (!product) throw new Error(`Product with ID ${id} not found`);
      if (product.is_deleted)
        throw new Error(`Product #${id} is already deleted`);

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
      const product = await repo
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.variants", "variants")
        .leftJoinAndSelect(
          "product.images",
          "images",
          "images.is_deleted = :imageDeleted",
          { imageDeleted: false },
        )
        .leftJoinAndSelect("product.taxes", "taxes")
        .where("product.id = :id", { id })
        .andWhere("product.is_deleted = false")
        .getOne();

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
      const qb = repo
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect("product.variants", "variants")
        .leftJoinAndSelect(
          "product.images",
          "images",
          "images.is_deleted = :imageDeleted",
          { imageDeleted: false },
        )
        .leftJoinAndSelect("product.stockItems", "stockItems")
        .leftJoinAndSelect("product.taxes", "taxes")
        .where("product.is_deleted = :isDeleted", { isDeleted: false });

      if (options.is_active !== undefined) {
        qb.andWhere("product.is_active = :isActive", {
          isActive: options.is_active,
        });
      }

      if (options.categoryId) {
        qb.andWhere("category.id = :categoryId", {
          categoryId: options.categoryId,
        });
      }

      if (options.search) {
        qb.andWhere(
          "(product.name LIKE :search OR product.sku LIKE :search OR product.barcode LIKE :search)",

          { search: `%${options.search}%` },
        );
      }

      if (options.minPrice !== undefined) {
        qb.andWhere("product.net_price >= :minPrice", {
          minPrice: options.minPrice,
        });
      }

      if (options.maxPrice !== undefined) {
        qb.andWhere("product.net_price <= :maxPrice", {
          maxPrice: options.maxPrice,
        });
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

  async bulkUpdateTaxes(productIds, taxIds, operation, user = "system") {
    const { product: productRepo } = await this.getRepositories();
    const results = [];

    for (const productId of productIds) {
      try {
        const product = await productRepo.findOne({
          where: { id: productId, is_deleted: false },
          relations: ["taxes"],
        });
        if (!product) {
          results.push({
            id: productId,
            success: false,
            error: "Product not found",
          });
          continue;
        }

        const currentTaxIds = product.taxes.map((t) => t.id);
        let newTaxIds;

        switch (operation) {
          case "replace":
            newTaxIds = taxIds;
            break;
          case "add":
            newTaxIds = [...new Set([...currentTaxIds, ...taxIds])];
            break;
          case "remove":
            newTaxIds = currentTaxIds.filter((id) => !taxIds.includes(id));
            break;
          default:
            results.push({
              id: productId,
              success: false,
              error: "Invalid operation",
            });
            continue;
        }

        // Update the many-to-many relation
        await productRepo
          .createQueryBuilder()
          .relation("taxes")
          .of(productId)
          .addAndRemove(newTaxIds, currentTaxIds);

        results.push({ id: productId, success: true });
      } catch (err) {
        results.push({ id: productId, success: false, error: err.message });
      }
    }

    // Audit log for the bulk action
    await auditLogger.log({
      action: "BULK_UPDATE_TAXES",
      entity: "Product",
      newData: { productIds, taxIds, operation },
      user,
    });

    return results;
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
  async updateStock(
    productId,
    warehouseId,
    quantityChange,
    movementType,
    referenceCode,

    reason = null,
    user = "system",
  ) {
    const {
      saveDb,
      updateDb,

      removeDb,
    } = require("../utils/dbUtils/dbActions");
    const {
      product: productRepo,
      stockItem: stockItemRepo,
      stockMovement: movementRepo,
    } = await this.getRepositories();

    try {
      const product = await productRepo.findOne({
        where: { id: productId, is_deleted: false },
      });
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
      if (newQty < 0)
        throw new Error(
          `Insufficient stock. Current: ${oldQty}, change: ${quantityChange}`,
        );

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

      await auditLogger.logUpdate(
        "StockItem",

        updatedStock.id,
        { quantity: oldQty },
        { quantity: newQty },
        user,
      );
      await auditLogger.logCreate(
        "StockMovement",

        savedMovement.id,
        savedMovement,
        user,
      );

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
      const qb = repo
        .createQueryBuilder("stockItem")
        .leftJoinAndSelect("stockItem.product", "product")
        .leftJoinAndSelect("stockItem.warehouse", "warehouse")
        .where("product.is_deleted = false")
        .andWhere("stockItem.is_deleted = false");

      if (threshold !== undefined) {
        qb.andWhere("stockItem.quantity <= :threshold", { threshold });
      } else {
        qb.andWhere(
          "stockItem.quantity <= stockItem.low_stock_threshold OR (stockItem.low_stock_threshold IS NULL AND stockItem.quantity <= stockItem.reorder_level)",
        );
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
    const { product: productRepo, stockItem: stockRepo } =
      await this.getRepositories();

    try {
      const totalActive = await productRepo.count({
        where: { is_deleted: false, is_active: true },
      });

      const totalInactive = await productRepo.count({
        where: { is_deleted: false, is_active: false },
      });

      // Total stock value (sum of quantity * cost_per_item across all stock items)

      const stockValueResult = await stockRepo
        .createQueryBuilder("stockItem")
        .leftJoin("stockItem.product", "product")
        .select("SUM(stockItem.quantity * product.cost_per_item)", "totalValue")
        .where("product.is_deleted = false AND stockItem.is_deleted = false")
        .getRawOne();
      const totalStockValue = parseFloat(stockValueResult.totalValue) || 0;

      // Average price of active products

      const avgPriceResult = await productRepo
        .createQueryBuilder("product")
        .select("AVG(product.net_price)", "averagePrice")
        .where("product.is_deleted = false AND product.is_active = true")
        .getRawOne();
      const averagePrice = parseFloat(avgPriceResult.averagePrice) || 0;

      // Products with zero stock (through stock items)

      const zeroStock = await stockRepo
        .createQueryBuilder("stockItem")
        .leftJoin("stockItem.product", "product")
        .where(
          "product.is_deleted = false AND stockItem.is_deleted = false AND stockItem.quantity = 0",
        )
        .getCount();

      return {
        totalActive,
        totalInactive,
        totalStockValue,
        averagePrice,
        zeroStock,
      };
    } catch (error) {
      console.error("Failed to get product statistics:", error);
      throw error;
    }
  }
}

const productService = new ProductService();
module.exports = productService;
