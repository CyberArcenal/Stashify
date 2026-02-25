// services/SystemSettingService.js

const auditLogger = require("../utils/auditLogger");


class SystemSettingService {
  constructor() {
    this.repository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const { SystemSetting } = require("../entities/systemSettings");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(SystemSetting);
    console.log("SystemSettingService initialized");
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
      if (!data.key) throw new Error("key is required");
      if (!data.setting_type) throw new Error("setting_type is required");
      if (data.value === undefined) throw new Error("value is required");

      // Check uniqueness of (setting_type, key)
      const existing = await repo.findOne({
        where: { setting_type: data.setting_type, key: data.key },
      });
      if (existing) throw new Error(`Setting with type "${data.setting_type}" and key "${data.key}" already exists`);

      const setting = repo.create(data);
      const saved = await saveDb(repo, setting);
      await auditLogger.logCreate("SystemSetting", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create system setting:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`SystemSetting with ID ${id} not found`);
      const oldData = { ...existing };

      // If changing type or key, check uniqueness
      if ((data.setting_type && data.setting_type !== existing.setting_type) ||
          (data.key && data.key !== existing.key)) {
        const newType = data.setting_type || existing.setting_type;
        const newKey = data.key || existing.key;
        const duplicate = await repo.findOne({
          where: { setting_type: newType, key: newKey },
        });
        if (duplicate && duplicate.id !== id) {
          throw new Error(`Setting with type "${newType}" and key "${newKey}" already exists`);
        }
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("SystemSetting", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update system setting:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const setting = await repo.findOne({ where: { id } });
      if (!setting) throw new Error(`SystemSetting with ID ${id} not found`);
      if (setting.is_deleted) throw new Error(`SystemSetting #${id} is already deleted`);

      const oldData = { ...setting };
      setting.is_deleted = true;
      setting.updated_at = new Date();

      const saved = await updateDb(repo, setting);
      await auditLogger.logDelete("SystemSetting", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete system setting:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const repo = await this.getRepository();
    try {
      const setting = await repo.findOne({ where: { id, is_deleted: false } });
      if (!setting) throw new Error(`SystemSetting with ID ${id} not found`);
      await auditLogger.logView("SystemSetting", id, "system");
      return setting;
    } catch (error) {
      console.error("Failed to find system setting:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const repo = await this.getRepository();
    try {
      const qb = repo.createQueryBuilder("setting")
        .where("setting.is_deleted = :isDeleted", { isDeleted: false });

      if (options.setting_type) {
        qb.andWhere("setting.setting_type = :setting_type", { setting_type: options.setting_type });
      }
      if (options.is_public !== undefined) {
        qb.andWhere("setting.is_public = :is_public", { is_public: options.is_public });
      }
      if (options.search) {
        qb.andWhere("(setting.key LIKE :search OR setting.description LIKE :search)",
          { search: `%${options.search}%` });
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`setting.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const settings = await qb.getMany();
      await auditLogger.logView("SystemSetting", null, "system");
      return settings;
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
      throw error;
    }
  }

  // Convenience method to get a setting by type and key
  async getByTypeAndKey(setting_type, key) {
    const repo = await this.getRepository();
    return await repo.findOne({
      where: { setting_type, key, is_deleted: false },
    });
  }
}

const systemSettingService = new SystemSettingService();
module.exports = systemSettingService;