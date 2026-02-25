// services/StockMovementService.js

const auditLogger = require("../utils/auditLogger");


class StockMovementService {
  constructor() {
    this.repository = null;
    this.stockItemRepository = null;
    this.warehouseRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const StockMovement = require("../entities/StockMovement");
    const StockItem = require("../entities/StockItem");
    const Warehouse = require("../entities/Warehouse");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(StockMovement);
    this.stockItemRepository = AppDataSource.getRepository(StockItem);
    this.warehouseRepository = AppDataSource.getRepository(Warehouse);
    console.log("StockMovementService initialized");
  }

  async getRepositories() {
    if (!this.repository) {
      await this.initialize();
    }
    return {
      movement: this.repository,
      stockItem: this.stockItemRepository,
      warehouse: this.warehouseRepository,
    };
  }

  async create(data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { movement: repo, stockItem: stockRepo, warehouse: warehouseRepo } = await this.getRepositories();
    try {
      if (!data.stockItemId) throw new Error("stockItemId is required");
      if (data.change === undefined) throw new Error("change is required");
      if (!data.reference_code) throw new Error("reference_code is required");

      const stockItem = await stockRepo.findOne({ where: { id: data.stockItemId } });
      if (!stockItem) throw new Error(`StockItem with ID ${data.stockItemId} not found`);

      let warehouse = null;
      if (data.warehouseId) {
        warehouse = await warehouseRepo.findOne({ where: { id: data.warehouseId } });
        if (!warehouse) throw new Error(`Warehouse with ID ${data.warehouseId} not found`);
      }

      // Optionally update current_quantity based on stockItem's quantity
      const movementData = {
        ...data,
        stockItem,
        warehouse,
        current_quantity: stockItem.quantity, // or use data.current_quantity if provided
      };
      delete movementData.stockItemId;
      delete movementData.warehouseId;

      const movement = repo.create(movementData);
      const saved = await saveDb(repo, movement);
      await auditLogger.logCreate("StockMovement", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create stock movement:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { movement: repo, stockItem: stockRepo, warehouse: warehouseRepo } = await this.getRepositories();
    try {
      const existing = await repo.findOne({ where: { id }, relations: ["stockItem", "warehouse"] });
      if (!existing) throw new Error(`StockMovement with ID ${id} not found`);
      const oldData = { ...existing };

      if (data.stockItemId !== undefined) {
        const stockItem = await stockRepo.findOne({ where: { id: data.stockItemId } });
        if (!stockItem) throw new Error(`StockItem with ID ${data.stockItemId} not found`);
        existing.stockItem = stockItem;
        delete data.stockItemId;
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
      await auditLogger.logUpdate("StockMovement", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update stock movement:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const { movement: repo } = await this.getRepositories();
    try {
      const movement = await repo.findOne({ where: { id } });
      if (!movement) throw new Error(`StockMovement with ID ${id} not found`);
      if (movement.is_deleted) throw new Error(`StockMovement #${id} is already deleted`);

      const oldData = { ...movement };
      movement.is_deleted = true;
      movement.updated_at = new Date();

      const saved = await updateDb(repo, movement);
      await auditLogger.logDelete("StockMovement", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete stock movement:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const { movement: repo } = await this.getRepositories();
    try {
      const movement = await repo.findOne({
        where: { id, is_deleted: false },
        relations: ["stockItem", "warehouse"],
      });
      if (!movement) throw new Error(`StockMovement with ID ${id} not found`);
      await auditLogger.logView("StockMovement", id, "system");
      return movement;
    } catch (error) {
      console.error("Failed to find stock movement:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const { movement: repo } = await this.getRepositories();
    try {
      const qb = repo.createQueryBuilder("movement")
        .leftJoinAndSelect("movement.stockItem", "stockItem")
        .leftJoinAndSelect("movement.warehouse", "warehouse")
        .where("movement.is_deleted = :isDeleted", { isDeleted: false });

      if (options.stockItemId) {
        qb.andWhere("stockItem.id = :stockItemId", { stockItemId: options.stockItemId });
      }
      if (options.movement_type) {
        qb.andWhere("movement.movement_type = :movement_type", { movement_type: options.movement_type });
      }
      if (options.reference_code) {
        qb.andWhere("movement.reference_code LIKE :ref", { ref: `%${options.reference_code}%` });
      }
      if (options.startDate) {
        qb.andWhere("movement.created_at >= :startDate", { startDate: options.startDate });
      }
      if (options.endDate) {
        qb.andWhere("movement.created_at <= :endDate", { endDate: options.endDate });
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`movement.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const movements = await qb.getMany();
      await auditLogger.logView("StockMovement", null, "system");
      return movements;
    } catch (error) {
      console.error("Failed to fetch stock movements:", error);
      throw error;
    }
  }
}

const stockMovementService = new StockMovementService();
module.exports = stockMovementService;