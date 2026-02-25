// services/SupplierService.js

const auditLogger = require("../utils/auditLogger");


class SupplierService {
  constructor() {
    this.repository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Supplier = require("../entities/Supplier");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(Supplier);
    console.log("SupplierService initialized");
  }

  async getRepository() {
    if (!this.repository) {
      await this.initialize();
    }
    return this.repository;
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      if (!data.name) throw new Error("Supplier name is required");
      // Name uniqueness
      const existing = await repo.findOne({ where: { name: data.name } });
      if (existing) throw new Error(`Supplier with name "${data.name}" already exists`);

      const supplier = repo.create(data);
      const saved = await saveDb(repo, supplier);
      await auditLogger.logCreate("Supplier", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create supplier:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Supplier with ID ${id} not found`);
      const oldData = { ...existing };

      if (data.name && data.name !== existing.name) {
        const nameExists = await repo.findOne({ where: { name: data.name } });
        if (nameExists) throw new Error(`Supplier with name "${data.name}" already exists`);
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Supplier", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update supplier:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const supplier = await repo.findOne({ where: { id } });
      if (!supplier) throw new Error(`Supplier with ID ${id} not found`);
      if (supplier.is_deleted) throw new Error(`Supplier #${id} is already deleted`);

      const oldData = { ...supplier };
      supplier.is_deleted = true;
      supplier.updated_at = new Date();

      const saved = await updateDb(repo, supplier);
      await auditLogger.logDelete("Supplier", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete supplier:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const repo = await this.getRepository();
    try {
      const supplier = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["purchases"],
      });
      if (!supplier) throw new Error(`Supplier with ID ${id} not found`);
      await auditLogger.logView("Supplier", id, "system");
      return supplier;
    } catch (error) {
      console.error("Failed to find supplier:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const repo = await this.getRepository();
    try {
      const qb = repo.createQueryBuilder("supplier")
        .where("supplier.is_deleted = :isDeleted", { isDeleted: false });

      if (options.is_active !== undefined) {
        qb.andWhere("supplier.is_active = :isActive", { isActive: options.is_active });
      }
      if (options.status) {
        qb.andWhere("supplier.status = :status", { status: options.status });
      }
      if (options.search) {
        qb.andWhere("(supplier.name LIKE :search OR supplier.contact_person LIKE :search OR supplier.email LIKE :search)",
          { search: `%${options.search}%` });
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`supplier.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const suppliers = await qb.getMany();
      await auditLogger.logView("Supplier", null, "system");
      return suppliers;
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
      throw error;
    }
  }
}

const supplierService = new SupplierService();
module.exports = supplierService;