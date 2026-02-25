// services/OrderService.js
//@ts-check

const auditLogger = require("../utils/auditLogger");

const { validateOrderData } = require("../utils/order");
// 🔧 SETTINGS INTEGRATION
const {
  taxRate,
  discountEnabled,
  maxDiscountPercent,
  allowNegativeStock,
} = require("../utils/settings/system");

class OrderService {
  constructor() {
    this.orderRepository = null;
    this.customerRepository = null;
    this.productRepository = null;
    this.orderItemService = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Order = require("../entities/Order");
    const Customer = require("../entities/Customer");
    const Product = require("../entities/Product");
    const OrderItemService = require("./OrderItem");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.orderRepository = AppDataSource.getRepository(Order);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.productRepository = AppDataSource.getRepository(Product);
    this.orderItemService = OrderItemService;
    await this.orderItemService.initialize();
    console.log("OrderService initialized");
  }

  async getRepositories() {
    if (!this.orderRepository) {
      await this.initialize();
    }
    return {
      order: this.orderRepository,
      customer: this.customerRepository,
      product: this.productRepository,
      orderItemService: this.orderItemService,
    };
  }

  /**
   * Create a new order (initiated → pending)
   * @param {Object} orderData
   * @param {string} user
   */
  async create(orderData, user = "system") {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const {
      order: orderRepo,
      customer: customerRepo,
      product: productRepo,
      orderItemService,
    } = await this.getRepositories();

    try {
      // 1. Validate order data
      const validation = validateOrderData(orderData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      // @ts-ignore
      const { items, customerId, notes = null } = orderData;

      // 🔧 Settings checks
      const isDiscountEnabled = await discountEnabled();
      // @ts-ignore
      const hasDiscount = items.some((i) => (i.discount || 0) > 0);
      if (hasDiscount && !isDiscountEnabled) {
        throw new Error("Discounts are disabled in system settings.");
      }

      const maxDiscount = await maxDiscountPercent();
      const defaultTaxRate = await taxRate();

      // Customer handling
      let customer = null;
      if (customerId) {
        // @ts-ignore
        customer = await customerRepo.findOne({ where: { id: customerId } });
        if (!customer)
          throw new Error(`Customer with ID ${customerId} not found`);
      }

      // Process items
      const itemDetails = [];
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscount = 0;

      for (const item of items) {
        // @ts-ignore
        const product = await productRepo.findOne({
          where: { id: item.productId, is_deleted: false },
        });
        if (!product)
          throw new Error(`Product ID ${item.productId} not found or deleted`);

        const unitPrice =
          item.unitPrice !== undefined ? item.unitPrice : product.net_price;
        if (unitPrice === undefined || unitPrice === null) {
          throw new Error(
            `Unit price not specified and product ${product.id} has no net_price`,
          );
        }

        const quantity = item.quantity;
        const discount = item.discount || 0;

        // Validate discount percentage
        const itemSubtotal = unitPrice * quantity;
        const discountPercent = (discount / itemSubtotal) * 100;
        if (discount > 0 && discountPercent > maxDiscount) {
          throw new Error(
            `Discount exceeds maximum allowed (${maxDiscount}%) for product ID ${product.id}`,
          );
        }

        // Tax rate handling
        let taxRate = item.taxRate;
        if (taxRate === undefined || taxRate === null) {
          taxRate = defaultTaxRate > 0 ? defaultTaxRate / 100 : 0; // convert to decimal
        } else {
          taxRate = taxRate / 100; // assume input is percentage
        }

        const lineNetTotal = itemSubtotal - discount;
        const lineTaxTotal = lineNetTotal * taxRate;
        const lineGrossTotal = lineNetTotal + lineTaxTotal;

        itemDetails.push({
          product,
          quantity,
          unitPrice,
          discount,
          taxRate: taxRate * 100, // store as percentage
          lineNetTotal,
          lineTaxTotal,
          lineGrossTotal,
          variantId: item.variantId || null,
          warehouseId: item.warehouseId || null,
        });

        subtotal += itemSubtotal;
        totalTax += lineTaxTotal;
        totalDiscount += discount;
      }

      // Stock check (if negative stock not allowed)
      const negativeStockAllowed = await allowNegativeStock();
      if (!negativeStockAllowed) {
        // Implement actual stock check using StockItemService if needed
        // For now, we assume stock is sufficient or skip
      }

      const total = subtotal - totalDiscount + totalTax;

      // 1. Create order with status 'initiated'
      // @ts-ignore
      const order = orderRepo.create({
        // @ts-ignore
        order_number: orderData.order_number,
        status: "initiated",
        subtotal: this.round2(subtotal),
        tax_amount: this.round2(totalTax),
        total: this.round2(total),
        notes,
        customer,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      });

      // @ts-ignore
      const savedOrder = await saveDb(orderRepo, order);
      // @ts-ignore
      await auditLogger.logCreate("Order", savedOrder.id, savedOrder, user);

      // 2. Create order items
      for (const det of itemDetails) {
        const itemData = {
          orderId: savedOrder.id,
          productId: det.product.id,
          variantId: det.variantId,
          warehouseId: det.warehouseId,
          quantity: det.quantity,
          unit_price: det.unitPrice,
          discount_amount: det.discount,
          tax_rate: det.taxRate,
          line_net_total: det.lineNetTotal,
          line_tax_total: det.lineTaxTotal,
          line_gross_total: det.lineGrossTotal,
        };
        // @ts-ignore
        await orderItemService.create(itemData, user);
      }

      // 3. Update order status to 'pending'
      const oldData = { ...savedOrder };
      savedOrder.status = "pending";
      savedOrder.updated_at = new Date();
      // @ts-ignore
      const updatedOrder = await updateDb(orderRepo, savedOrder);
      await auditLogger.logUpdate(
        "Order",
        // @ts-ignore
        savedOrder.id,
        oldData,
        updatedOrder,
        user,
      );

      console.log(`Order created: #${savedOrder.id} (initiated → pending)`);
      return updatedOrder;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to create order:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing order
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   */
  async update(id, data, user = "system") {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const { order: repo, customer: customerRepo } =
      await this.getRepositories();
    try {
      // @ts-ignore
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Order with ID ${id} not found`);
      const oldData = { ...existing };

      // order_number uniqueness if changed
      // @ts-ignore
      if (data.order_number && data.order_number !== existing.order_number) {
        // @ts-ignore
        const numExists = await repo.findOne({
          // @ts-ignore
          where: { order_number: data.order_number },
        });
        if (numExists)
          throw new Error(
            // @ts-ignore
            `Order with number "${data.order_number}" already exists`,
          );
      }

      // @ts-ignore
      if (data.customerId !== undefined) {
        // @ts-ignore
        if (data.customerId === null) {
          // @ts-ignore
          existing.customer = null;
        } else {
          // @ts-ignore
          const customer = await customerRepo.findOne({
            // @ts-ignore
            where: { id: data.customerId },
          });
          if (!customer)
            // @ts-ignore
            throw new Error(`Customer with ID ${data.customerId} not found`);
          // @ts-ignore
          existing.customer = customer;
        }
        // @ts-ignore
        delete data.customerId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      // @ts-ignore
      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Order", id, oldData, saved, user);
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to update order:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete an order (set is_deleted = true)
   * @param {number} id
   * @param {string} user
   */
  async delete(id, user = "system") {
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const { order: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const order = await repo.findOne({ where: { id } });
      if (!order) throw new Error(`Order with ID ${id} not found`);
      if (order.is_deleted) throw new Error(`Order #${id} is already deleted`);

      const oldData = { ...order };
      order.is_deleted = true;
      order.updated_at = new Date();

      // @ts-ignore
      const saved = await updateDb(repo, order);
      await auditLogger.logDelete("Order", id, oldData, user);
      return saved;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to delete order:", error.message);
      throw error;
    }
  }

  /**
   * Find order by ID with relations
   * @param {number} id
   */
  async findById(id) {
    const { order: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const order = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["customer", "items"],
      });
      if (!order) throw new Error(`Order with ID ${id} not found`);
      await auditLogger.logView("Order", id, "system");
      return order;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to find order:", error.message);
      throw error;
    }
  }

  /**
   * Find all orders with filters
   * @param {Object} options
   */
  async findAll(options = {}) {
    const { order: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const qb = repo
        .createQueryBuilder("order")
        .leftJoinAndSelect("order.customer", "customer")
        .where("order.is_deleted = :isDeleted", { isDeleted: false });

      // @ts-ignore
      if (options.status) {
        // @ts-ignore
        qb.andWhere("order.status = :status", { status: options.status });
      }
      // @ts-ignore
      if (options.customerId) {
        qb.andWhere("customer.id = :customerId", {
          // @ts-ignore
          customerId: options.customerId,
        });
      }
      // @ts-ignore
      if (options.startDate) {
        qb.andWhere("order.created_at >= :startDate", {
          // @ts-ignore
          startDate: options.startDate,
        });
      }
      // @ts-ignore
      if (options.endDate) {
        qb.andWhere("order.created_at <= :endDate", {
          // @ts-ignore
          endDate: options.endDate,
        });
      }

      // @ts-ignore
      const sortBy = options.sortBy || "created_at";
      // @ts-ignore
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`order.${sortBy}`, sortOrder);

      // @ts-ignore
      if (options.page && options.limit) {
        // @ts-ignore
        const skip = (options.page - 1) * options.limit;
        // @ts-ignore
        qb.skip(skip).take(options.limit);
      }

      const orders = await qb.getMany();
      // @ts-ignore
      await auditLogger.logView("Order", null, "system");
      return orders;
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      throw error;
    }
  }

  // @ts-ignore
  round2(value) {
    return Math.round(value * 100) / 100;
  }
}

const orderService = new OrderService();
module.exports = orderService;
