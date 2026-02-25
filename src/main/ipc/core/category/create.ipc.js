// src/main/ipc/category/create.ipc.js


const categoryService = require("../../../../services/Category");

/**
 * Create a new category
 * @param {Object} params - Request parameters
 * @param {string} params.name - Category name (required)
 * @param {string} [params.slug] - URL slug (auto-generated if not provided)
 * @param {string} [params.description] - Category description
 * @param {string} [params.image_path] - Image path
 * @param {string} [params.color] - Color code
 * @param {number} [params.parentId] - ID of parent category
 * @param {boolean} [params.is_active=true] - Active status
 * @param {Object} queryRunner - TypeORM query runner for transaction
 * @param {string} [user="system"] - User performing the action
 * @returns {Promise<{status: boolean, message: string, data: any}>}
 */
module.exports = async (params, queryRunner, user = "system") => {
  try {
    // Validate required fields
    if (!params.name || typeof params.name !== "string" || params.name.trim() === "") {
      return {
        status: false,
        message: "Category name is required and must be a non-empty string.",
        data: null,
      };
    }

    // Validate parentId if provided
    if (params.parentId !== undefined && params.parentId !== null) {
      const parentId = Number(params.parentId);
      if (!Number.isInteger(parentId) || parentId <= 0) {
        return {
          status: false,
          message: "Invalid parentId. Must be a positive integer.",
          data: null,
        };
      }
      params.parentId = parentId;
    }

    // Prepare data for creation
    const categoryData = {
      name: params.name.trim(),
      slug: params.slug?.trim(),
      description: params.description?.trim(),
      image_path: params.image_path,
      color: params.color,
      parentId: params.parentId,
      is_active: params.is_active !== undefined ? params.is_active : true,
    };

    // Remove undefined values
    Object.keys(categoryData).forEach(key => categoryData[key] === undefined && delete categoryData[key]);

    // Create category using service (pass queryRunner if needed, but service currently doesn't accept it)
    // Note: categoryService.create does not yet support queryRunner; if needed, modify service.
    // For now, we rely on the transaction in the handler to rollback if this fails.
    const newCategory = await categoryService.create(categoryData, user);

    return {
      status: true,
      message: "Category created successfully",
      data: newCategory,
    };
  } catch (error) {
    console.error("Error in createCategory:", error);
    return {
      status: false,
      message: error.message || "Failed to create category",
      data: null,
    };
  }
};