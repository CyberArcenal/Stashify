// services/OrderService.js
//@ts-check

const auditLogger = require("../utils/auditLogger");
const UPDATABLE_STATUSES = ["initiated", "pending"];
const DELETABLE_STATUSES = ["initiated", "pending"];
const { validateOrderData } = require("../utils/order");
// 🔧 SETTINGS INTEGRATION
const {
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  taxRate,
  discountEnabled,
  maxDiscountPercent,

  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  // @ts-ignore
  allowNegativeStock,
  loyaltyPointsEnabled,
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

    const Customer = require("../entities/Customer");
    const Product = require("../entities/Product");
    const OrderItemService = require("./OrderItem");
    const Variant = require("../entities/ProductVariant");
    const Order = require("../entities/Order");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.orderRepository = AppDataSource.getRepository(Order);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.productRepository = AppDataSource.getRepository(Product);
    this.variantRepository = AppDataSource.getRepository(Variant);
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
      variant: this.variantRepository,
      orderItemService: this.orderItemService,
    };
  }

  /**
   * Create a new order (initiated → pending)
   * @param {Object} orderData
   * @param {string} user
   */

  async create(orderData, user = "system") {
    const {
      order: orderRepo,
      customer: customerRepo,
      product: productRepo,
      variant: variantRepo,
      orderItemService: orderItemService,
    } = await this.getRepositories();

    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");

    try {
      // Validate order data
      const validation = validateOrderData(orderData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      const {
        // @ts-ignore
        items,

        // @ts-ignore
        customerId,

        // @ts-ignore
        notes = null,

        // @ts-ignore
        usedLoyalty = false,

        // @ts-ignore
        loyaltyRedeemed = 0,

        // @ts-ignore
        usedDiscount = false,

        // @ts-ignore
        totalDiscount = 0,

        // @ts-ignore
        usedVoucher = false,

        // @ts-ignore
        voucherCode = null,
      } = orderData;

      // Settings checks
      const isDiscountEnabled = await discountEnabled();

      // @ts-ignore
      const hasDiscount = items.some((i) => (i.discount || 0) > 0);
      if (hasDiscount && !isDiscountEnabled) {
        throw new Error("Discounts are disabled in system settings.");
      }

      const maxDiscount = await maxDiscountPercent();

      // Loyalty validation
      if (loyaltyRedeemed > 0) {
        if (!usedLoyalty)
          throw new Error("usedLoyalty must be true when loyaltyRedeemed > 0");
        const isLoyaltyEnabled = await loyaltyPointsEnabled();
        if (!isLoyaltyEnabled)
          throw new Error("Loyalty points are disabled in system settings.");
      }

      // Customer handling
      let customer = null;
      if (customerId) {
        // @ts-ignore
        customer = await customerRepo.findOne({ where: { id: customerId } });
        if (!customer)
          throw new Error(`Customer with ID ${customerId} not found`);

        // Validate points balance if redeeming
        if (
          loyaltyRedeemed > 0 &&
          // @ts-ignore
          customer.loyaltyPointsBalance < loyaltyRedeemed
        ) {
          throw new Error(
            `Customer only has ${customer.loyaltyPointsBalance} points, cannot redeem ${loyaltyRedeemed}`,
          );
        }
      }

      // Process items
      const itemDetails = [];
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscountFromItems = 0;

      for (const item of items) {
        let product, variant;
        if (item.variantId) {
          // @ts-ignore
          variant = await variantRepo.findOne({
            where: { id: item.variantId, is_deleted: false },
            relations: ["taxes", "product"],
          });
          if (!variant)
            throw new Error(
              `Variant ID ${item.variantId} not found or deleted`,
            );

          // @ts-ignore
          product = variant.product;
        } else {
          // @ts-ignore
          product = await productRepo.findOne({
            where: { id: item.productId, is_deleted: false },
            relations: ["taxes"],
          });
          if (!product)
            throw new Error(
              `Product ID ${item.productId} not found or deleted`,
            );
        }

        const unitPrice =
          item.unitPrice !== undefined ? item.unitPrice : product.net_price;
        if (unitPrice === undefined || unitPrice === null) {
          throw new Error(
            `Unit price not specified and product ${product.id} has no net_price`,
          );
        }

        const quantity = item.quantity;
        const discount = item.discount || 0;
        const lineSubtotal = unitPrice * quantity;
        const lineNetTotal = lineSubtotal - discount;

        // Validate discount percentage
        const discountPercent = (discount / lineSubtotal) * 100;
        if (discount > 0 && discountPercent > maxDiscount) {
          throw new Error(
            `Discount exceeds maximum allowed (${maxDiscount}%) for product ID ${product.id}`,
          );
        }

        // Determine which taxes to use
        const sourceForTaxes = variant || product;
        const taxes =
          // @ts-ignore
          sourceForTaxes.taxes?.filter((t) => t.is_enabled && !t.is_deleted) ||
          [];

        // Compute applied taxes
        const appliedTaxes = [];
        let lineTaxTotal = 0;
        for (const tax of taxes) {
          let taxAmount;
          if (tax.type === "percentage") {
            taxAmount = lineNetTotal * (tax.rate / 100);
          } else {
            taxAmount = tax.rate * quantity; // fixed per item
          }
          taxAmount = Math.round(taxAmount * 100) / 100;
          appliedTaxes.push({
            taxId: tax.id,
            name: tax.name,
            rate: tax.rate,
            type: tax.type,
            amount: taxAmount,
          });
          lineTaxTotal += taxAmount;
        }
        lineTaxTotal = Math.round(lineTaxTotal * 100) / 100;
        const lineGrossTotal = lineNetTotal + lineTaxTotal;

        itemDetails.push({
          product,
          variant,
          quantity,
          unitPrice,
          discount,
          appliedTaxes,
          lineNetTotal,
          lineTaxTotal,
          lineGrossTotal,
          warehouseId: item.warehouseId || null,
        });

        subtotal += lineSubtotal;
        totalTax += lineTaxTotal;
        totalDiscountFromItems += discount;
      }

      const finalTotalDiscount = usedDiscount
        ? totalDiscount
        : totalDiscountFromItems;

      // ✅ Include points redemption in total
      const totalBeforePoints = subtotal - finalTotalDiscount + totalTax;
      const total = Math.max(0, totalBeforePoints - (loyaltyRedeemed || 0));
      // Create order

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
        tax_breakdown: null,
        usedLoyalty,
        loyaltyRedeemed,
        usedDiscount,
        totalDiscount: this.round2(finalTotalDiscount),
        usedVoucher,
        voucherCode,
        pointsEarn: 0, // will be updated by transition service later
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
      });

      // @ts-ignore
      const savedOrder = await saveDb(orderRepo, order);

      // @ts-ignore
      await auditLogger.logCreate("Order", savedOrder.id, savedOrder, user);

      // Create order items (Note: orderItemService.create should also use transaction; for now, it's outside)
      for (const det of itemDetails) {
        const itemData = {
          orderId: savedOrder.id,
          productId: det.product.id,
          variantId: det.variant?.id || null,
          warehouseId: det.warehouseId,
          quantity: det.quantity,
          unit_price: det.unitPrice,
          discount_amount: det.discount,
          applied_taxes: det.appliedTaxes,
          line_net_total: det.lineNetTotal,
          line_tax_total: det.lineTaxTotal,
          line_gross_total: det.lineGrossTotal,
        };

        // @ts-ignore
        await orderItemService.create(itemData, user);
      }

      // Update order status to pending
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

  /**
   * Update an existing order – only notes and items can be changed.
   * Loyalty, discount, and voucher data remain as originally set.
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   */
  async update(id, data, user = "system") {
    const {
      // @ts-ignore
      saveDb,
      updateDb,
      removeDb,
    } = require("../utils/dbUtils/dbActions");
    const {
      order: orderRepo,
      product: productRepo,
      variant: variantRepo,
      orderItemService,
    } = await this.getRepositories();

    console.log("Update data", data);

    try {
      // 1. Fetch existing order with items
      // @ts-ignore
      const existing = await orderRepo.findOne({
        where: { id, is_deleted: false },
        relations: ["items"],
      });
      if (!existing) throw new Error(`Order with ID ${id} not found`);

      // @ts-ignore
      if (!UPDATABLE_STATUSES.includes(existing.status)) {
        throw new Error(
          `Order cannot be updated because its status is "${existing.status}"`,
        );
      }

      const oldData = { ...existing };

      // 2. Update notes if provided
      // @ts-ignore
      if (data.notes !== undefined) existing.notes = data.notes;

      // 3. Handle items – full replacement
      // @ts-ignore
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Items array is required when updating an order");
      }

      // a) Delete all existing items (hard delete)
      // @ts-ignore
      for (const item of existing.items) {
        // @ts-ignore
        await removeDb(orderItemService.repository, item);
      }

      // b) Process new items – calculate fresh totals
      const itemDetails = [];
      let subtotal = 0;
      let totalTax = 0;
      let totalDiscountFromItems = 0;

      const isDiscountEnabled = await discountEnabled();
      const maxDiscount = await maxDiscountPercent();

      // @ts-ignore
      for (const item of data.items) {
        let product, variant;
        if (item.variantId) {
          // @ts-ignore
          variant = await variantRepo.findOne({
            where: { id: item.variantId, is_deleted: false },
            relations: ["taxes", "product"],
          });
          if (!variant)
            throw new Error(`Variant ID ${item.variantId} not found`);
          // @ts-ignore
          product = variant.product;
        } else {
          // @ts-ignore
          product = await productRepo.findOne({
            where: { id: item.productId, is_deleted: false },
            relations: ["taxes"],
          });
          if (!product)
            throw new Error(`Product ID ${item.productId} not found`);
        }

        const unitPrice =
          item.unitPrice !== undefined ? item.unitPrice : product.net_price;
        if (unitPrice === undefined || unitPrice === null) {
          throw new Error(
            `Unit price not specified and product ${product.id} has no net_price`,
          );
        }

        const quantity = item.quantity;
        const discount = item.discount || 0;
        const lineSubtotal = unitPrice * quantity;
        const lineNetTotal = lineSubtotal - discount;

        if (discount > 0 && !isDiscountEnabled) {
          throw new Error("Discounts are disabled in system settings.");
        }
        const discountPercent = (discount / lineSubtotal) * 100;
        if (discount > 0 && discountPercent > maxDiscount) {
          throw new Error(
            `Discount exceeds maximum allowed (${maxDiscount}%) for product ID ${product.id}`,
          );
        }

        const sourceForTaxes = variant || product;
        const taxes =
          // @ts-ignore
          sourceForTaxes.taxes?.filter((t) => t.is_enabled && !t.is_deleted) ||
          [];

        const appliedTaxes = [];
        let lineTaxTotal = 0;
        for (const tax of taxes) {
          let taxAmount;
          if (tax.type === "percentage") {
            taxAmount = lineNetTotal * (tax.rate / 100);
          } else {
            taxAmount = tax.rate * quantity;
          }
          taxAmount = Math.round(taxAmount * 100) / 100;
          appliedTaxes.push({
            taxId: tax.id,
            name: tax.name,
            rate: tax.rate,
            type: tax.type,
            amount: taxAmount,
          });
          lineTaxTotal += taxAmount;
        }
        lineTaxTotal = Math.round(lineTaxTotal * 100) / 100;
        const lineGrossTotal = lineNetTotal + lineTaxTotal;

        itemDetails.push({
          product,
          variant,
          quantity,
          unitPrice,
          discount,
          appliedTaxes,
          lineNetTotal,
          lineTaxTotal,
          lineGrossTotal,
          warehouseId: item.warehouseId || null,
        });

        subtotal += lineSubtotal;
        totalTax += lineTaxTotal;
        totalDiscountFromItems += discount;
      }

      // Use existing discount/loyalty values
      const finalTotalDiscount = existing.usedDiscount
        ? existing.totalDiscount
        : totalDiscountFromItems;
      // @ts-ignore
      const totalBeforePoints = subtotal - finalTotalDiscount + totalTax;
      const total = Math.max(
        0,
        // @ts-ignore
        totalBeforePoints - (existing.loyaltyRedeemed || 0),
      );

      // Update order totals
      existing.subtotal = this.round2(subtotal);
      existing.tax_amount = this.round2(totalTax);
      existing.total = this.round2(total);
      existing.totalDiscount = this.round2(finalTotalDiscount);
      existing.updated_at = new Date();

      // 4. Save the updated order (without items)
      // @ts-ignore
      const saved = await updateDb(orderRepo, existing);
      await auditLogger.logUpdate("Order", id, oldData, saved, user);

      // 5. Create new items (now linked to the saved order)
      for (const det of itemDetails) {
        const itemData = {
          orderId: existing.id,
          productId: det.product.id,
          variantId: det.variant?.id || null,
          warehouseId: det.warehouseId,
          quantity: det.quantity,
          unit_price: det.unitPrice,
          discount_amount: det.discount,
          applied_taxes: det.appliedTaxes,
          line_net_total: det.lineNetTotal,
          line_tax_total: det.lineTaxTotal,
          line_gross_total: det.lineGrossTotal,
        };
        // @ts-ignore
        await orderItemService.create(itemData, user);
      }

      // 6. Reload the order with all relations using a fresh query builder
      // @ts-ignore
      const updatedOrder = await orderRepo
        .createQueryBuilder("order")
        .leftJoinAndSelect("order.customer", "customer")
        .leftJoinAndSelect("order.items", "items")
        .leftJoinAndSelect("items.product", "product")
        .leftJoinAndSelect("items.warehouse", "warehouse")
        .leftJoinAndSelect("items.variant", "variant")
        .where("order.id = :id", { id: existing.id })
        .getOne();

      if (!updatedOrder) throw new Error("Failed to reload updated order");

      return updatedOrder;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to update order:", error.message);
      throw error;
    }
  }
  /**
   * Update order status
   * @param {number} id
   * @param {string} status - New status
   * @param {string} user
   */
  async updateStatus(id, status, user = "system") {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const { order: repo } = await this.getRepositories();

    try {
      // @ts-ignore
      const order = await repo.findOne({ where: { id, is_deleted: false } });
      if (!order) throw new Error(`Order with ID ${id} not found`);

      const oldStatus = order.status;
      if (oldStatus === status) {
        return order; // no change
      }

      // Allowed status transitions
      const allowedTransitions = {
        initiated: ["pending", "cancelled"],
        pending: ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled"],
        completed: ["refunded"],
        cancelled: [], // cannot transition out of cancelled
        refunded: [], // cannot transition out of refunded
      };

      // @ts-ignore
      const allowed = allowedTransitions[oldStatus];
      if (!allowed || !allowed.includes(status)) {
        throw new Error(
          `Invalid status transition from ${oldStatus} to ${status}`,
        );
      }

      order.status = status;
      order.updated_at = new Date();

      // @ts-ignore
      const updated = await updateDb(repo, order);
      await auditLogger.logUpdate(
        "Order",
        id,
        { status: oldStatus },
        { status },
        user,
      );
      return updated;
    } catch (error) {
      // @ts-ignore
      console.error("Failed to update order status:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete an order (set is_deleted = true)
   * @param {number} id
   * @param {string} user
   */
  async delete(id, user = "system") {
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    const { saveDb, updateDb } = require("../utils/dbUtils/dbActions");
    const { order: repo } = await this.getRepositories();
    try {
      // @ts-ignore
      const order = await repo.findOne({ where: { id } });
      if (!order) throw new Error(`Order with ID ${id} not found`);
      // @ts-ignore
      if (!DELETABLE_STATUSES.includes(order.status)) {
        throw new Error(
          `Purchase cannot be deleted because its status is "${order.status}"`,
        );
      }

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
        relations: [
          "customer",
          "items",
          "items.product",
          "items.warehouse",
          "items.variant",
        ],
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
        .leftJoinAndSelect("order.items", "items")
        .leftJoinAndSelect("items.product", "product")
        .leftJoinAndSelect("items.warehouse", "warehouse")
        .leftJoinAndSelect("items.variant", "variant")
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
