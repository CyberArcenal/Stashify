// services/LoyaltyTransactionService.js

const auditLogger = require("../utils/auditLogger");


class LoyaltyTransactionService {
  constructor() {
    this.repository = null;
    this.customerRepository = null;
    this.orderRepository = null;      // replaces saleRepository
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
    const Customer = require("../entities/Customer");
    const Order = require("../entities/Order");   // use Order instead of Sale

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(LoyaltyTransaction);
    this.customerRepository = AppDataSource.getRepository(Customer);
    this.orderRepository = AppDataSource.getRepository(Order);
    console.log("LoyaltyTransactionService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      transaction: this.repository,
      customer: this.customerRepository,
      order: this.orderRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { transaction: repo, customer: customerRepo, order: orderRepo } = await this.getRepositories();
    try {
      if (!data.customerId) throw new Error("customerId is required");
      if (data.pointsChange === undefined) throw new Error("pointsChange is required");

      const customer = await customerRepo.findOne({ where: { id: data.customerId } });
      if (!customer) throw new Error(`Customer with ID ${data.customerId} not found`);

      let order = null;
      if (data.orderId) {   // was saleId
        order = await orderRepo.findOne({ where: { id: data.orderId } });
        if (!order) throw new Error(`Order with ID ${data.orderId} not found`);
      }

      const transactionData = {
        ...data,
        customer,
        sale: order,        // entity relation is named "sale" but we assign Order
        timestamp: new Date(),
      };
      delete transactionData.customerId;
      delete transactionData.orderId;

      const transaction = repo.create(transactionData);
      const saved = await saveDb(repo, transaction);

      // Update customer points balance
      if (transaction.transactionType === 'earn') {
        customer.lifetimePointsEarned += transaction.pointsChange;
        customer.loyaltyPointsBalance += transaction.pointsChange;
      } else if (transaction.transactionType === 'redeem') {
        customer.loyaltyPointsBalance -= transaction.pointsChange;
      } else if (transaction.transactionType === 'refund') {
        // reverse effect (adjust accordingly)
        customer.loyaltyPointsBalance += transaction.pointsChange;
        // lifetime points might not be adjusted
      }
      customer.updatedAt = new Date();
      await updateDb(customerRepo, customer);

      await auditLogger.logCreate("LoyaltyTransaction", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create loyalty transaction:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { transaction: repo, customer: customerRepo, order: orderRepo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id }, relations: ["customer", "sale"] });
      if (!existing) throw new Error(`LoyaltyTransaction with ID ${id} not found`);
      const oldData = { ...existing };

      // If pointsChange or transactionType changes, we need to adjust customer balance
      // This is complex; for simplicity, we disallow updates that affect points
      if ((data.pointsChange !== undefined && data.pointsChange !== existing.pointsChange) ||
          (data.transactionType !== undefined && data.transactionType !== existing.transactionType)) {
        throw new Error("Cannot update pointsChange or transactionType; create a reversal transaction instead.");
      }

      // Handle relations
      if (data.customerId !== undefined) {
        const customer = await customerRepo.findOne({ where: { id: data.customerId } });
        if (!customer) throw new Error(`Customer with ID ${data.customerId} not found`);
        existing.customer = customer;
        delete data.customerId;
      }
      if (data.orderId !== undefined) {   // was saleId
        if (data.orderId === null) {
          existing.sale = null;
        } else {
          const order = await orderRepo.findOne({ where: { id: data.orderId } });
          if (!order) throw new Error(`Order with ID ${data.orderId} not found`);
          existing.sale = order;
        }
        delete data.orderId;
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("LoyaltyTransaction", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update loyalty transaction:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { transaction: repo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`LoyaltyTransaction with ID ${id} not found`);
      await removeDb(repo, id);
      await auditLogger.logDelete("LoyaltyTransaction", id, existing, user);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete loyalty transaction:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { transaction: repo } = await this.getRepositories();
    try {
      const transaction = await repo.findOne({
        where: { id },
        relations: ["customer", "sale"], // sale is actually Order
      });
      if (!transaction) throw new Error(`LoyaltyTransaction with ID ${id} not found`);
      await auditLogger.logView("LoyaltyTransaction", id, "system");
      return transaction;
    } catch (error) {
      console.error("Failed to find loyalty transaction:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { transaction: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("lt")
        .leftJoinAndSelect("lt.customer", "customer")
        .leftJoinAndSelect("lt.sale", "sale"); // sale is Order

      if (options.customerId) {
        qb.andWhere("customer.id = :customerId", { customerId: options.customerId });
      }
      if (options.transactionType) {
        qb.andWhere("lt.transactionType = :transactionType", { transactionType: options.transactionType });
      }
      if (options.startDate) {
        qb.andWhere("lt.timestamp >= :startDate", { startDate: options.startDate });
      }
      if (options.endDate) {
        qb.andWhere("lt.timestamp <= :endDate", { endDate: options.endDate });
      }

      const sortBy = options.sortBy || "timestamp";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`lt.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const transactions = await qb.getMany();
      await auditLogger.logView("LoyaltyTransaction", null, "system");
      return transactions;
    } catch (error) {
      console.error("Failed to fetch loyalty transactions:", error);
      throw error;
    }
  }
}

const loyaltyTransactionService = new LoyaltyTransactionService();
module.exports = loyaltyTransactionService;