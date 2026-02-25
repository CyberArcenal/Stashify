// services/WarehouseService.js

const auditLogger = require("../utils/auditLogger");


class WarehouseService {
  constructor() {
    this.repository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Warehouse = require("../entities/Warehouse");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(Warehouse);
    console.log("WarehouseService initialized");
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
      if (!data.name) throw new Error("Warehouse name is required");
      if (!data.location) data.location = ""; // to satisfy unique constraint
      // Check uniqueness of (name, location)
      const existing = await repo.findOne({
        where: { name: data.name, location: data.location },
      });
      if (existing)
        throw new Error(
          `Warehouse with name "${data.name}" and location "${data.location}" already exists`,
        );

      const warehouse = repo.create(data);
      const saved = await saveDb(repo, warehouse);
      await auditLogger.logCreate("Warehouse", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create warehouse:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Warehouse with ID ${id} not found`);
      const oldData = { ...existing };

      // If name or location changes, check uniqueness
      if (
        (data.name && data.name !== existing.name) ||
        (data.location !== undefined && data.location !== existing.location)
      ) {
        const newName = data.name || existing.name;
        const newLocation =
          data.location !== undefined ? data.location : existing.location;
        const duplicate = await repo.findOne({
          where: { name: newName, location: newLocation },
        });
        if (duplicate && duplicate.id !== id) {
          throw new Error(
            `Warehouse with name "${newName}" and location "${newLocation}" already exists`,
          );
        }
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Warehouse", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update warehouse:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const warehouse = await repo.findOne({ where: { id } });
      if (!warehouse) throw new Error(`Warehouse with ID ${id} not found`);
      if (warehouse.is_deleted)
        throw new Error(`Warehouse #${id} is already deleted`);

      const oldData = { ...warehouse };
      warehouse.is_deleted = true;
      warehouse.updated_at = new Date();

      const saved = await updateDb(repo, warehouse);
      await auditLogger.logDelete("Warehouse", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete warehouse:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const repo = await this.getRepository();
    try {
      const warehouse = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["stockItems", "stockMovements", "purchases", "orderItems"],
      });
      if (!warehouse) throw new Error(`Warehouse with ID ${id} not found`);
      await auditLogger.logView("Warehouse", id, "system");
      return warehouse;
    } catch (error) {
      console.error("Failed to find warehouse:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const repo = await this.getRepository();
    try {
      const qb = repo
        .createQueryBuilder("warehouse")
        .where("warehouse.is_deleted = :isDeleted", { isDeleted: false });

      if (options.type) {
        qb.andWhere("warehouse.type = :type", { type: options.type });
      }
      if (options.is_active !== undefined) {
        qb.andWhere("warehouse.is_active = :isActive", {
          isActive: options.is_active,
        });
      }
      if (options.search) {
        qb.andWhere(
          "(warehouse.name LIKE :search OR warehouse.location LIKE :search)",
          { search: `%${options.search}%` },
        );
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`warehouse.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const warehouses = await qb.getMany();
      await auditLogger.logView("Warehouse", null, "system");
      return warehouses;
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
      throw error;
    }
  }
}

const warehouseService = new WarehouseService();
module.exports = warehouseService;
