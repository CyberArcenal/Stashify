// services/Tax.js
const Tax = require("../entities/Tax");
const auditLogger = require("../utils/auditLogger");

class TaxService {
  constructor() {
    this.repository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Tax = require("../entities/Tax");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(Tax);
    console.log("TaxService initialized");
  }

  async getRepository() {
    if (!this.repository) {
      await this.initialize();
    }
    return this.repository;
  }

  /**
   * Create a new tax
   * @param {Object} data
   * @param {string} user
   
   */
  async create(data, user = "system") {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();

    try {
      if (!data.name) throw new Error("Tax name is required");

      if (!data.code) throw new Error("Tax code is required");

      if (data.rate === undefined || data.rate === null)
        throw new Error("Tax rate is required");

      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing)
        throw new Error(`Tax with code "${data.code}" already exists`);

      const tax = repo.create(data);

      const saved = await saveDb(repo, tax);

      await auditLogger.logCreate("Tax", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create tax:", error.message);
      throw error;
    }
  }

  /**
   * Update a tax
   * @param {number} id
   * @param {Object} data
   * @param {string} user
   
   */
  async update(id, data, user = "system") {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Tax with ID ${id} not found`);
      const oldData = { ...existing };

      if (data.code && data.code !== existing.code) {
        const codeExists = await repo.findOne({ where: { code: data.code } });
        if (codeExists)
          throw new Error(`Tax with code "${data.code}" already exists`);
      }

      if (data.code && data.code !== existing.code) {
        const codeExists = await repo.findOne(Tax, {
          where: { code: data.code },
        });
        if (codeExists)
          throw new Error(`Tax with code "${data.code}" already exists`);
      }

      // If we are setting this tax as default, remove default from any other tax

      if (data.is_default === true && existing.is_default === false) {
        await repo
          .createQueryBuilder()
          .update(Tax)
          .set({ is_default: false })
          .where("is_default = :default", { default: true })
          .andWhere("is_deleted = :deleted", { deleted: false })
          .andWhere("id != :id", { id })
          .execute();
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Tax", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update tax:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a tax (set is_deleted = true)
   * @param {number} id
   * @param {string} user
   
   */
  async delete(id, user = "system") {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();

    try {
      const tax = await repo.findOne({ where: { id } });
      if (!tax) throw new Error(`Tax with ID ${id} not found`);
      if (tax.is_deleted) throw new Error(`Tax #${id} is already deleted`);

      const oldData = { ...tax };
      tax.is_deleted = true;
      tax.updated_at = new Date();

      const saved = await updateDb(repo, tax);
      await auditLogger.logDelete("Tax", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete tax:", error.message);
      throw error;
    }
  }

  /**
   * Find tax by ID
   * @param {number} id
   
   */
  async findById(id) {
    const repo = await this.getRepository();
    try {
      const tax = await repo.findOne({ where: { id, is_deleted: false } });
      if (!tax) throw new Error(`Tax with ID ${id} not found`);
      await auditLogger.logView("Tax", id, "system");
      return tax;
    } catch (error) {
      console.error("Failed to find tax:", error.message);
      throw error;
    }
  }

  /**
   * Find all taxes with optional filters
   * @param {Object} options
   
   */
  async findAll(options = {}) {
    const repo = await this.getRepository();
    try {
      const qb = repo
        .createQueryBuilder("tax")
        .where("tax.is_deleted = :isDeleted", { isDeleted: false });

      if (options.is_enabled !== undefined) {
        qb.andWhere("tax.is_enabled = :isEnabled", {
          isEnabled: options.is_enabled,
        });
      }

      if (options.type) {
        qb.andWhere("tax.type = :type", { type: options.type });
      }

      if (options.search) {
        qb.andWhere(
          "(tax.name LIKE :search OR tax.code LIKE :search OR tax.description LIKE :search)",

          { search: `%${options.search}%` },
        );
      }

      const sortBy = options.sortBy || "name";

      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`tax.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;

        qb.skip(skip).take(options.limit);
      }

      const taxes = await qb.getMany();

      await auditLogger.logView("Tax", null, "system");
      return taxes;
    } catch (error) {
      console.error("Failed to fetch taxes:", error);
      throw error;
    }
  }

  /**
   * Get default tax (is_default = true)
   */
  async getDefault() {
    const repo = await this.getRepository();
    try {
      return await repo.findOne({
        where: { is_default: true, is_deleted: false, is_enabled: true },
      });
    } catch (error) {
      console.error("Failed to get default tax:", error);
      throw error;
    }
  }
}

const taxService = new TaxService();
module.exports = taxService;
