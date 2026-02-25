// services/CustomerService.js

const auditLogger = require("../utils/auditLogger");


class CustomerService {
  constructor() {
    this.repository = null;
    this.orderRepository = null;      // for sales relation
    this.loyaltyTransactionRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Customer = require("../entities/Customer");
    const Order = require("../entities/Order");
    const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(Customer);
    this.orderRepository = AppDataSource.getRepository(Order);
    this.loyaltyTransactionRepository = AppDataSource.getRepository(LoyaltyTransaction);
    console.log("CustomerService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      customer: this.repository,
      order: this.orderRepository,
      loyaltyTransaction: this.loyaltyTransactionRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { customer: repo } = await this.getRepositories();
    try {
      if (!data.name) throw new Error("Customer name is required");
      // Email uniqueness if provided
      if (data.email) {
        const existing = await repo.findOne({ where: { email: data.email } });
        if (existing) throw new Error(`Customer with email "${data.email}" already exists`);
      }
      const customer = repo.create(data);
      const saved = await saveDb(repo, customer);
      await auditLogger.logCreate("Customer", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create customer:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { customer: repo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Customer with ID ${id} not found`);
      const oldData = { ...existing };

      // Email uniqueness if changed
      if (data.email && data.email !== existing.email) {
        const emailExists = await repo.findOne({ where: { email: data.email } });
        if (emailExists) throw new Error(`Customer with email "${data.email}" already exists`);
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Customer", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update customer:", error.message);
      throw error;
    }
  }

  // Hard delete (no soft delete field)
  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { customer: repo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Customer with ID ${id} not found`);
      await removeDb(repo, id);
      await auditLogger.logDelete("Customer", id, existing, user);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete customer:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { customer: repo } = await this.getRepositories();
    try {
      const customer = await repo.findOne({
        where: { id },
        relations: ["sales", "loyaltyTransactions"], // sales = orders
      });
      if (!customer) throw new Error(`Customer with ID ${id} not found`);
      await auditLogger.logView("Customer", id, "system");
      return customer;
    } catch (error) {
      console.error("Failed to find customer:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { customer: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("customer");

      if (options.search) {
        qb.andWhere("customer.name LIKE :search OR customer.email LIKE :search OR customer.phone LIKE :search",
          { search: `%${options.search}%` });
      }
      if (options.status) {
        qb.andWhere("customer.status = :status", { status: options.status });
      }

      const sortBy = options.sortBy || "createdAt";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`customer.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const customers = await qb.getMany();
      await auditLogger.logView("Customer", null, "system");
      return customers;
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      throw error;
    }
  }
}

const customerService = new CustomerService();
module.exports = customerService;