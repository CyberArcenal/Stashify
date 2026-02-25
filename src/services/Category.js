// services/CategoryService.js

const auditLogger = require("../utils/auditLogger");


class CategoryService {
  constructor() {
    this.repository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/datasource");
    const Category = require("../entities/Category");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.repository = AppDataSource.getRepository(Category);
    console.log("CategoryService initialized");
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
      if (!data.name) throw new Error("Category name is required");
      // Generate slug if not provided
      if (!data.slug) {
        data.slug = data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      // Check slug uniqueness
      const existing = await repo.findOne({ where: { slug: data.slug } });
      if (existing)
        throw new Error(`Category with slug "${data.slug}" already exists`);

      // Handle parent relation
      if (data.parentId) {
        const parent = await repo.findOne({ where: { id: data.parentId } });
        if (!parent)
          throw new Error(`Parent category with ID ${data.parentId} not found`);
        data.parent = parent;
        delete data.parentId;
      }

      const category = repo.create(data);
      const saved = await saveDb(repo, category);
      await auditLogger.logCreate("Category", saved.id, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to create category:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) throw new Error(`Category with ID ${id} not found`);
      const oldData = { ...existing };

      // Slug uniqueness if changed
      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await repo.findOne({ where: { slug: data.slug } });
        if (slugExists)
          throw new Error(`Category with slug "${data.slug}" already exists`);
      }

      // Handle parent update
      if (data.parentId !== undefined) {
        if (data.parentId === null) {
          existing.parent = null;
        } else {
          const parent = await repo.findOne({ where: { id: data.parentId } });
          if (!parent)
            throw new Error(
              `Parent category with ID ${data.parentId} not found`,
            );
          existing.parent = parent;
        }
        delete data.parentId;
      }

      Object.assign(existing, data);
      existing.updated_at = new Date();

      const saved = await updateDb(repo, existing);
      await auditLogger.logUpdate("Category", id, oldData, saved, user);
      return saved;
    } catch (error) {
      console.error("Failed to update category:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system") {
    const { saveDb, updateDb, removeDb } = require("../utils/dbUtils/dbActions");
    const repo = await this.getRepository();
    try {
      const category = await repo.findOne({ where: { id } });
      if (!category) throw new Error(`Category with ID ${id} not found`);
      if (!category.is_active)
        throw new Error(`Category #${id} is already inactive`);

      const oldData = { ...category };
      category.is_active = false;
      category.updated_at = new Date();

      const saved = await updateDb(repo, category);
      await auditLogger.logDelete("Category", id, oldData, user);
      return saved;
    } catch (error) {
      console.error("Failed to delete category:", error.message);
      throw error;
    }
  }

  async findById(id) {
    const repo = await this.getRepository();
    try {
      const category = await repo.findOne({
        where: { id, is_active: true },
        relations: ["parent", "children"],
      });
      if (!category) throw new Error(`Category with ID ${id} not found`);
      await auditLogger.logView("Category", id, "system");
      return category;
    } catch (error) {
      console.error("Failed to find category:", error.message);
      throw error;
    }
  }

  async findAll(options = {}) {
    const repo = await this.getRepository();
    try {
      const qb = repo
        .createQueryBuilder("category")
        .leftJoinAndSelect("category.parent", "parent")
        // .leftJoinAndSelect("category.children", "children");

      if (options.is_active !== undefined) {
        qb.andWhere("category.is_active = :isActive", {
          isActive: options.is_active,
        });
      }
      if (options.search) {
        qb.andWhere(
          "category.name LIKE :search OR category.description LIKE :search",
          { search: `%${options.search}%` },
        );
      }

      const sortBy = options.sortBy || "created_at";
      const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
      qb.orderBy(`category.${sortBy}`, sortOrder);

      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        qb.skip(skip).take(options.limit);
      }

      const categories = await qb.getMany();
      await auditLogger.logView("Category", null, "system");
      return categories;
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      throw error;
    }
  }
}

const categoryService = new CategoryService();
module.exports = categoryService;
