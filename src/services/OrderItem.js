// services/OrderItemService.js

const auditLogger = require("../utils/auditLogger");


class OrderItemService {
  constructor() {
    this.repository = null;
    this.orderRepository = null;
    this.productRepository = null;
    this.variantRepository = null;
    this.warehouseRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const OrderItem = require("../entities/OrderItem");
    const Order = require("../entities/Order");
    const Product = require("../entities/Product");
    const ProductVariant = require("../entities/ProductVariant");
    const Warehouse = require("../entities/Warehouse");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(OrderItem);
    this.orderRepository = AppDataSource.getRepository(Order);
    this.productRepository = AppDataSource.getRepository(Product);
    this.variantRepository = AppDataSource.getRepository(ProductVariant);
    this.warehouseRepository = AppDataSource.getRepository(Warehouse);
    console.log("OrderItemService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      item: this.repository,
      order: this.orderRepository,
      product: this.productRepository,
      variant: this.variantRepository,
      warehouse: this.warehouseRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { item: repo, order: orderRepo, product: productRepo, variant: variantRepo, warehouse: warehouseRepo } = await this.getRepositories();
    try {
      if (!data.orderId) throw new Error("orderId is required");
      if (!data.productId) throw new Error("productId is required");
      if (data.quantity === undefined) throw new Error("quantity is required");

      const order = await orderRepo.findOne({ where: { id: data.orderId } });
      if (!order) throw new Error(`Order with ID ${data.orderId} not found`);

      const product = await productRepo.findOne({ where: { id: data.productId } });
      if (!product) throw new Error(`Product with ID ${data.productId} not found`);

      let variant = null;
      if (data.variantId) {
        variant = await variantRepo.findOne({ where: { id: data.variantId } });
        if (!variant) throw new Error(`Variant with ID ${data.variantId} not found`);
      }

      let warehouse = null;
      if (data.warehouseId) {
        warehouse = await warehouseRepo.findOne({ where: { id: data.warehouseId } });
        if (!warehouse) throw new Error(`Warehouse with ID ${data.warehouseId} not found`);
      }

      const itemData = {
        ...data,
        order,
        product,
        variant,
        warehouse,
      };
      delete itemData.orderId;
      delete itemData.productId;
      delete itemData.variantId;
      delete itemData.warehouseId;

      const item = repo.create(itemData);
      const saved = await saveDb(repo, item);
      await auditLogger.logCreate("OrderItem", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create order item:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { item: repo, order: orderRepo, product: productRepo, variant: variantRepo, warehouse: warehouseRepo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id }, relations: ["order", "product", "variant", "warehouse"] });
      if (!existing) throw new Error(`OrderItem with ID ${id} not found`);
      const oldData = { ...existing };

      // Handle relations
      if (data.orderId !== undefined) {
        const order = await orderRepo.findOne({ where: { id: data.orderId } });
        if (!order) throw new Error(`Order with ID ${data.orderId} not found`);
        existing.order = order;
        delete data.orderId;
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
      if (data.warehouseId !== undefined) {
        if (data.warehouseId === null) {
          existing.warehouse = null;
        } else {
          const warehouse = await warehouseRepo.findOne({ where: { id: data.warehouseId } });
          if (!warehouse) throw new Error(`Warehouse with ID ${data.warehouseId} not found`);
          existing.warehouse = warehouse;
        }
        delete data.warehouseId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("OrderItem", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update order item:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { item: repo } = await this.getRepositories();
    try {
      const item = await repo.findOne({ where: { id } });
      if (!item) throw new Error(`OrderItem with ID ${id} not found`);
      if (item.is_deleted) throw new Error(`OrderItem #${id} is already deleted`);

      const oldData = { ...item };
      item.is_deleted = true;
      item.updated_at = new Date();

      const saved = await updateDb(repo, item);
      await auditLogger.logDelete("OrderItem", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete order item:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { item: repo } = await this.getRepositories();
    try {
      const item = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["order", "product", "variant", "warehouse"],
      });
      if (!item) throw new Error(`OrderItem with ID ${id} not found`);
      await auditLogger.logView("OrderItem", id, "system");
      return item;
    } catch (error) {
      console.error("Failed to find order item:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { item: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("item")
        .leftJoinAndSelect("item.order", "order")
        .leftJoinAndSelect("item.product", "product")
        .leftJoinAndSelect("item.variant", "variant")
        .leftJoinAndSelect("item.warehouse", "warehouse")
        .where("item.is_deleted = :isDeleted", { isDeleted: false });

      if (options.orderId) {
        qb.andWhere("order.id = :orderId", { orderId: options.orderId });
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
      await auditLogger.logView("OrderItem", null, "system");
      return items;
    } catch (error) {
      console.error("Failed to fetch order items:", error);
      throw error;
    }
  }
}

const orderItemService = new OrderItemService();
module.exports = orderItemService;