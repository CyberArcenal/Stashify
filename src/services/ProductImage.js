// services/ProductImageService.js
// @ts-check

const auditLogger = require("../utils/auditLogger");
// @ts-ignore

const { FileUploadHandler } = require("../utils/products/fileUpload");

class ProductImageService {
  constructor() {
    this.repository = null;
    this.productRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const ProductImage = require("../entities/ProductImage");
    const Product = require("../entities/Product");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(ProductImage);
    this.productRepository = AppDataSource.getRepository(Product);
    console.log("ProductImageService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      image: this.repository,
      product: this.productRepository,
    };
  }

  /**
   * Create a new product image
   * @param {Object} data - Image data
   * @param {number} data.productId - Product ID
   * @param {Object} [data.file] - File object from multer/electron (contains buffer, originalname, etc.)
   * @param {string} [data.image_url] - Optional direct image URL (if file not provided)
   * @param {string} [data.image_path] - Optional direct image path (if file not provided)
   * @param {string} [data.alt_text] - Alt text
   * @param {boolean} [data.is_primary=false] - Whether this is primary image
   * @param {number} [data.sort_order=0] - Sort order
   * @param {string} [user="system"] - User performing the action
   * @returns {Promise<any>}
   */
  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { image: repo, product: productRepo } = await this.getRepositories();
    try {
      // Validate required fields
      if (!data.productId) throw new Error("productId is required");

      // Check if there's a file to upload
      if (data.file) {
        try {
          const uploadResult = await FileUploadHandler.saveProductImage(
            // @ts-ignore
            data.file,
            data.productId.toString(),
          );
          data.image_path = uploadResult.image_path;
          data.image_url = uploadResult.image_url;
        } catch (uploadError) {
          console.error("Failed to save uploaded file:", uploadError);
          // @ts-ignore
          throw new Error(`File upload failed: ${uploadError.message}`);
        }
      }

      // Validate that we have either image_url or image_path after potential upload
      if (!data.image_url && !data.image_path) {
        throw new Error(
          "Either image_url, image_path, or a file must be provided",
        );
      }

      // Find the product
      // @ts-ignore
      const product = await productRepo.findOne({
        where: { id: data.productId, is_deleted: false },
      });
      if (!product)
        throw new Error(`Product with ID ${data.productId} not found`);

      // If this image is marked as primary, ensure no other primary images exist for this product
      if (data.is_primary) {
        await this.resetPrimaryForProduct(data.productId);
      }

      // Prepare data for creation
      const imageData = {
        product,
        image_url: data.image_url,
        image_path: data.image_path,
        alt_text: data.alt_text,
        is_primary: data.is_primary || false,
        sort_order: data.sort_order !== undefined ? data.sort_order : 0,
      };

      // @ts-ignore
      const image = repo.create(imageData);
      // @ts-ignore
      const saved = await saveDb(repo, image);
      // @ts-ignore
      await auditLogger.logCreate("ProductImage", saved.id, saved, user);

      console.log(
        `Product image created: ID ${saved.id} for product ${data.productId}`,
      );
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to create product image:", error.message);
      throw error;
    }
  }

  /**
   * Reset primary status for all images of a product
   * @param {number} productId
   * @returns {Promise<void>}
   */
  async resetPrimaryForProduct(productId) {
    const { image: repo } = await this.getRepositories();
    // @ts-ignore
    await repo
      .createQueryBuilder()
      .update()
      .set({ is_primary: false })
      .where("product_id = :productId", { productId })
      .execute();
  }

  // @ts-ignore
  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { image: repo, product: productRepo } = await this.getRepositories();
    try {
      // @ts-ignore
      const existing = await repo.findOne({
        where: { id },
        relations: ["product"],
      });
      if (!existing) throw new Error(`ProductImage with ID ${id} not found`);
      const oldData = { ...existing };

      // Handle file upload if provided in update
      if (data.file) {
        try {
          const uploadResult = await FileUploadHandler.saveProductImage(
            data.file,
            // @ts-ignore
            existing.product.id.toString(),
          );
          data.image_path = uploadResult.image_path;
          data.image_url = uploadResult.image_url;
        } catch (uploadError) {
          console.error(
            "Failed to save uploaded file during update:",
            uploadError,
          );
          // @ts-ignore
          throw new Error(`File upload failed: ${uploadError.message}`);
        }
      }

      // Handle product change if needed
      if (data.productId !== undefined) {
        // @ts-ignore
        const product = await productRepo.findOne({
          where: { id: data.productId, is_deleted: false },
        });
        if (!product)
          throw new Error(`Product with ID ${data.productId} not found`);
        // @ts-ignore
        existing.product = product;
        delete data.productId;
      }

      // If setting as primary, ensure no other primary images exist for this product
      if (data.is_primary === true && !existing.is_primary) {
        // @ts-ignore
        await this.resetPrimaryForProduct(existing.product.id);
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      // @ts-ignore
      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("ProductImage", id, oldData, saved, user);
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to update product image:", error.message);
      throw error;
    }
  }

  // @ts-ignore
  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { image: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const image = await repo.findOne({ where: { id } });
      if (!image) throw new Error(`ProductImage with ID ${id} not found`);
      if (image.is_deleted)
        throw new Error(`ProductImage #${id} is already deleted`);

      const oldData = { ...image };
      image.is_deleted = true;
      image.updated_at = new Date();

      // @ts-ignore
      const saved = await updateDb(repo, image);
      await auditLogger.logDelete("ProductImage", id, oldData, user);
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to delete product image:", error.message);
      throw error;
    }
  }

  // @ts-ignore
  async findById(id) {
    const { image: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const image = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["product"],
      });
      if (!image) throw new Error(`ProductImage with ID ${id} not found`);
      await auditLogger.logView("ProductImage", id, "system");
      return image;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to find product image:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { image: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const qb = repo
        .createQueryBuilder("image")
        .leftJoinAndSelect("image.product", "product")
        .where("image.is_deleted = :isDeleted", { isDeleted: false });

      // @ts-ignore
      if (options.productId) {
        qb.andWhere("product.id = :productId", {
          // @ts-ignore
          productId: options.productId,
        });
      }
      // @ts-ignore
      if (options.is_primary !== undefined) {
        qb.andWhere("image.is_primary = :isPrimary", {
          // @ts-ignore
          isPrimary: options.is_primary,
        });
      }

      // @ts-ignore
      const sortBy = options.sortBy || "sort_order";
      // @ts-ignore
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`image.${sortBy}`, sortOrder);

      // @ts-ignore
      if (options.page && options.limit) {
        // @ts-ignore
        const skip = (options.page - 1) * options.limit;
        // @ts-ignore
        qb.skip(skip).take(options.limit);
      }

      const images = await qb.getMany();
      // @ts-ignore
      await auditLogger.logView("ProductImage", null, "system");
      return images;
    } catch (error) {
      console.error("Failed to fetch product images:", error);
      throw error;
    }
  }
}

const productImageService = new ProductImageService();
module.exports = productImageService;
