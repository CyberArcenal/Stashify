// services/ProductVariantService.js
const auditLogger = require("../utils/auditLogger");

class ProductVariantService {
  constructor() {
    this.repository = null;
    this.productRepository = null;
    this.taxRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const ProductVariant = require("../entities/ProductVariant");
    const Product = require("../entities/Product");
    const Tax = require("../entities/Tax");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(ProductVariant);
    this.productRepository = AppDataSource.getRepository(Product);
    this.taxRepository = AppDataSource.getRepository(Tax);
    console.log("ProductVariantService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      variant: this.repository,
      product: this.productRepository,
      tax: this.taxRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const {
      variant: repo,
      product: productRepo,
      tax: taxRepo,
    } = await this.getRepositories();
    try {
      if (!data.productId) throw new Error("productId is required");
      if (!data.name) throw new Error("Variant name is required");

      const product = await productRepo.findOne({
        where: { id: data.productId },
      });
      if (!product)
        throw new Error(`Product with ID ${data.productId} not found`);

      // SKU uniqueness if provided
      if (data.sku) {
        const existing = await repo.findOne({ where: { sku: data.sku } });
        if (existing)
          throw new Error(`Variant with SKU "${data.sku}" already exists`);
      }
      // Barcode uniqueness if provided
      if (data.barcode) {
        const existing = await repo.findOne({
          where: { barcode: data.barcode },
        });
        if (existing)
          throw new Error(
            `Variant with barcode "${data.barcode}" already exists`,
          );
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

      const variantData = { ...data, product, taxes };
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

  async update(id, data, user = "system", queryRunner = null) {
    // Determine which repositories to use
    let repo, productRepo, taxRepo;
    if (queryRunner) {
      const ProductVariant = require("../entities/ProductVariant");
      const Product = require("../entities/Product");
      const Tax = require("../entities/Tax");

      repo = queryRunner.manager.getRepository(ProductVariant);

      productRepo = queryRunner.manager.getRepository(Product);

      taxRepo = queryRunner.manager.getRepository(Tax);
    } else {
      const repos = await this.getRepositories();
      repo = repos.variant;
      productRepo = repos.product;
      taxRepo = repos.tax;
    }

    try {
      const existing = await repo.findOne({
        where: { id },
        relations: ["product", "taxes"],
      });
      if (!existing) throw new Error(`ProductVariant with ID ${id} not found`);
      const oldData = { ...existing };

      // SKU uniqueness if changed
      if (data.sku && data.sku !== existing.sku) {
        const skuExists = await repo.findOne({ where: { sku: data.sku } });
        if (skuExists)
          throw new Error(`Variant with SKU "${data.sku}" already exists`);
      }
      // Barcode uniqueness if changed
      if (data.barcode && data.barcode !== existing.barcode) {
        const barcodeExists = await repo.findOne({
          where: { barcode: data.barcode },
        });
        if (barcodeExists)
          throw new Error(
            `Variant with barcode "${data.barcode}" already exists`,
          );
      }

      // Handle product change
      if (data.productId !== undefined) {
        const product = await productRepo.findOne({
          where: { id: data.productId },
        });
        if (!product)
          throw new Error(`Product with ID ${data.productId} not found`);
        existing.product = product;
        delete data.productId;
      }

      // Apply other field updates
      Object.assign(existing, data);
      existing.updated_at = new Date();

      // --- HAKBANG 1: I-save muna ang variant nang walang taxes ---
      const variantToSave = { ...existing };
      delete variantToSave.taxes;

      const { updateDb } = require("../utils/dbUtils/dbActions");
      const savedVariant = await updateDb(repo, variantToSave);

      // --- HAKBANG 2: I-set ang taxes at i-save muli kung nagbago ---
      if (data.taxIds !== undefined) {
        const newTaxIds = (data.taxIds || []).map((id) => Number(id)).sort();

        const oldTaxIds = (oldData.taxes || []).map((t) => t.id).sort();

        if (JSON.stringify(oldTaxIds) !== JSON.stringify(newTaxIds)) {
          if (newTaxIds.length > 0) {
            const taxes = await taxRepo.findByIds(newTaxIds);
            if (taxes.length !== newTaxIds.length) {
              const foundIds = taxes.map((t) => t.id);

              const missing = newTaxIds.filter((id) => !foundIds.includes(id));
              throw new Error(`Tax IDs not found: ${missing.join(", ")}`);
            }
            savedVariant.taxes = taxes;
          } else {
            savedVariant.taxes = [];
          }

          // I-save muli – ito ang magti-trigger ng pangalawang afterUpdate
          await updateDb(repo, savedVariant);
        }
      }

      // I-reload para sa audit log
      const updatedVariant = await repo.findOne({
        where: { id },
        relations: ["taxes"],
      });

      await auditLogger.logUpdate(
        "ProductVariant",
        id,
        oldData,
        updatedVariant,
        user,
      );
      return updatedVariant;
    } catch (error) {
      console.error("Failed to update product variant:", error.message);
      throw error;
    }
  }

  async bulkUpdateTaxes(variantIds, taxIds, operation, user = "system") {
    const { variant: variantRepo } = await this.getRepositories();
    const results = [];

    for (const variantId of variantIds) {
      try {
        const variant = await variantRepo.findOne({
          where: { id: variantId, is_deleted: false },
          relations: ["taxes"],
        });
        if (!variant) {
          results.push({
            id: variantId,
            success: false,
            error: "Variant not found",
          });
          continue;
        }

        const currentTaxIds = variant.taxes.map((t) => t.id);
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
              id: variantId,
              success: false,
              error: "Invalid operation",
            });
            continue;
        }

        // Update many-to-many relation
        await variantRepo
          .createQueryBuilder()
          .relation("taxes")
          .of(variantId)
          .addAndRemove(newTaxIds, currentTaxIds);

        results.push({ id: variantId, success: true });
      } catch (err) {
        results.push({ id: variantId, success: false, error: err.message });
      }
    }

    await auditLogger.log({
      action: "BULK_UPDATE_VARIANT_TAXES",
      entity: "ProductVariant",
      newData: { variantIds, taxIds, operation },
      user,
    });

    return results;
  }

  async delete(id, user = "system") {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const { variant: repo } = await this.getRepositories();
    try {
      const variant = await repo.findOne({ where: { id } });
      if (!variant) throw new Error(`ProductVariant with ID ${id} not found`);
      if (variant.is_deleted)
        throw new Error(`Variant #${id} is already deleted`);

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
        relations: [
          "product",
          "stockItems",
          "orderItems",
          "purchaseItems",
          "taxes",
          "product.images",
        ],
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
      const qb = repo
        .createQueryBuilder("variant")
        .leftJoinAndSelect("variant.product", "product")
        .leftJoinAndSelect("product.category", "category")
        .leftJoinAndSelect(
          "product.images",
          "images",
          "images.is_deleted = :imageDeleted",
          { imageDeleted: false },
        )
        .leftJoinAndSelect("variant.stockItems", "stockItems")
        .leftJoinAndSelect("variant.taxes", "taxes") // ← add taxes
        .where("variant.is_deleted = :isDeleted", { isDeleted: false });

      if (options.productId) {
        qb.andWhere("product.id = :productId", {
          productId: options.productId,
        });
      }

      if (options.is_active !== undefined) {
        qb.andWhere("variant.is_active = :isActive", {
          isActive: options.is_active,
        });
      }

      if (options.search) {
        qb.andWhere(
          "(variant.name LIKE :search OR variant.sku LIKE :search OR variant.barcode LIKE :search)",

          { search: `%${options.search}%` },
        );
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
