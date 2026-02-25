// services/AuditLogService.js
const auditLogger = require("../utils/auditLogger");


class AuditLogService {
  constructor() {
    this.repository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const { AuditLog } = require("../entities/AuditLog");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(AuditLog);
    console.log("AuditLogService initialized");
  }

  async getRepository() {
    if (!this.repository) {
      await this.initialize();
    }
    return this.repository;
  }

  async findById(id) {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const log = await repo.findOne({ where: { id } });
      if (!log) throw new Error(`AuditLog with ID ${id} not found`);
      await auditLogger.logView("AuditLog", id, "system");
      return log;
    } catch (error) {
      console.error("Failed to find audit log:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const repo = await this.getRepository();
    try {
      const qb = repo.createQueryBuilder("log");
      // Apply filters
      if (options.entity)
        qb.andWhere("log.entity = :entity", { entity: options.entity });
      if (options.action)
        qb.andWhere("log.action = :action", { action: options.action });
      if (options.actor)
        qb.andWhere("log.user = :actor", { actor: options.actor });
      if (options.startDate)
        qb.andWhere("log.timestamp >= :startDate", {
          startDate: options.startDate,
        });
      if (options.endDate)
        qb.andWhere("log.timestamp <= :endDate", { endDate: options.endDate });

      const sortBy = options.sortBy || "timestamp";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`log.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const logs = await qb.getMany();
      await auditLogger.logView("AuditLog", null, "system");
      return logs;
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      throw error;
    }
  }

  // Convenience method using auditLogger's getLogs
  async getLogs(params) {
    return await auditLogger.getLogs(params);
  }

  async clearOldLogs(daysToKeep = 365) {
    return await auditLogger.clearOldLogs(daysToKeep);
  }
}

const auditLogService = new AuditLogService();
module.exports = auditLogService;
